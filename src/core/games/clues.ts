// Guess from clues (6-21, F0189 and F1197): clues come one at a time, hardest first; the fewer needed, the more stars. Pure.
import { checkAnswer } from '@/core/srs/answer';
import { MAX_STARS, hideIn } from './hangman';
import { graphemes, hasLetters } from './letters';
import type { GameItem } from './source';

export type ClueKind = 'example' | 'synonyms' | 'antonyms' | 'picture' | 'length' | 'first' | 'meaning';

export interface Clue {
  kind: ClueKind;
  text?: string;
  /** A letter or word of the language, shown inside the text (kept apart so right-to-left letters do not scramble it). */
  value?: string;
  image?: string;
}

/** The clues a word has, in the order they are given. A word always has three: how long it is, how it starts, what it means. */
export function cluesOf(item: GameItem, lang: string): Clue[] {
  const marks = graphemes(item.term.trim(), lang).filter((m) => /\p{L}/u.test(m));
  const same = (w: string) => w.toLocaleLowerCase(lang) !== item.term.toLocaleLowerCase(lang);
  const example = item.example ? hideIn(item.example, item.term, lang) : null;
  const syn = item.synonyms.filter(same).slice(0, 3);
  const ant = item.antonyms.filter(same).slice(0, 3);
  return [
    ...(example ? [{ kind: 'example' as const, text: example }] : []),
    ...(syn.length ? [{ kind: 'synonyms' as const, text: syn.join(', ') }] : []),
    ...(ant.length ? [{ kind: 'antonyms' as const, text: ant.join(', ') }] : []),
    ...(item.image ? [{ kind: 'picture' as const, image: item.image }] : []),
    { kind: 'length', text: `${marks.length} ${hasLetters(lang) ? 'letters' : 'characters'}` },
    { kind: 'first', text: 'Starts with', value: marks[0] ?? '' },
    { kind: 'meaning', text: item.meaning ?? '' },
  ];
}

export interface ClueState {
  clues: Clue[];
  shown: number;
  /** What was guessed and was not it. */
  guesses: string[];
  status: 'playing' | 'won' | 'lost';
}

export const startClues = (item: GameItem, lang: string): ClueState => ({ clues: cluesOf(item, lang), shown: 1, guesses: [], status: 'playing' });

/** Another clue, asked for. */
export const another = (s: ClueState): ClueState => (s.status === 'playing' && s.shown < s.clues.length ? { ...s, shown: s.shown + 1 } : s);

/** A guess. Right wins; a missing accent is accepted, a one-letter slip is not (pato is a word of its own). Wrong gives the next clue, and after the last clue loses. */
export function guess(s: ClueState, typed: string, term: string, lang: string): ClueState {
  if (s.status !== 'playing' || !typed.trim()) return s;
  const check = checkAnswer(typed, term, lang);
  if (check.verdict === 'exact' || (check.verdict === 'close' && check.note === 'accent')) return { ...s, status: 'won' };
  const guesses = [...s.guesses, typed.trim()];
  return s.shown < s.clues.length ? { ...s, guesses, shown: s.shown + 1 } : { ...s, guesses, status: 'lost' };
}

export const giveUp = (s: ClueState): ClueState => (s.status === 'playing' ? { ...s, status: 'lost' } : s);

/** Three stars with two clues or fewer, two with three or four, one after that. */
export const starsOf = (s: ClueState): number => (s.status !== 'won' ? 0 : s.shown <= 2 ? MAX_STARS : s.shown <= 4 ? 2 : 1);
