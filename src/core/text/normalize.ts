// Relative import with extension: this module is also run by Node in scripts/lang-data.
import { STRESS_MARKED_LANGS } from '../lang/languages.ts';

const STRESS_MARKS = /[̀́]/g;
const ALL_MARKS = /\p{M}/gu;
const APOSTROPHES = /[’ʼ‘`]/g;

/**
 * Identity of a word form, used as the key for word states and dictionary lookups.
 * - NFC, locale-aware lowercase, curly apostrophes → '
 * - Russian/Ukrainian/…: combining stress marks (а́, о̀) are removed; ё stays distinct from е
 * - Greek: tonos is meaningful and kept; final sigma follows the lowercase rules
 */
export function normalizeWord(raw: string, lang: string): string {
  let s = raw.normalize('NFC').replace(APOSTROPHES, "'");
  if (STRESS_MARKED_LANGS.has(lang)) {
    // Decompose only to strip stress accents; й (и + U+0306) and ё (е + U+0308) are recomposed.
    s = s.normalize('NFD').replace(STRESS_MARKS, '').normalize('NFC');
  }
  return s.toLocaleLowerCase(lang);
}

/**
 * Accent-free fallback key, e.g. for Greek ALL-CAPS text that drops tonos (ΚΑΛΗΜΕΡΑ → καλημερα)
 * or Russian text written with е instead of ё. Only used when an exact lookup misses.
 */
export function foldKey(raw: string, lang: string): string {
  let s = normalizeWord(raw, lang).normalize('NFD').replace(ALL_MARKS, '').normalize('NFC');
  if (lang === 'el') s = s.replace(/ς/g, 'σ');
  return s;
}
