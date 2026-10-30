import { cueIndexAt } from '@/core/audio/cues';
import type { Cue } from '@/data/types';

/** Previous line: back to the start of this one when you're a little way into it, else the one before. */
export function previousLineStart(cues: readonly Cue[], ms: number): number | null {
  const i = cueIndexAt(cues, ms);
  if (i < 0) return cues.length ? 0 : null;
  const into = ms - cues[i].startMs;
  return (into > 1200 || i === 0 ? cues[i] : cues[i - 1]).startMs;
}

export function nextLineStart(cues: readonly Cue[], ms: number): number | null {
  const i = cueIndexAt(cues, ms);
  return cues[i + 1]?.startMs ?? null;
}

/** The English line that overlaps a target line the most (subtitle tracks rarely share timings). */
export function matchingLine(native: readonly Cue[] | null | undefined, cue: Cue): Cue | undefined {
  if (!native?.length) return undefined;
  let best: Cue | undefined;
  let bestOverlap = 0;
  let i = Math.max(0, cueIndexAt(native, cue.startMs) - 1);
  for (; i < native.length && native[i].startMs < cue.endMs; i++) {
    const overlap = Math.min(cue.endMs, native[i].endMs) - Math.max(cue.startMs, native[i].startMs);
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = native[i];
    }
  }
  return best;
}

/** "Less help each time" (6-9): the English line shown, then blurred, then only after the line, then hidden, one step per full watch. */
export const adaptiveMode = (watches: number) => (['show', 'blur', 'after', 'hide'] as const)[Math.max(0, Math.min(3, watches))];

/** Time heard so far, in seconds of video: a step between two checks counts only when it is a short, forward one, so a seek is not a watch. */
export const heardMore = (heard: number, last: number, now: number) => (now - last > 0 && now - last < 2 ? heard + (now - last) : heard);

/** A watch counts when this share of the video was heard in order. */
export const FULL_WATCH = 0.8;

/** A line stays up a moment after it ends, so short ones can still be read. */
const LINGER_MS = 350;

/** The line on screen at `ms` (-1 between lines). */
export function lineAt(cues: readonly Cue[], ms: number): number {
  const i = cueIndexAt(cues, ms);
  return i >= 0 && ms <= cues[i].endMs + LINGER_MS ? i : -1;
}
