// Lyrics from LRCLIB (lrclib.net): free and open, made by listeners, and often timed line by line
// to the music. No key; it allows apps in the browser to ask directly.
import { isTimed, parseLrc, parsePlain } from '@/core/cantus/lyrics';
import type { LyricLine } from '@/core/cantus/lyrics';

const API = 'https://lrclib.net/api';

interface LrclibRecord {
  id: number;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
}

export interface FoundLyrics {
  id: number;
  title: string;
  artist: string;
  album?: string;
  durationMs?: number;
  lines: LyricLine[];
  timed: boolean;
  instrumental: boolean;
}

function toFound(r: LrclibRecord): FoundLyrics {
  const synced = r.syncedLyrics ? parseLrc(r.syncedLyrics) : [];
  const lines = synced.length && isTimed(synced) ? synced : r.plainLyrics ? parsePlain(r.plainLyrics) : [];
  return {
    id: r.id,
    title: r.trackName ?? '',
    artist: r.artistName ?? '',
    album: r.albumName ?? undefined,
    durationMs: r.duration ? Math.round(r.duration * 1000) : undefined,
    lines,
    timed: lines === synced && synced.length > 0,
    instrumental: Boolean(r.instrumental),
  };
}

/** null when LRCLIB has no such record; throws when it couldn't be asked (offline, busy). */
async function get<T>(path: string, params: Record<string, string>): Promise<T | null> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}${path}?${new URLSearchParams(params)}`, { signal: AbortSignal.timeout(10_000) });
    if (res.status === 404) return null;
    if (res.ok) return (await res.json()) as T;
    // Busy: one more try after a pause.
    if (res.status === 429 && attempt === 0) await new Promise((r) => setTimeout(r, 1500));
    else throw new Error('The lyrics library didn’t answer. Try again in a moment.');
  }
}

/** "Despacito (feat. Justin Bieber) - Remix" → "despacito remix"-ish: the words that identify a title. */
const norm = (s: string) =>
  s
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\((?:feat|ft|with|con)\.?[^)]*\)|\[(?:feat|ft)\.?[^\]]*\]/g, '')
    .replace(/\s+-\s+(?:remaster(?:ed)?|live|version|mono|stereo|radio edit).*$/, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

function score(r: LrclibRecord, title: string, artist: string, durationMs?: number): number {
  const t = norm(title);
  const a = norm(artist).split(' ')[0];
  const rt = norm(r.trackName ?? '');
  let s = 0;
  if (rt === t) s += 4;
  else if (rt.includes(t) || t.includes(rt)) s += 2;
  else return -1;
  if (a && norm(r.artistName ?? '').includes(a)) s += 3;
  if (durationMs && r.duration) {
    const off = Math.abs(r.duration * 1000 - durationMs);
    s += off < 2500 ? 3 : off < 8000 ? 1 : -2;
  }
  if (r.syncedLyrics) s += 2;
  else if (!r.plainLyrics && !r.instrumental) s -= 4;
  return s;
}

/**
 * The lyrics of a song (null when LRCLIB has none; throws when it couldn't be reached): the exact record when LRCLIB knows the song by title, artist, album and
 * length, otherwise the best search match (timed lyrics preferred, the length must be close).
 */
export async function findLyrics(q: { title: string; artist: string; album?: string; durationMs?: number }): Promise<FoundLyrics | null> {
  if (q.durationMs) {
    const exact = await get<LrclibRecord>('/get', {
      track_name: q.title,
      artist_name: q.artist,
      ...(q.album ? { album_name: q.album } : {}),
      duration: String(Math.round(q.durationMs / 1000)),
    });
    if (exact && (exact.syncedLyrics || exact.plainLyrics || exact.instrumental)) {
      if (exact.syncedLyrics || exact.instrumental) return toFound(exact);
      // A plain record: a timed one may exist under a slightly different name.
      const timed = await searchRecords({ track_name: q.title, artist_name: q.artist });
      const better = timed.filter((r) => r.syncedLyrics && score(r, q.title, q.artist, q.durationMs) >= 8)[0];
      return toFound(better ?? exact);
    }
  }
  const pools = [await searchRecords({ track_name: norm(q.title), artist_name: q.artist })];
  if (!pools[0].length) pools.push(await searchRecords({ q: `${norm(q.title)} ${q.artist}` }));
  const ranked = pools
    .flat()
    .map((r) => [r, score(r, q.title, q.artist, q.durationMs)] as const)
    .filter(([, s]) => s >= 5)
    .sort((a, b) => b[1] - a[1]);
  return ranked.length ? toFound(ranked[0][0]) : null;
}

async function searchRecords(params: Record<string, string>): Promise<LrclibRecord[]> {
  return (await get<LrclibRecord[]>('/search', params)) ?? [];
}

/** Other versions of a song's lyrics, for "Find other lyrics". */
export async function searchLyrics(query: string): Promise<FoundLyrics[]> {
  const found = await get<LrclibRecord[]>('/search', { q: query.trim() });
  return (found ?? []).filter((r) => r.syncedLyrics || r.plainLyrics).slice(0, 20).map(toFound);
}
