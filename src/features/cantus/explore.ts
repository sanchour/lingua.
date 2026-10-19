// Music › Explore: a few songs to try each day, from the language's artists and one style of the
// day, so the room always has something new to tap. Picked by the date (the same all day, new
// tomorrow), shuffled again on request, and kept for the day so Apple is asked only a few times.
import { useEffect, useState } from 'react';
import { searchSongs } from '@/services/cantus/catalog';
import type { SongHit } from '@/services/cantus/catalog';
import { discoverFor } from './discover';

export interface Explore {
  /** Songs from three of the language's artists, mixed. */
  finds: SongHit[];
  /** The style of the day: its name, and songs in it. */
  style: { name: string; songs: SongHit[] } | null;
}

const today = () => new Date().toISOString().slice(0, 10);
const keyOf = (lang: string) => `lingua.music.explore.${lang}`;

/** A small seeded random (mulberry32), so a day's picks are the same all day. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function shuffled<T>(list: readonly T[], random: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Takes from each list in turn, so no artist comes twice in a row. */
export function interleave<T>(lists: T[][], max: number): T[] {
  const out: T[] = [];
  for (let i = 0; out.length < max && lists.some((l) => i < l.length); i++) for (const l of lists) if (i < l.length && out.length < max) out.push(l[i]);
  return out;
}

async function build(lang: string, spin: number): Promise<Explore> {
  const picks = discoverFor(lang);
  const random = seeded(hashOf(`${lang}|${today()}|${spin}`));
  const styles = shuffled(picks?.styles ?? [], random);
  const style = styles[0] ?? null;
  // Three artists of the language; where none are picked by hand, three more styles instead.
  const sources = picks?.artists.length ? shuffled(picks.artists, random).slice(0, 3).map((a) => ({ term: a.name, byArtist: true })) : styles.slice(1, 4).map(([, term]) => ({ term, byArtist: false }));
  const [found, inStyle] = await Promise.all([
    Promise.all(sources.map((s) => searchSongs(lang, s.term, { limit: 12, byArtist: s.byArtist }).catch(() => [] as SongHit[]))),
    style ? searchSongs(lang, style[1], { limit: 20 }).catch(() => [] as SongHit[]) : Promise.resolve([] as SongHit[]),
  ]);
  const finds = interleave(
    found.map((list) => shuffled(list, random).slice(0, 5)),
    12,
  );
  const seen = new Set(finds.map((h) => h.itunesId));
  const styleSongs = shuffled(
    inStyle.filter((h) => !seen.has(h.itunesId)),
    random,
  ).slice(0, 12);
  return { finds, style: style && styleSongs.length ? { name: style[0], songs: styleSongs } : null };
}

interface Kept extends Explore {
  day: string;
  spin: number;
}

const read = (lang: string): Kept | null => {
  try {
    const kept = JSON.parse(localStorage.getItem(keyOf(lang)) ?? 'null') as Kept | null;
    return kept?.day === today() ? kept : null;
  } catch {
    return null;
  }
};

/** Today's songs to explore in the language, and a way to shuffle them. */
export function useExplore(lang: string): { explore: Explore | null; loading: boolean; failed: boolean; shuffle: () => void } {
  const [kept, setKept] = useState<Kept | null>(() => read(lang));
  const [spin, setSpin] = useState<number>(() => read(lang)?.spin ?? 0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const cached = read(lang);
    if (cached && cached.spin === spin) return setKept(cached);
    let alive = true;
    setFailed(false);
    build(lang, spin)
      .then((explore) => {
        if (!alive) return;
        if (!explore.finds.length && !explore.style) return setFailed(true);
        const next = { ...explore, day: today(), spin };
        setKept(next);
        try {
          localStorage.setItem(keyOf(lang), JSON.stringify(next));
        } catch {
          // Full or private: today's songs are fetched again next time.
        }
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [lang, spin]);

  return { explore: kept, loading: !failed && kept?.spin !== spin, failed, shuffle: () => setSpin((n) => n + 1) };
}
