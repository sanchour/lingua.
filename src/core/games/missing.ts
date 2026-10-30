// Missing letters (6-21, F0175): the word with some of its letters left out, to fill in. Pure.
import { MAX_HINTS, MAX_STARS } from './hangman';
import { letterWord } from './letters';
import type { LetterOptions } from './letters';

export const MAX_SLIPS = 4;

export interface MissingState {
  marks: string[];
  keys: Array<string | null>;
  /** Positions (in `marks`) left out, in order. */
  blanks: number[];
  filled: number[];
  /** The blank the next letter goes to. */
  selected: number;
  slips: number;
  hints: number;
  status: 'playing' | 'won' | 'lost';
}

/** A third of the letters, one to four, never the first of a longer word, so the start anchors it. */
export function startMissing(term: string, opts: LetterOptions, random: () => number): MissingState | null {
  const word = letterWord(term, opts);
  if (!word) return null;
  const at = word.keys.flatMap((k, i) => (k === null ? [] : [i]));
  const count = Math.min(4, Math.max(1, Math.ceil(at.length / 3)));
  const pool = at.length >= 5 ? at.slice(1) : at;
  const blanks: number[] = [];
  while (blanks.length < count) {
    const pick = pool[Math.floor(random() * pool.length)];
    if (!blanks.includes(pick)) blanks.push(pick);
  }
  blanks.sort((a, b) => a - b);
  return { ...word, blanks, filled: [], selected: blanks[0], slips: 0, hints: 0, status: 'playing' };
}

export const isShown = (s: MissingState, i: number): boolean => !s.blanks.includes(i) || s.filled.includes(i) || s.status === 'lost';

const nextBlank = (s: MissingState, after: number) => s.blanks.find((b) => b > after && !s.filled.includes(b)) ?? s.blanks.find((b) => !s.filled.includes(b));

const settle = (s: MissingState): MissingState => {
  if (s.blanks.every((b) => s.filled.includes(b))) return { ...s, status: 'won' };
  return s.slips >= MAX_SLIPS ? { ...s, status: 'lost' } : s;
};

/** Chooses which blank the next letter goes to. */
export const select = (s: MissingState, i: number): MissingState => (s.status === 'playing' && s.blanks.includes(i) && !s.filled.includes(i) ? { ...s, selected: i } : s);

/** A letter for the chosen blank: right fills it and moves on; wrong is a slip. */
export function fill(s: MissingState, key: string): MissingState {
  if (s.status !== 'playing') return s;
  if (s.keys[s.selected] !== key) return settle({ ...s, slips: s.slips + 1 });
  const filled = [...s.filled, s.selected];
  return settle({ ...s, filled, selected: nextBlank({ ...s, filled }, s.selected) ?? s.selected });
}

/** Fills the chosen blank. At most `MAX_HINTS` a word. */
export function hint(s: MissingState): MissingState {
  if (s.status !== 'playing' || s.hints >= MAX_HINTS) return s;
  const filled = [...s.filled, s.selected];
  return settle({ ...s, filled, hints: s.hints + 1, selected: nextBlank({ ...s, filled }, s.selected) ?? s.selected });
}

export const starsOf = (s: MissingState): number => (s.status !== 'won' ? 0 : Math.max(1, MAX_STARS - s.hints - (s.slips >= 2 ? 1 : 0)));
