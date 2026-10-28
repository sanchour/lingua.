// An estimated level from the words a learner knows (5.2-9). Round figures, said plainly as an estimate:
// vocabulary size is only one part of a level, and published figures vary a lot between languages and studies.
import type { CefrLevel } from '@/data/types';

export const LEVEL_WORDS: Array<[CefrLevel, number]> = [
  ['A1', 500],
  ['A2', 1000],
  ['B1', 2000],
  ['B2', 4000],
  ['C1', 8000],
  ['C2', 16000],
];

export interface LevelEstimate {
  level: CefrLevel;
  /** The next level and the words still to learn for it; absent at the top. */
  next?: { level: CefrLevel; remaining: number };
  /** 0–1 of the way from this level's words to the next level's. */
  progress: number;
}

export function estimateLevel(known: number): LevelEstimate {
  let index = -1;
  for (let i = 0; i < LEVEL_WORDS.length; i++) if (known >= LEVEL_WORDS[i][1]) index = i;
  const level: CefrLevel = index < 0 ? 'A0' : LEVEL_WORDS[index][0];
  const next = LEVEL_WORDS[index + 1];
  if (!next) return { level, progress: 1 };
  const from = index < 0 ? 0 : LEVEL_WORDS[index][1];
  return { level, next: { level: next[0], remaining: next[1] - known }, progress: (known - from) / (next[1] - from) };
}
