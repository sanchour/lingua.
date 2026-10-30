// Anagrams (6-21, F0173 and F1195): the letters of a word, mixed; the learner puts them back in order. Pure, like hangman.
import { MAX_HINTS, MAX_STARS } from './hangman';
import { letterWord } from './letters';
import type { LetterOptions } from './letters';

export const MAX_WRONG = 3;

export interface AnagramState {
  marks: string[];
  keys: Array<string | null>;
  /** The letters, mixed, and what each counts as. */
  tiles: string[];
  tileKeys: string[];
  /** Tile numbers in the order the learner put them. */
  placed: number[];
  /** Full tries that were not the word. */
  wrong: number;
  hints: number;
  status: 'playing' | 'won' | 'lost';
}

/** Null when the word cannot be mixed into something else (all one letter) or is no letter word. */
export function startAnagram(term: string, opts: LetterOptions, random: () => number): AnagramState | null {
  const word = letterWord(term, opts);
  if (!word) return null;
  const letters = word.marks.filter((_, i) => word.keys[i] !== null);
  const keys = word.keys.filter((k): k is string => k !== null);
  for (let attempt = 0; attempt < 30; attempt++) {
    const order = letters.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (order.every((o, i) => keys[o] === keys[i])) continue;
    return { ...word, tiles: order.map((o) => letters[o]), tileKeys: order.map((o) => keys[o]), placed: [], wrong: 0, hints: 0, status: 'playing' };
  }
  return null;
}

const wordKeys = (s: AnagramState) => s.keys.filter((k): k is string => k !== null);

/** Puts a tile next. When all are placed the try is judged: right wins, wrong clears the tiles and counts, the third wrong loses. */
export function place(s: AnagramState, tile: number): AnagramState {
  if (s.status !== 'playing' || s.placed.includes(tile) || tile < 0 || tile >= s.tiles.length) return s;
  const placed = [...s.placed, tile];
  if (placed.length < s.tiles.length) return { ...s, placed };
  const want = wordKeys(s);
  if (placed.every((t, i) => s.tileKeys[t] === want[i])) return { ...s, placed, status: 'won' };
  const wrong = s.wrong + 1;
  return { ...s, placed: [], wrong, status: wrong >= MAX_WRONG ? 'lost' : 'playing' };
}

/** Takes the last tile back. */
export const unplace = (s: AnagramState): AnagramState => (s.status === 'playing' && s.placed.length ? { ...s, placed: s.placed.slice(0, -1) } : s);

/** A typed letter: the first tile not yet placed that is that letter. */
export function placeKey(s: AnagramState, key: string): AnagramState {
  const tile = s.tileKeys.findIndex((k, i) => k === key && !s.placed.includes(i));
  return tile < 0 ? s : place(s, tile);
}

/** Puts right whatever is wrong so far and places the next letter. */
export function hint(s: AnagramState): AnagramState {
  if (s.status !== 'playing' || s.hints >= MAX_HINTS) return s;
  const want = wordKeys(s);
  let good = 0;
  while (good < s.placed.length && s.tileKeys[s.placed[good]] === want[good]) good++;
  const base = { ...s, placed: s.placed.slice(0, good), hints: s.hints + 1 };
  const tile = s.tileKeys.findIndex((k, i) => k === want[good] && !base.placed.includes(i));
  return tile < 0 ? s : place(base, tile);
}

/** What each letter slot of the word shows now: the placed tile's mark, or null while empty. */
export function slotsOf(s: AnagramState): Array<string | null> {
  let n = 0;
  return s.marks.map((m, i) => (s.keys[i] === null ? m : s.status === 'lost' ? m : s.placed[n] !== undefined ? s.tiles[s.placed[n++]] : (n++, null)));
}

export function starsOf(s: AnagramState): number {
  return s.status !== 'won' ? 0 : Math.max(1, MAX_STARS - s.hints - (s.wrong >= 2 ? 1 : 0));
}
