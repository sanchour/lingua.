// Radio stations from radio-browser.info, an open directory kept by its community. Stations are
// found by the language's names there (matched exactly); only https streams this browser can play
// are kept. A language's list is kept for half a day, on the device.
import { getLanguage } from '@/core/lang/languages';
import type { RadioStation } from '@/data/types';

/** The language's names in radio-browser.info, where they differ from the English name. */
export const RADIO_NAMES: Record<string, string[]> = {
  pt: ['portuguese', 'brazilian portuguese'],
  nb: ['norwegian', 'norsk'],
  id: ['indonesian', 'bahasa indonesia'],
  zh: ['chinese', 'mandarin'],
  tl: ['tagalog', 'filipino'],
  fa: ['persian', 'farsi'],
  sh: ['croatian', 'serbian', 'bosnian', 'montenegrin'],
  ms: ['malay', 'bahasa melayu'],
};

/** Every language gets radio: its English name, lower case, unless it is listed above. */
export const radioNames = (lang: string): string[] => RADIO_NAMES[lang] ?? [getLanguage(lang)?.name.toLowerCase() ?? lang];

// de1 and de2 answer today; the round-robin name finds whichever servers exist later.
const SERVERS = ['de1.api.radio-browser.info', 'de2.api.radio-browser.info', 'all.api.radio-browser.info'];
let server = 0;

export class RadioError extends Error {}

async function api<T>(path: string, params: Record<string, string | number | boolean> = {}): Promise<T> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) throw new RadioError('You’re offline.');
  const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  for (let tries = 0; tries < SERVERS.length; tries++) {
    const at = (server + tries) % SERVERS.length;
    try {
      const res = await fetch(`https://${SERVERS[at]}/json/${path}${query ? `?${query}` : ''}`, { signal: AbortSignal.timeout(12_000) });
      if (!res.ok) continue;
      server = at;
      return (await res.json()) as T;
    } catch {
      // The next server.
    }
  }
  throw new RadioError('The radio directory isn’t answering right now. Try again in a moment.');
}

/** A station as radio-browser sends it (only the fields Lingua reads). */
export interface RawStation {
  stationuuid: string;
  name: string;
  url?: string;
  url_resolved?: string;
  homepage?: string;
  favicon?: string;
  tags?: string;
  country?: string;
  countrycode?: string;
  state?: string;
  codec?: string;
  bitrate?: number;
  hls?: number;
  lastcheckok?: number;
  clickcount?: number;
  votes?: number;
  geo_lat?: number | null;
  geo_long?: number | null;
}

const https = (u?: string) => (u && /^https:\/\//i.test(u.trim()) ? u.trim() : undefined);
const place = (n: number | null | undefined, max: number) => (typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= max ? n : undefined);

export function toStation(raw: RawStation): RadioStation | null {
  const url = https(raw.url_resolved) ?? https(raw.url);
  const name = raw.name?.replace(/\s+/g, ' ').trim();
  if (!url || !name || raw.lastcheckok === 0) return null;
  let lat = place(raw.geo_lat, 85);
  let lon = place(raw.geo_long, 180);
  // 0,0 is a missing place, not the Gulf of Guinea.
  if (lat === 0 && lon === 0) lat = lon = undefined;
  return {
    id: raw.stationuuid,
    name,
    url,
    homepage: https(raw.homepage),
    favicon: https(raw.favicon),
    country: raw.country?.trim() || undefined,
    countryCode: raw.countrycode?.trim().toUpperCase() || undefined,
    state: raw.state?.trim() || undefined,
    tags: (raw.tags ?? '')
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t && t.length <= 20)
      .slice(0, 4),
    codec: raw.codec && raw.codec !== 'UNKNOWN' ? raw.codec : undefined,
    bitrate: raw.bitrate || undefined,
    hls: raw.hls === 1,
    lat: lat !== undefined && lon !== undefined ? lat : undefined,
    lon: lat !== undefined && lon !== undefined ? lon : undefined,
    clicks: raw.clickcount ?? 0,
    votes: raw.votes ?? 0,
  };
}

const CODEC_TYPES: Record<string, string> = { MP3: 'audio/mpeg', AAC: 'audio/aac', 'AAC+': 'audio/aac', OGG: 'audio/ogg', OPUS: 'audio/ogg; codecs="opus"', FLAC: 'audio/flac' };

/** Whether this browser can play the stream: HLS only where it plays natively, never video. */
export function playable(s: RadioStation, canPlay: (type: string) => boolean): boolean {
  if (s.hls) return canPlay('application/vnd.apple.mpegurl');
  const codec = s.codec?.toUpperCase();
  if (!codec) return true;
  if (/H\.?26[45]|FLV|VP[89]|THEORA/.test(codec)) return false;
  const type = CODEC_TYPES[codec];
  return !type || canPlay(type);
}

const canPlayHere = (type: string) => typeof document !== 'undefined' && document.createElement('audio').canPlayType(type) !== '';

/** Playable stations, each once (the same stream or the same name in the same country), most listened first. */
export function cleanStations(raws: RawStation[], canPlay: (type: string) => boolean = canPlayHere): RadioStation[] {
  const seen = new Set<string>();
  const out: RadioStation[] = [];
  for (const raw of [...raws].sort((a, b) => (b.clickcount ?? 0) - (a.clickcount ?? 0) || (b.votes ?? 0) - (a.votes ?? 0))) {
    const s = toStation(raw);
    if (!s || !playable(s, canPlay)) continue;
    const keys = [s.id, s.url.replace(/^https:\/\//i, '').replace(/\/+$/, '').toLowerCase(), `${s.name.toLowerCase()}|${s.countryCode ?? ''}`];
    if (keys.some((k) => seen.has(k))) continue;
    for (const k of keys) seen.add(k);
    out.push(s);
  }
  return out;
}

const SEARCH = { languageExact: true, is_https: true, hidebroken: true, order: 'clickcount', reverse: true } as const;

async function byLanguage(lang: string, extra: Record<string, string | number>, limit: number): Promise<RadioStation[]> {
  const lists = await Promise.all(radioNames(lang).map((language) => api<RawStation[]>('stations/search', { ...SEARCH, ...extra, language, limit })));
  return cleanStations(lists.flat());
}

const KEEP_MS = 12 * 3600_000;
const cacheKey = (lang: string) => `lingua.radio.${lang}`;
const memory = new Map<string, Promise<RadioStation[]>>();

function readCache(lang: string): { at: number; stations: RadioStation[] } | null {
  try {
    const raw = localStorage.getItem(cacheKey(lang));
    return raw ? (JSON.parse(raw) as { at: number; stations: RadioStation[] }) : null;
  } catch {
    return null;
  }
}

function writeCache(lang: string, stations: RadioStation[]) {
  try {
    localStorage.setItem(cacheKey(lang), JSON.stringify({ at: Date.now(), stations }));
  } catch {
    // Storage full or blocked: the list is fetched again next time.
  }
}

/** The language's stations, most listened first (about 400 a name). */
export function stationsFor(lang: string): Promise<RadioStation[]> {
  let pending = memory.get(lang);
  if (!pending) {
    pending = (async () => {
      const cached = readCache(lang);
      if (cached && Date.now() - cached.at < KEEP_MS) return cached.stations;
      try {
        const stations = await byLanguage(lang, {}, 400);
        writeCache(lang, stations);
        return stations;
      } catch (error) {
        if (cached) return cached.stations;
        throw error;
      }
    })();
    memory.set(lang, pending);
    pending.catch(() => memory.delete(lang));
  }
  return pending;
}

/** The language's stations in one country (more than the overall list holds). */
export const stationsIn = (lang: string, countryCode: string) => byLanguage(lang, { countrycode: countryCode }, 150);

/** Stations whose name or tags match, in the language. */
export async function searchStations(lang: string, query: string): Promise<RadioStation[]> {
  const q = query.trim();
  if (!q) return [];
  const [named, tagged] = await Promise.all([byLanguage(lang, { name: q }, 60), byLanguage(lang, { tag: q.toLowerCase() }, 40)]);
  const ids = new Set(named.map((s) => s.id));
  return [...named, ...tagged.filter((s) => !ids.has(s.id))];
}

/** Tells radio-browser a station was played, as its API asks (it orders stations by this). */
export function countClick(id: string): void {
  void api(`url/${encodeURIComponent(id)}`).catch(() => undefined);
}

/** Where a station is: its region and country, or what it names of them. */
export const stationPlace = (s: Pick<RadioStation, 'state' | 'country'>): string | undefined => (s.state && s.country && s.state !== s.country ? `${s.state}, ${s.country}` : (s.country ?? s.state));

// ── The map ──────────────────────────────────────────────────────────────────

export interface Place {
  key: string;
  lat: number;
  lon: number;
  /** The region or country most of its stations name. */
  label: string;
  stations: RadioStation[];
}

/** Stations close together (about 30 km) become one place on the map, its biggest first. */
export function placesOf(stations: RadioStation[], cellDeg = 0.3): Place[] {
  const cells = new Map<string, RadioStation[]>();
  for (const s of stations) {
    if (s.lat === undefined || s.lon === undefined) continue;
    const key = `${Math.round(s.lat / cellDeg)}:${Math.round(s.lon / cellDeg)}`;
    const list = cells.get(key);
    if (list) list.push(s);
    else cells.set(key, [s]);
  }
  return [...cells].map(([key, list]) => {
    const names = new Map<string, number>();
    for (const s of list) {
      const name = stationPlace(s);
      if (name) names.set(name, (names.get(name) ?? 0) + 1);
    }
    const label = [...names].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Here';
    return { key, lat: list.reduce((n, s) => n + s.lat!, 0) / list.length, lon: list.reduce((n, s) => n + s.lon!, 0) / list.length, label, stations: list };
  });
}

/** Countries with the language's stations, the most stations first. */
export function countriesOf(stations: RadioStation[]): Array<{ code: string; name: string; count: number }> {
  const counts = new Map<string, { code: string; name: string; count: number }>();
  for (const s of stations) {
    if (!s.countryCode) continue;
    const c = counts.get(s.countryCode) ?? { code: s.countryCode, name: s.country ?? s.countryCode, count: 0 };
    c.count++;
    counts.set(s.countryCode, c);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}

// ── Now playing ──────────────────────────────────────────────────────────────

/** The song or show on now, from an Icecast server's status, for the stream's mount. */
export function readIcecast(status: unknown, streamUrl: string): string | null {
  const source = (status as { icestats?: { source?: unknown } } | null)?.icestats?.source;
  const list = (Array.isArray(source) ? source : source ? [source] : []) as Array<Record<string, unknown>>;
  let mount = '';
  try {
    mount = new URL(streamUrl).pathname;
  } catch {
    return null;
  }
  const pathOf = (u: unknown) => {
    try {
      return typeof u === 'string' ? new URL(u, 'https://x').pathname : '';
    } catch {
      return '';
    }
  };
  const match = list.find((s) => pathOf(s.listenurl) === mount) ?? (list.length === 1 ? list[0] : undefined);
  if (!match) return null;
  const text = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v).replace(/\s+/g, ' ').trim() : '');
  const title = text(match.title);
  const artist = text(match.artist);
  const line = artist && title && !title.includes(artist) ? `${artist} – ${title}` : title || artist;
  return line && !/^(-|unknown|n\/a)$/i.test(line) && line !== text(match.server_name) ? line : null;
}

/** The song on now from an AzuraCast station's public now-playing file. */
export function readAzuraCast(answer: unknown): string | null {
  const song = (answer as { now_playing?: { song?: Record<string, unknown> } } | null)?.now_playing?.song;
  if (!song) return null;
  const text = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');
  const line = text(song.artist) && text(song.title) ? `${text(song.artist)} – ${text(song.title)}` : text(song.text) || text(song.title);
  return line && !/^(-|unknown|n\/a)$/i.test(line) ? line : null;
}

const noStatus = new Set<string>();

/**
 * Now playing, when the station's server shares it with web pages: AzuraCast (streams at
 * `/listen/{station}/…`, common for community radio) or Icecast's status page. Null otherwise.
 */
export async function nowPlaying(streamUrl: string): Promise<string | null> {
  let url: URL;
  try {
    url = new URL(streamUrl);
  } catch {
    return null;
  }
  const azura = /^\/listen\/([\w-]+)\//.exec(url.pathname)?.[1];
  const status = azura ? `${url.origin}/api/nowplaying_static/${azura}.json` : `${url.origin}/status-json.xsl`;
  if (noStatus.has(status)) return null;
  try {
    const res = await fetch(status, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error('no status');
    const answer: unknown = await res.json();
    return azura ? readAzuraCast(answer) : readIcecast(answer, streamUrl);
  } catch {
    // This server doesn't say (or doesn't let web pages ask): stop asking it.
    noStatus.add(status);
    return null;
  }
}
