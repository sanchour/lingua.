// Timing helpers for transcripts: which cue is playing, and clock labels.
import type { Cue } from '@/data/types';

/**
 * The cue playing at `ms`: the last one that has started. Between two cues the earlier one stays
 * current (so a highlight doesn't flicker off during pauses). -1 before the first cue. Works the
 * same for an audiobook's chapters.
 */
export function cueIndexAt(cues: ReadonlyArray<Pick<Cue, 'startMs'>>, ms: number): number {
  let lo = 0;
  let hi = cues.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].startMs <= ms) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

/** 65_000 → "1:05"; 3_723_000 → "1:02:03". */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** "1 h 5 min", "12 min", "45 s" — for durations in lists. */
export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (ms < 60_000) return `${Math.round(ms / 1000)} s`;
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}`;
}

/**
 * Start times for the words of a cue, by character offset. Uses the cue's own word timings when it
 * has them (Whisper, karaoke VTT), matched in order; otherwise spreads the cue's time over its text,
 * so a highlight can still move through the sentence.
 */
export function wordStarts(cue: Cue, words: ReadonlyArray<{ offset: number; text: string }>): number[] {
  const span = Math.max(1, cue.endMs - cue.startMs);
  const length = Math.max(1, cue.text.length);
  const byLength = words.map((w) => cue.startMs + (w.offset / length) * span);
  if (!cue.words?.length) return byLength;

  const fold = (s: string) => s.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const timed = cue.words.map((w) => ({ key: fold(w.w), start: w.startMs }));
  let j = 0;
  return words.map((w, i) => {
    const key = fold(w.text);
    // Look a few timed words ahead for this word; tokenisers and Whisper split a little differently.
    for (let k = j; k < Math.min(timed.length, j + 4); k++) {
      if (timed[k].key && (timed[k].key === key || timed[k].key.startsWith(key) || key.startsWith(timed[k].key))) {
        j = k + 1;
        return timed[k].start;
      }
    }
    return byLength[i];
  });
}
