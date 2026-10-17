// Cantus's lists that come from outside: the weekly charts baked into the app, and the learner's
// Spotify liked songs sorted by the language they're sung in.
import { useEffect, useState } from 'react';
import { detectLanguage } from '@/core/lang/detect';
import { openSong, patchSong } from '@/data/songs';
import { db } from '@/data/db';
import { matchSong } from '@/services/cantus/catalog';
import { likedTracks } from '@/services/cantus/spotify';
import type { SpotifyTrack } from '@/services/cantus/spotify';

export interface ChartSong {
  title: string;
  artist: string;
  album?: string;
  cover?: string;
  durationMs?: number;
  where: string;
}

let charts: Promise<{ updatedAt: string; charts: Record<string, ChartSong[]> } | null> | null = null;

/** This week's most played songs sung in the language (built with the app; see scripts/cantus/charts.ts). */
export function useCharts(lang: string): { songs: ChartSong[]; updatedAt: string } | null | undefined {
  const [value, setValue] = useState<{ songs: ChartSong[]; updatedAt: string } | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    charts ??= fetch(`${import.meta.env.BASE_URL}cantus/charts.json`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    void charts.then((data) => {
      if (!alive) return;
      const songs = data?.charts[lang] ?? [];
      // A chart of only a handful of songs in the language isn't worth a row.
      setValue(songs.length >= 6 ? { songs, updatedAt: data!.updatedAt } : null);
    });
    return () => {
      alive = false;
    };
  }, [lang]);
  return value;
}

/** Opens a song known only by title and artist (a chart, a Spotify like): Apple's catalogue finds it. */
export async function openByName(lang: string, title: string, artist: string, extra: { spotifyId?: string; cover?: string; durationMs?: number } = {}): Promise<string> {
  const hit = await matchSong(lang, title, artist).catch(() => null);
  if (hit) return openSong(lang, hit, extra.spotifyId ? { spotifyId: extra.spotifyId } : {});
  // Not in Apple's catalogue: keep it with what we know.
  const id = `${lang}:${extra.spotifyId ? `spotify:${extra.spotifyId}` : `name:${title}|${artist}`.toLocaleLowerCase()}`;
  const now = Date.now();
  const existing = await db.songs.get(id);
  if (existing) {
    if (existing.deletedAt) await patchSong(id, { deletedAt: undefined });
    return id;
  }
  await db.songs.add({ id, lang, title, artist, artworkUrl: extra.cover, durationMs: extra.durationMs, spotifyId: extra.spotifyId, lines: [], createdAt: now, updatedAt: now });
  return id;
}

// ── Spotify likes in the language ─────────────────────────────────────────────────────────────

const CACHE_KEY = 'lingua:spotify-langs';
const SCAN_LIMIT = 400;

function cachedLangs(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}
function storeLangs(map: Record<string, string>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {
    /* storage full or blocked: it is only a cache */
  }
}

/** The language a Spotify track is sung in: its title's alphabet, else its lyrics (LRCLIB). '' when unknown. */
async function sungIn(t: SpotifyTrack): Promise<string> {
  const artist = t.artists[0]?.name ?? '';
  const byScript = detectLanguage(`${t.name} ${t.name} ${artist}`);
  if (byScript && (byScript.lang === 'ru' || byScript.lang === 'el')) return byScript.lang;
  const params = new URLSearchParams({ track_name: t.name, artist_name: artist });
  if (t.duration_ms) params.set('duration', String(Math.round(t.duration_ms / 1000)));
  try {
    const res = await fetch(`https://lrclib.net/api/get?${params}`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return '';
    const rec = (await res.json()) as { plainLyrics?: string | null };
    return (rec.plainLyrics && detectLanguage(rec.plainLyrics)?.lang) || '';
  } catch {
    return '';
  }
}

export interface LikedScan {
  tracks: SpotifyTrack[];
  checked: number;
  total: number;
  done: boolean;
  error?: string;
}

/**
 * Goes through your liked songs (newest first, up to 400) and keeps the ones sung in `lang`.
 * What each song is sung in is remembered on this device, so later scans are instant.
 */
export function useSpotifyLikes(lang: string, enabled: boolean): LikedScan | null {
  const [scan, setScan] = useState<LikedScan | null>(null);
  useEffect(() => {
    if (!enabled) return setScan(null);
    let alive = true;
    const langs = cachedLangs();
    const found: SpotifyTrack[] = [];
    let checked = 0;
    void (async () => {
      try {
        let offset = 0;
        let total = 1;
        while (alive && offset < Math.min(total, SCAN_LIMIT)) {
          const page = await likedTracks(offset, 50);
          total = page.total;
          offset += 50;
          const queue = [...page.tracks];
          const worker = async () => {
            for (let t = queue.shift(); t && alive; t = queue.shift()) {
              if (!(t.id in langs)) langs[t.id] = await sungIn(t);
              checked++;
              if (langs[t.id] === lang) found.push(t);
            }
          };
          await Promise.all([worker(), worker(), worker(), worker()]);
          storeLangs(langs);
          if (alive) setScan({ tracks: [...found], checked, total: Math.min(total, SCAN_LIMIT), done: false });
        }
        if (alive) setScan({ tracks: [...found], checked, total: Math.min(total, SCAN_LIMIT), done: true });
      } catch (e) {
        if (alive) setScan({ tracks: [...found], checked, total: 0, done: true, error: e instanceof Error ? e.message : 'Spotify didn’t answer.' });
      }
    })();
    return () => {
      alive = false;
    };
  }, [lang, enabled]);
  return scan;
}
