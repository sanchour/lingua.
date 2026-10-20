// The sleep timer's decisions, kept apart from the player so they can be tested: when it is due,
// how loud its last seconds play, and which chapter is playing.
import type { AudioChapter } from '@/data/types';
import { cueIndexAt } from './cues';

/** A running sleep timer: until a moment (`Date.now()` time), the end of a chapter, or the end of the part. */
export type SleepTimer = { mode: 'minutes'; endsAt: number } | { mode: 'chapter'; chapter: number } | { mode: 'part' };

/** What the listener picks. */
export type SleepChoice = { minutes: number } | 'chapter' | 'part';

export interface SleepContext {
  now: number;
  positionMs: number;
  chapters?: readonly AudioChapter[];
  /** The part has just played to its end. */
  ended?: boolean;
}

/** A timer in minutes fades out over this long, so it doesn't cut off mid-word. */
export const SLEEP_FADE_MS = 8000;

/** The chapter playing at `ms`: -1 before the first one, or when the item has none. */
export function chapterAt(chapters: readonly AudioChapter[] | undefined, ms: number): number {
  return chapters?.length ? cueIndexAt(chapters, ms) : -1;
}

/** The timer for a choice made now. Without chapters, the end of the chapter is the end of the part. */
export function startSleep(choice: SleepChoice, { now, positionMs, chapters }: SleepContext): SleepTimer {
  if (choice === 'part' || (choice === 'chapter' && !chapters?.length)) return { mode: 'part' };
  if (choice === 'chapter') return { mode: 'chapter', chapter: chapterAt(chapters, positionMs) };
  return { mode: 'minutes', endsAt: now + Math.max(0, choice.minutes) * 60_000 };
}

/** Whether the timer stops playback now. */
export function sleepDue(sleep: SleepTimer | null, { now, positionMs, chapters, ended }: SleepContext): boolean {
  if (!sleep) return false;
  if (sleep.mode === 'minutes') return now >= sleep.endsAt;
  // The part's end is also the end of its last chapter.
  if (ended) return true;
  if (sleep.mode === 'part') return false;
  const next = chapters?.[sleep.chapter + 1];
  return Boolean(next && positionMs >= next.startMs);
}

/** After a jump, "end of chapter" means the chapter the playhead landed in. */
export function sleepAfterSeek(sleep: SleepTimer | null, positionMs: number, chapters?: readonly AudioChapter[]): SleepTimer | null {
  if (sleep?.mode !== 'chapter') return sleep;
  const chapter = chapterAt(chapters, positionMs);
  return chapter === sleep.chapter ? sleep : { mode: 'chapter', chapter };
}

/**
 * How loud a timer in minutes plays now: full until its last seconds, then down to silence at
 * `endsAt`. Squared, so the fade sounds even (the ear hears loudness on a log scale).
 */
export function fadeVolume(endsAt: number, now: number): number {
  const left = (endsAt - now) / SLEEP_FADE_MS;
  if (left >= 1) return 1;
  if (left <= 0) return 0;
  return left * left;
}
