// Ratio's two small summaries that need no database: listening time by what was listened to, and how typing practice stands.
import type { ActivitySession, Media, TypingRow } from '@/data/types';
import { wpmOf } from '@/core/typing/lesson';

export type ListeningKind = 'songs' | 'podcasts' | 'audiobooks' | 'courses' | 'video' | 'other';
export const LISTENING_KINDS: ListeningKind[] = ['songs', 'podcasts', 'audiobooks', 'courses', 'video', 'other'];
export const LISTENING_KIND_LABEL: Record<ListeningKind, string> = { songs: 'Songs', podcasts: 'Podcasts', audiobooks: 'Audiobooks', courses: 'Audio courses', video: 'Video', other: 'Other audio' };

/** What a piece of media is, for the listening breakdown. */
export function kindOfMedia(media: Media | undefined): ListeningKind {
  if (!media) return 'other';
  if (media.kind === 'video') return 'video';
  if (media.bookKind === 'audiobook') return 'audiobooks';
  if (media.bookKind === 'course') return 'courses';
  if (media.feedId || media.guid || media.spotify?.type === 'episode' || media.spotify?.type === 'show') return 'podcasts';
  return 'other';
}

/** Minutes per kind from listen, sing and watch sessions; kinds with no time are left out. */
export function listeningByKind(sessions: ActivitySession[], media: Map<string, Media>): Array<{ kind: ListeningKind; minutes: number }> {
  const total = new Map<ListeningKind, number>();
  for (const s of sessions) {
    if (s.type !== 'listen' && s.type !== 'sing' && s.type !== 'watch') continue;
    const kind: ListeningKind = s.type === 'sing' ? 'songs' : s.type === 'watch' ? 'video' : kindOfMedia(s.refId ? media.get(s.refId) : undefined);
    total.set(kind, (total.get(kind) ?? 0) + s.activeMs / 60_000);
  }
  return LISTENING_KINDS.filter((k) => (total.get(k) ?? 0) > 0).map((kind) => ({ kind, minutes: total.get(kind)! }));
}

/** Look-ups per 1,000 words read, or null before enough has been read to say. */
export const lookupsPer1000 = (lookups: number, words: number): number | null => (words >= 500 ? Math.round((lookups / words) * 1000) : null);

export interface TypingSummary {
  /** The slowest letter's speed among those practised, which is what the course asks to raise. */
  wpm: number | null;
  /** Average speed over every letter practised. */
  averageWpm: number | null;
  accuracy: number | null;
  unlocked: number;
  target: number;
}

export function typingSummary(row: TypingRow | undefined): TypingSummary | null {
  if (!row) return null;
  const stats = Object.values(row.stats).filter((s) => s.hits >= 5 && s.ms > 0);
  if (!stats.length) return null;
  const speeds = stats.map((s) => wpmOf(s.ms));
  const hits = stats.reduce((n, s) => n + s.hits, 0);
  const misses = stats.reduce((n, s) => n + s.misses, 0);
  return {
    wpm: Math.round(Math.min(...speeds)),
    averageWpm: Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length),
    accuracy: hits + misses > 0 ? hits / (hits + misses) : null,
    unlocked: row.unlocked,
    target: row.target,
  };
}
