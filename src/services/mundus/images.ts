// Real pictures for Mundus's picks and shelves, from open sources that need no key: Open Library's
// covers for books, TVmaze's posters for series, Apple's podcast directory for podcast artwork, and
// Wikipedia's free page images (logos, portraits, photos) for the rest. Film posters need TMDB
// (Visio › Services); Wikipedia serves no copyrighted posters. Only titles and names are sent. Answers, misses
// included, are kept on the device, and at most four lookups run at once.
import type { Pick, PickGroup } from '@/core/mundus/types';

export type ImageQuery =
  | { kind: 'book'; title: string; by?: string }
  | { kind: 'podcast'; title: string }
  | { kind: 'tv'; title: string; en?: string }
  | { kind: 'wiki'; q: string; must: string; lang?: string }
  | { kind: 'article'; title: string };

const PREFIX = 'lingua.img.v1:';
const DAY = 86_400_000;
const KEEP_MS = 60 * DAY;
const MISS_MS = 5 * DAY;
const WIKI_HOST: Record<string, string> = { nb: 'no', yue: 'zh-yue', sh: 'sh' };

export const imageKey = (q: ImageQuery): string =>
  q.kind === 'book' ? `b:${q.title}|${q.by ?? ''}` : q.kind === 'podcast' ? `p:${q.title}` : q.kind === 'tv' ? `t:${q.title}` : q.kind === 'wiki' ? `w:${q.lang ?? ''}:${q.q}` : `a:${q.title}`;

const fold = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** Whether a found page is about the thing: its title shares the name's first real word. */
export function titleMatches(found: string, name: string): boolean {
  const words = fold(name)
    .split(' ')
    .filter((w) => w.length > 2 && !['the', 'los', 'las', 'les', 'die', 'der', 'das', 'una', 'uno'].includes(w));
  const key = words[0] ?? fold(name);
  return Boolean(key) && fold(found).includes(key);
}

/** What to look up for a pick, by its kind. */
export function pickImageQuery(pick: Pick, group: PickGroup, lang: string): ImageQuery {
  const name = pick.en ?? pick.title;
  const year = pick.year ? ` ${pick.year}` : '';
  if (group === 'books') return { kind: 'book', title: pick.title, by: pick.by };
  if (group === 'podcasts') return { kind: 'podcast', title: pick.title };
  if (group === 'series') return { kind: 'tv', title: pick.title, en: pick.en };
  if (group === 'films') return { kind: 'wiki', q: `${name}${year} film`, must: name, lang };
  if (group === 'games') return { kind: 'wiki', q: `${name} video game`, must: name, lang };
  if (group === 'youtube') return { kind: 'wiki', q: `${pick.title} YouTube`, must: pick.title, lang };
  return { kind: 'wiki', q: `${pick.title} dictionary`, must: pick.title };
}

/** A photo for each ready-made deck's theme (Wikipedia articles with free lead images). */
export const THEME_ARTICLE: Record<string, string> = {
  basics: 'Handshake', verbs: 'Running', connectors: 'Bridge', animals: 'Red fox', food: 'Food', people: 'Family', home: 'House',
  time: 'Clock', describe: 'Color', body: 'Human body', travel: 'Train', nature: 'Forest', feelings: 'Smile', work: 'Classroom',
};

function readCache(key: string): string | null | undefined {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return undefined;
    const { url, at } = JSON.parse(raw) as { url: string; at: number };
    if (Date.now() - at > (url ? KEEP_MS : MISS_MS)) return undefined;
    return url || null;
  } catch {
    return undefined;
  }
}

function writeCache(key: string, url: string | null): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ url: url ?? '', at: Date.now() }));
  } catch {
    // Storage full or blocked: looked up again next time.
  }
}

/** A cached answer, without looking anything up: `undefined` when it isn't known yet. */
export const cachedImage = (q: ImageQuery): string | null | undefined => readCache(imageKey(q));

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as T;
}

async function wikiSearch(q: string, must: string, host = 'en'): Promise<string | null> {
  const params = new URLSearchParams({ action: 'query', format: 'json', origin: '*', generator: 'search', gsrsearch: q, gsrlimit: '3', prop: 'pageimages', piprop: 'thumbnail', pithumbsize: '400', pilicense: 'any' });
  const data = await getJson<{ query?: { pages?: Record<string, { title: string; index?: number; thumbnail?: { source: string } }> } }>(`https://${host}.wikipedia.org/w/api.php?${params}`);
  const pages = Object.values(data.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  return pages.find((p) => p.thumbnail && titleMatches(p.title, must))?.thumbnail?.source ?? null;
}

async function lookUp(q: ImageQuery): Promise<string | null> {
  if (q.kind === 'article') {
    const data = await getJson<{ thumbnail?: { source: string } }>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q.title.replace(/ /g, '_'))}`);
    return data.thumbnail?.source ?? null;
  }
  if (q.kind === 'book') {
    const params = new URLSearchParams({ title: q.title, limit: '1', fields: 'cover_i' });
    if (q.by) params.set('author', q.by);
    const data = await getJson<{ docs?: Array<{ cover_i?: number }> }>(`https://openlibrary.org/search.json?${params}`);
    const id = data.docs?.[0]?.cover_i;
    return id ? `https://covers.openlibrary.org/b/id/${id}-M.jpg` : wikiSearch(`${q.title} ${q.by ?? ''} book`, q.title);
  }
  if (q.kind === 'tv') {
    for (const name of [q.title, q.en].filter(Boolean) as string[]) {
      const res = await fetch(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(name)}`, { signal: AbortSignal.timeout(8_000) });
      if (!res.ok) continue;
      const show = (await res.json()) as { name: string; image?: { medium?: string } };
      if (show.image?.medium && titleMatches(show.name, name)) return show.image.medium;
    }
    return null;
  }
  if (q.kind === 'podcast') {
    const params = new URLSearchParams({ media: 'podcast', entity: 'podcast', limit: '5', term: q.title });
    const data = await getJson<{ results: Array<{ collectionName?: string; artworkUrl600?: string }> }>(`https://itunes.apple.com/search?${params}`);
    return data.results.find((r) => r.artworkUrl600 && r.collectionName && titleMatches(r.collectionName, q.title))?.artworkUrl600 ?? null;
  }
  const found = await wikiSearch(q.q, q.must);
  if (found || !q.lang || q.lang === 'en') return found;
  return wikiSearch(q.must, q.must, WIKI_HOST[q.lang] ?? q.lang);
}

const pending = new Map<string, Promise<string | null>>();
const queue: Array<() => void> = [];
let running = 0;

function slot<T>(job: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      running++;
      job()
        .then(resolve, reject)
        .finally(() => {
          running--;
          queue.shift()?.();
        });
    };
    if (running < 4) run();
    else queue.push(run);
  });
}

/** The picture for a query: from the cache, or looked up once (concurrent asks share the lookup). */
export function findImage(q: ImageQuery): Promise<string | null> {
  const key = imageKey(q);
  const known = readCache(key);
  if (known !== undefined) return Promise.resolve(known);
  let job = pending.get(key);
  if (!job) {
    job = slot(() => lookUp(q))
      .catch(() => null)
      .then((url) => {
        writeCache(key, url);
        pending.delete(key);
        return url;
      });
    pending.set(key, job);
  }
  return job;
}
