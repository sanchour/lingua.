// The song the room is playing, as the player tells it: the now-playing bar reads it while the
// learner browses, and leaving the room keeps the song's place for when it opens again.
import { create } from 'zustand';
import type { Song } from '@/data/types';
import type { SongClock } from '../player/clocks';

interface NowPlaying {
  /** The song open in the room's player (shown or folded away). */
  song: Song | null;
  /** The clock of the source it plays from (null when it has no way to play here). */
  clock: SongClock | null;
  set: (song: Song | null, clock: SongClock | null) => void;
}

export const useCantusNow = create<NowPlaying>((set) => ({
  song: null,
  clock: null,
  set: (song, clock) => set({ song, clock }),
}));

const KEY = 'lingua.cantus.place';

/** The song last open and where it was, so Open Cantus carries on from there. */
export function keepPlace(songId: string, ms: number): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ songId, ms: Math.round(ms) }));
  } catch {
    // Private mode or full: the song starts from the top next time.
  }
}

export function keptPlace(): { songId: string; ms: number } | null {
  try {
    const kept = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { songId?: unknown; ms?: unknown } | null;
    return kept && typeof kept.songId === 'string' && typeof kept.ms === 'number' ? { songId: kept.songId, ms: kept.ms } : null;
  } catch {
    return null;
  }
}
