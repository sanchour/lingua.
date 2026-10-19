// Lyrics from LRCLIB (lrclib.net): free and open, made by listeners, and often timed line by line
// to the music. No key; it allows apps in the browser to ask directly. Shared with
// scripts/cantus/lyrics-check.ts, so it imports with relative paths.
import { isTimed, parseLrc, parsePlain } from '../../core/cantus/lyrics.ts';
import type { LyricLine } from '../../core/cantus/lyrics.ts';

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

export interface SongQuery {
  title: string;
  artist: string;
  album?: string;
  durationMs?: number;
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

/** LRCLIB said it was busy (it is run by volunteers, and turns new questions away when loaded). */
export class LyricsBusyError extends Error {
  constructor() {
    super('The lyrics library is busy. Trying again in a moment.');
    this.name = 'LyricsBusyError';
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * null when LRCLIB has no such record; throws when it couldn't be asked (offline), or stayed busy.
 * Busy (503) or too many questions (429): wait as long as it asks (Retry-After), up to three times.
 */
async function get<T>(path: string, params: Record<string, string>): Promise<T | null> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}${path}?${new URLSearchParams(params)}`, { signal: AbortSignal.timeout(12_000) });
    if (res.status === 404) return null;
    if (res.ok) return (await res.json()) as T;
    if (res.status !== 429 && res.status < 500) throw new Error('The lyrics library didn’t answer. Try again in a moment.');
    if (attempt >= 2) throw new LyricsBusyError();
    const after = Number(res.headers.get('retry-after'));
    await wait(after > 0 ? Math.min(after, 10) * 1000 : [1500, 3500][attempt]);
  }
}

/** "Despacito (feat. Justin Bieber) - Remix" → "despacito remix"-ish: the words that identify a title. */
const norm = (s: string) =>
  s
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[([](?:feat|ft|with|con|prod)\.?[^)\]]*[)\]]/g, '')
    .replace(/\s+-\s+(?:(?:\d{4}\s+)?remaster(?:ed)?|live|version|mono|stereo|radio edit|from\b|en vivo|ao vivo|acoustic).*$/, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** The title as LRCLIB most often has it: no featuring, no remaster or live tag, no film it's from. */
export const cleanTitle = (title: string) =>
  title
    .replace(/\s*[([](?:feat|ft|with|con|prod|from|de la película|remaster(?:ed)?|\d{4} remaster)\.?[^)\]]*[)\]]/gi, '')
    .replace(/\s+-\s+(?:(?:\d{4}\s+)?remaster(?:ed)?|live|version|mono|stereo|radio edit|from\b|en vivo|ao vivo|acoustic).*$/i, '')
    .trim();

/** The first artist named: "Rosalía, J Balvin & El Guincho" → "Rosalía". */
export const firstArtist = (artist: string) => artist.split(/\s*(?:,|&|\+|\bfeat\.?|\bft\.?|\bx\b|\by\b|\be\b|\bund\b|\bet\b|\bwith\b)\s*/i)[0].trim() || artist;

interface Scored {
  record: LrclibRecord;
  score: number;
  /** The artist or the length agrees: not just another song with the same title. */
  sure: boolean;
}

/**
 * Lyrics someone uploaded with a translation after each line ("Donnez-moi une suite au Ritz (Give
 * me a suite at the Ritz)"): most sung lines end in a long bracketed part. Backing vocals in
 * brackets are short, or a line of their own.
 */
export function hasInlineTranslation(lyrics: string): boolean {
  const lines = lyrics
    .split('\n')
    .map((l) => l.replace(/^\s*(\[[^\]]*\]\s*)+/, '').trim())
    .filter((l) => /\p{L}/u.test(l));
  const glossed = lines.filter((l) => /\p{L}[^()]{3,}\(([^()]{12,})\)\s*$/u.test(l)).length;
  return glossed >= 4 && glossed >= lines.length * 0.5;
}

const glossedRecord = (r: LrclibRecord) => hasInlineTranslation(r.syncedLyrics ?? r.plainLyrics ?? '');

function score(r: LrclibRecord, q: SongQuery): Scored {
  const t = norm(q.title);
  const rt = norm(r.trackName ?? '');
  let s = 0;
  if (rt === t) s += 4;
  else if (rt && t && (rt.includes(t) || t.includes(rt))) s += 2;
  else return { record: r, score: -1, sure: false };
  const a = norm(firstArtist(q.artist));
  const ra = norm(r.artistName ?? '');
  const rf = norm(firstArtist(r.artistName ?? ''));
  const artistOk = Boolean(a && ra && (ra.includes(a) || (rf && a.includes(rf))));
  if (artistOk) s += 3;
  let lengthOk = false;
  if (q.durationMs && r.duration) {
    const off = Math.abs(r.duration * 1000 - q.durationMs);
    lengthOk = off < 3000;
    s += off < 2500 ? 3 : off < 8000 ? 1 : -2;
  }
  if (r.syncedLyrics) s += 2;
  else if (!r.plainLyrics && !r.instrumental) s -= 4;
  // A translation mixed into the lyrics: any clean version is better.
  if (glossedRecord(r)) s -= 6;
  return { record: r, score: s, sure: artistOk || lengthOk };
}

async function searchRecords(params: Record<string, string>): Promise<LrclibRecord[]> {
  return (await get<LrclibRecord[]>('/search', params)) ?? [];
}

/**
 * The exact record LRCLIB keeps for a title, artist and length. Without the album: Apple's album
 * names ("… - Single", "(Deluxe)") rarely match LRCLIB's, and every extra question counts.
 */
async function exact(q: SongQuery): Promise<LrclibRecord | null> {
  if (!q.durationMs) return null;
  const r = await get<LrclibRecord>('/get', { track_name: q.title, artist_name: q.artist, duration: String(Math.round(q.durationMs / 1000)) });
  return r && (r.syncedLyrics || r.plainLyrics || r.instrumental) ? r : null;
}

/**
 * Every likely record for a song, best first: searched by words (the cleaned title and first
 * artist), then by title and artist, and for the list to pick from, by the title alone. Stops
 * asking once a sure, timed match turns up: LRCLIB is shared, so every question counts.
 */
async function ranked(q: SongQuery, wide = false): Promise<Scored[]> {
  const title = cleanTitle(q.title);
  const artist = firstArtist(q.artist);
  const searches: Array<Record<string, string>> = [{ q: `${title} ${artist}` }, { track_name: title, artist_name: artist }];
  if (wide) searches.push({ track_name: title });
  const seen = new Map<number, Scored>();
  for (const params of searches) {
    for (const r of await searchRecords(params)) if (!seen.has(r.id)) seen.set(r.id, score(r, q));
    const best = [...seen.values()].some((x) => x.sure && x.score >= 7 && x.record.syncedLyrics);
    if (best) break;
  }
  return [...seen.values()].filter((x) => x.score >= 0).sort((a, b) => b.score - a.score);
}

/**
 * The lyrics of a song (null when LRCLIB has none it is sure of; throws when it couldn't be
 * reached): the exact record when LRCLIB knows the song by name and length, else the best search
 * match whose artist or length agrees (timed lyrics preferred).
 */
export async function findLyrics(q: SongQuery): Promise<FoundLyrics | null> {
  const found = await exact(q);
  const mixed = found ? glossedRecord(found) : false;
  if ((found?.syncedLyrics && !mixed) || found?.instrumental) return toFound(found);
  const list = await ranked(q);
  // A plain (or translation-mixed) exact record: a clean timed one may exist under a slightly different name.
  const timed = list.find((x) => x.sure && x.record.syncedLyrics && x.score >= 8);
  if (found && mixed) {
    const clean = timed ?? list.find((x) => x.sure && x.score >= 5);
    return toFound(clean?.record ?? found);
  }
  if (found) return toFound(timed?.record ?? found);
  const best = list.find((x) => x.sure && x.score >= 5);
  return best ? toFound(best.record) : null;
}

/** Lyrics to choose from when none were sure (the song page shows them straight away). */
export async function lyricCandidates(q: SongQuery, limit = 6): Promise<FoundLyrics[]> {
  return (await ranked(q, true))
    .filter((x) => x.record.syncedLyrics || x.record.plainLyrics)
    .slice(0, limit)
    .map((x) => toFound(x.record));
}

/** Other versions of a song's lyrics, for "Find other lyrics". */
export async function searchLyrics(query: string): Promise<FoundLyrics[]> {
  const found = await get<LrclibRecord[]>('/search', { q: query.trim() });
  return (found ?? [])
    .filter((r) => r.syncedLyrics || r.plainLyrics)
    .sort((a, b) => Number(Boolean(b.syncedLyrics)) - Number(Boolean(a.syncedLyrics)))
    .slice(0, 20)
    .map(toFound);
}
