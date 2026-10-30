// Reading aids over words (6-23): the Latin-letter reading of a word in a script the learner is still
// learning, and the code points of a letter. Pure, so the reader and the letter sheet share it.
import { ROMANIZE } from './romanize';

/** Languages whose words get a transliteration over them (Mandarin, Cantonese and Japanese have readings of their own). */
export const TRANSLIT_LANGS = new Set(['ru', 'el', 'ar', 'ko', 'ka']);

/** A word's transliteration, or undefined when the scheme can't read it (Arabic without vowel marks) or it would only repeat the word. */
export function translitFor(lang: string, text: string): string | undefined {
  if (!TRANSLIT_LANGS.has(lang)) return undefined;
  const out = ROMANIZE[lang]?.(text);
  return out && out !== text.toLowerCase() ? out : undefined;
}

/** `U+0416` for each code point of a letter, so lookalikes (Latin a, Cyrillic а) can be told apart. */
export const codePoints = (s: string) => [...s].map((c) => `U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`).join(' ');
