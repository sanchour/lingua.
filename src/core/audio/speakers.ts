// Who says each line (6-9): the model's answer, one label per line, put on the cues. A wrong count or a stray answer changes nothing.
import type { Cue } from '@/data/types';

export const MAX_SPEAKER_LINES = 300;

/** The cues with their speakers, or null when the answer does not fit: one short label per line, at most four different. */
export function applySpeakers(cues: readonly Cue[], answer: unknown): Cue[] | null {
  const labels = (answer as { speakers?: unknown } | null)?.speakers;
  if (!Array.isArray(labels) || labels.length !== cues.length) return null;
  const clean = labels.map((l) => (typeof l === 'string' ? l.trim().slice(0, 12) : ''));
  if (clean.some((l) => !l) || new Set(clean).size > 4) return null;
  return cues.map((c, i) => ({ ...c, speaker: clean[i] }));
}

/** Where the speaker changes: only these lines show a label. */
export const speakerChanges = (cues: readonly Cue[]): boolean[] => cues.map((c, i) => Boolean(c.speaker) && c.speaker !== cues[i - 1]?.speaker);
