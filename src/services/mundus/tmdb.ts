// TMDB (The Movie Database), for Visio › Services and Mundus (Lingua 3.0-7): live lists of series
// and films originally in the language, on the learner's services in their country, and where each
// pick can be watched. The learner's own free "API Read Access Token" travels in the Authorization
// header, never in an address (TMDB's short v3 key only works in an address, so it isn't accepted).
// Answers are kept on the device for a day (lists) or a week (titles), so a page costs few requests.

const API = 'https://api.themoviedb.org/3';
const IMAGES = 'https://image.tmdb.org/t/p/';
const DAY = 86_400_000;
const CACHE_PREFIX = 'lingua.tmdb.v1:';

export type TitleType = 'tv' | 'movie';

export interface TmdbTitle {
  id: number;
  type: TitleType;
  /** The title in the language asked for (usually the original for titles in that language). */
  title: string;
  original: string;
  overview: string;
  /** The language the overview is in, when it was asked for one. */
  overviewLang?: string;
  posterPath?: string;
  year?: number;
  rating?: number;
  originalLanguage?: string;
}

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path?: string;
}

export interface WhereToWatch {
  /** TMDB's page listing every way to watch it in that country (made with JustWatch). */
  link?: string;
  /** Included with a subscription, free, or free with ads. */
  stream: WatchProvider[];
  /** To rent or buy. */
  rentOrBuy: WatchProvider[];
}

export class TmdbError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** TMDB's short v3 "API key" (32 hex characters): it only works in an address, which Lingua never does. */
export const isV3Key = (token: string) => /^[0-9a-f]{32}$/i.test(token.trim());

/** TMDB's language codes where they differ from Lingua's. */
const TMDB_LANG: Record<string, string> = { nb: 'no', yue: 'cn', sh: 'hr' };
export const tmdbLanguage = (lang: string) => TMDB_LANG[lang] ?? lang;

export const posterUrl = (path: string | undefined, width: 'w185' | 'w342' | 'w500' = 'w342') => (path ? `${IMAGES}${width}${path}` : undefined);

function readCache<T>(key: string, maxAge: number): T | undefined {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return undefined;
    const { at, data } = JSON.parse(raw) as { at: number; data: T };
    return Date.now() - at < maxAge ? data : undefined;
  } catch {
    return undefined;
  }
}

function writeCache(key: string, data: unknown): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    // Storage full or blocked: drop older answers and carry on without caching.
    pruneCache(0);
  }
}

/** Forgets cached answers older than `maxAge` (all of them with 0). */
export function pruneCache(maxAge = 8 * DAY): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key?.startsWith(CACHE_PREFIX)) continue;
      const at = (JSON.parse(localStorage.getItem(key) ?? '{}') as { at?: number }).at ?? 0;
      if (Date.now() - at >= maxAge) localStorage.removeItem(key);
    }
  } catch {
    // Nothing to prune.
  }
}

async function get<T>(path: string, params: Record<string, string | number | undefined>, token: string, maxAge: number, fetcher: typeof fetch = fetch): Promise<T> {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') query.set(k, String(v));
  const key = `${path}?${query}`;
  const cached = maxAge > 0 ? readCache<T>(key, maxAge) : undefined;
  if (cached !== undefined) return cached;
  const res = await fetcher(`${API}${key}`, {
    headers: { Authorization: `Bearer ${token.trim()}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(12_000),
  });
  if (res.status === 401) throw new TmdbError('TMDB didn’t accept the token. Copy the “API Read Access Token” again from TMDB’s API settings.', 401);
  if (res.status === 429) throw new TmdbError('TMDB is busy. Try again in a moment.', 429);
  if (!res.ok) throw new TmdbError(`TMDB answered with an error (${res.status}).`, res.status);
  const data = (await res.json()) as T;
  if (maxAge > 0) writeCache(key, data);
  return data;
}

/** Checks a token with TMDB itself. */
export async function checkToken(token: string, fetcher: typeof fetch = fetch): Promise<boolean> {
  if (!token.trim() || isV3Key(token)) return false;
  try {
    const data = await get<{ success?: boolean }>('/authentication', {}, token, 0, fetcher);
    return Boolean(data.success);
  } catch (error) {
    if (error instanceof TmdbError && error.status === 401) return false;
    throw error;
  }
}

interface RawTitle {
  id: number;
  name?: string;
  title?: string;
  original_name?: string;
  original_title?: string;
  overview?: string;
  poster_path?: string | null;
  first_air_date?: string;
  release_date?: string;
  vote_average?: number;
  original_language?: string;
}

function toTitle(raw: RawTitle, type: TitleType): TmdbTitle {
  const date = raw.first_air_date || raw.release_date;
  const original = raw.original_name ?? raw.original_title ?? '';
  return {
    id: raw.id,
    type,
    title: raw.name ?? raw.title ?? original,
    original,
    overview: raw.overview ?? '',
    posterPath: raw.poster_path ?? undefined,
    year: date ? Number(date.slice(0, 4)) || undefined : undefined,
    rating: raw.vote_average || undefined,
    originalLanguage: raw.original_language,
  };
}

/** The services TMDB knows in a country, for a kind of title. Kept a week. */
export async function providersIn(region: string, type: TitleType, token: string, fetcher?: typeof fetch): Promise<WatchProvider[]> {
  const data = await get<{ results?: WatchProvider[] }>(`/watch/providers/${type}`, { watch_region: region }, token, 7 * DAY, fetcher);
  return data.results ?? [];
}

/**
 * Series or films originally in the language that stream on the given services in a country,
 * most popular first, with their overviews in the language where TMDB has one. Kept a day.
 */
export async function discoverTitles(
  opts: { lang: string; region: string; type: TitleType; providerIds: number[]; page?: number },
  token: string,
  fetcher?: typeof fetch,
): Promise<TmdbTitle[]> {
  if (!opts.providerIds.length) return [];
  const data = await get<{ results?: RawTitle[] }>(
    `/discover/${opts.type}`,
    {
      with_original_language: tmdbLanguage(opts.lang),
      watch_region: opts.region,
      with_watch_providers: opts.providerIds.join('|'),
      with_watch_monetization_types: 'flatrate|free|ads',
      sort_by: 'popularity.desc',
      include_adult: 'false',
      'vote_count.gte': 10,
      language: tmdbLanguage(opts.lang),
      page: opts.page ?? 1,
    },
    token,
    DAY,
    fetcher,
  );
  return (data.results ?? []).map((r) => toTitle(r, opts.type));
}

/** Where a title can be watched in a country. Kept a day. */
export async function whereToWatch(type: TitleType, id: number, region: string, token: string, fetcher?: typeof fetch): Promise<WhereToWatch> {
  const data = await get<{ results?: Record<string, { link?: string; flatrate?: WatchProvider[]; free?: WatchProvider[]; ads?: WatchProvider[]; rent?: WatchProvider[]; buy?: WatchProvider[] }> }>(
    `/${type}/${id}/watch/providers`,
    {},
    token,
    DAY,
    fetcher,
  );
  const here = data.results?.[region];
  const unique = (list: WatchProvider[]) => list.filter((p, i) => list.findIndex((q) => q.provider_id === p.provider_id) === i);
  return {
    link: here?.link,
    stream: unique([...(here?.flatrate ?? []), ...(here?.free ?? []), ...(here?.ads ?? [])]),
    rentOrBuy: unique([...(here?.rent ?? []), ...(here?.buy ?? [])]),
  };
}

/** A title's overview in a language (English when TMDB has none in it). Kept a week. */
export async function titleDetails(type: TitleType, id: number, lang: string, token: string, fetcher?: typeof fetch): Promise<TmdbTitle> {
  const raw = await get<RawTitle>(`/${type}/${id}`, { language: tmdbLanguage(lang) }, token, 7 * DAY, fetcher);
  const title = toTitle(raw, type);
  if (title.overview || lang === 'en') return { ...title, overviewLang: lang };
  const english = await get<RawTitle>(`/${type}/${id}`, { language: 'en-US' }, token, 7 * DAY, fetcher);
  return { ...title, overview: english.overview ?? '', overviewLang: 'en' };
}

/**
 * Finds a hand-picked series or film on TMDB by its original title and year, preferring a result
 * originally in the language. Kept a week; `null` when nothing fits.
 */
export async function findTitle(opts: { title: string; en?: string; year?: number; type: TitleType; lang: string }, token: string, fetcher?: typeof fetch): Promise<TmdbTitle | null> {
  const want = tmdbLanguage(opts.lang);
  const search = async (query: string) => {
    const data = await get<{ results?: RawTitle[] }>(
      `/search/${opts.type}`,
      { query, [opts.type === 'tv' ? 'first_air_date_year' : 'primary_release_year']: opts.year, include_adult: 'false', language: 'en-US' },
      token,
      7 * DAY,
      fetcher,
    );
    const results = data.results ?? [];
    return results.find((r) => r.original_language === want) ?? (want === 'en' ? results[0] : undefined);
  };
  const hit = (await search(opts.title)) ?? (opts.en ? await search(opts.en) : undefined);
  return hit ? toTitle(hit, opts.type) : null;
}
