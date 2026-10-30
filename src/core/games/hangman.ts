// Hangman-style spelling (6-21, F0172 and F1196): the word is hidden behind its letters and the learner names them. Pure: a state
// goes in, a state comes out, so the screen only draws it.
import { letterWord } from './letters';
import type { LetterOptions } from './letters';

export const MAX_MISTAKES = 6;
export const MAX_HINTS = 2;
/** What a word earns at best: three stars, a hint costs one, so does a long struggle. */
export const MAX_STARS = 3;

export interface HangmanState {
  marks: string[];
  /** The key each mark counts as; null where it is no letter (shown from the start). */
  keys: Array<string | null>;
  guessed: string[];
  wrong: string[];
  hints: number;
  status: 'playing' | 'won' | 'lost';
}

/** Null when the term cannot be a hangman word (see `letterWord`). */
export function startHangman(term: string, opts: LetterOptions): HangmanState | null {
  const word = letterWord(term, opts);
  return word ? { ...word, guessed: [], wrong: [], hints: 0, status: 'playing' } : null;
}

export const isShown = (s: HangmanState, i: number): boolean => s.keys[i] === null || s.guessed.includes(s.keys[i]!) || s.status === 'lost';

const settle = (s: HangmanState): HangmanState => {
  if (s.keys.every((k) => k === null || s.guessed.includes(k))) return { ...s, status: 'won' };
  return s.wrong.length >= MAX_MISTAKES ? { ...s, status: 'lost' } : s;
};

/** Names a letter. Naming one twice, or after the end, changes nothing. */
export function guess(s: HangmanState, key: string): HangmanState {
  if (s.status !== 'playing' || s.guessed.includes(key) || s.wrong.includes(key)) return s;
  return settle(s.keys.includes(key) ? { ...s, guessed: [...s.guessed, key] } : { ...s, wrong: [...s.wrong, key] });
}

/** Shows one letter that is still hidden. At most `MAX_HINTS` a word. */
export function hint(s: HangmanState, random: () => number): HangmanState {
  if (s.status !== 'playing' || s.hints >= MAX_HINTS) return s;
  const hidden = [...new Set(s.keys.filter((k): k is string => k !== null && !s.guessed.includes(k)))];
  if (!hidden.length) return s;
  const key = hidden[Math.floor(random() * hidden.length)];
  return settle({ ...s, guessed: [...s.guessed, key], hints: s.hints + 1 });
}

/** 0 for a word lost; otherwise 3, less one for each hint and one if it took three or more wrong letters; never less than 1. */
export function starsOf(s: HangmanState): number {
  if (s.status !== 'won') return 0;
  return Math.max(1, MAX_STARS - s.hints - (s.wrong.length >= 3 ? 1 : 0));
}

/** The word's example sentence with the word hidden, for the second clue. Null when the word is not in it. */
export function hideIn(sentence: string, term: string, lang: string): string | null {
  const at = sentence.toLocaleLowerCase(lang).indexOf(term.toLocaleLowerCase(lang));
  return at < 0 ? null : `${sentence.slice(0, at)}${'_'.repeat(Math.min(term.length, 8))}${sentence.slice(at + term.length)}`;
}
