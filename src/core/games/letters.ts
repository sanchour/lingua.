// Letter games (6-21): which scripts have letters to guess, what a letter is, and the keys a keyboard of them needs.
// Hangman uses it now; anagrams, missing letters and word searches (G2) use it next.
import { getLanguage } from '@/core/lang/languages';
import type { Script } from '@/core/lang/languages';

/** Alphabets: a letter is a unit the learner can name. Syllabaries, abugidas and character scripts (Thai, Hindi, Japanese, Chinese, Korean…) are not, and say so. */
const ALPHABETIC: ReadonlySet<Script> = new Set<Script>(['Latn', 'Cyrl', 'Grek', 'Arab', 'Hebr', 'Armn', 'Geor']);

export const hasLetters = (lang: string): boolean => ALPHABETIC.has(getLanguage(lang)?.script as Script);

/** Why a language has no letter games, in the words the page says. */
export const NO_LETTERS = 'This language is not written in letters you can name one by one, so letter games are not made for it.';

const segmenters = new Map<string, Intl.Segmenter>();
/** A word as what the eye sees as one mark each (a letter with its accents is one). */
export function graphemes(text: string, lang: string): string[] {
  let seg = segmenters.get(lang);
  if (!seg) {
    try {
      seg = new Intl.Segmenter(lang, { granularity: 'grapheme' });
    } catch {
      seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    }
    segmenters.set(lang, seg);
  }
  return [...seg.segment(text.normalize('NFC'))].map((s) => s.segment);
}

// Final forms and the like are one letter to the learner.
const FOLD: Record<string, string> = { ς: 'σ', ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };

export interface LetterOptions {
  lang: string;
  /** Accents count: é and e are different letters. Off, a plain letter also fills the accented ones (Latin scripts only: in Cyrillic й is not и). */
  exact?: boolean;
}

/**
 * The key a mark counts as when guessed, or null for what is not a letter (a space, a hyphen, an apostrophe, a digit).
 * Case never counts; in Arabic and Hebrew the vowel marks do not either.
 */
export function letterKey(mark: string, { lang, exact = false }: LetterOptions): string | null {
  if (!/^\p{L}/u.test(mark)) return null;
  const script = getLanguage(lang)?.script;
  let key = mark.toLocaleLowerCase(lang);
  if (script === 'Arab' || script === 'Hebr') key = key.replace(/\p{M}/gu, '');
  else if (script === 'Latn' && !exact) key = key.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC');
  return FOLD[key] ?? key;
}

/** A word that can be played as a letter game: 3 to 14 letters (spaces, hyphens and apostrophes come free), 20 marks at most. */
export function letterWord(term: string, opts: LetterOptions): { marks: string[]; keys: Array<string | null> } | null {
  const marks = graphemes(term.trim(), opts.lang);
  const keys = marks.map((m) => letterKey(m, opts));
  const letters = keys.filter((k) => k !== null).length;
  // A mark that is neither a letter nor a plain joiner (a digit, a symbol) makes it no spelling game.
  const clean = marks.every((m, i) => keys[i] !== null || /^[\s\-'’.·]$/u.test(m));
  return clean && letters >= 3 && letters <= 14 && marks.length <= 20 ? { marks, keys } : null;
}

const range = (from: number, to: number, skip: number[] = []) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i)
    .filter((c) => !skip.includes(c))
    .map((c) => String.fromCodePoint(c));

const BASE: Partial<Record<Script, string[]>> = {
  Latn: range(0x61, 0x7a),
  Cyrl: [...range(0x430, 0x44f), 'ё'],
  Grek: range(0x3b1, 0x3c9, [0x3c2]),
  Hebr: range(0x5d0, 0x5ea, [0x5da, 0x5dd, 0x5df, 0x5e3, 0x5e5]),
  // In the alphabet's order (hamza forms first, as on a keyboard chart), not code order.
  Arab: [...'ءآأؤإئابةتثجحخدذرزسشصضطظعغفقكلمنهوىي'],
  Armn: range(0x561, 0x586),
  Geor: range(0x10d0, 0x10f0),
};

/** The keys of an on-screen keyboard: the script's letters, and any a word needs that they lack (ñ, ß, і, ї…), so every word can be solved. */
export function alphabetFor(lang: string, wordKeys: Iterable<string | null>): string[] {
  const base = BASE[getLanguage(lang)?.script as Script] ?? [];
  const extra = [...new Set([...wordKeys].filter((k): k is string => k !== null && !base.includes(k)))].sort((a, b) => a.localeCompare(b, lang));
  return [...base, ...extra];
}
