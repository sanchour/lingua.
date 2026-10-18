// Relative import with extension: this module is also run by Node in scripts/lang-data.
import { STRESS_MARKED_LANGS } from '../lang/languages.ts';

const STRESS_MARKS = /[̀́]/g;
const ALL_MARKS = /\p{M}/gu;
const APOSTROPHES = /[’ʼʻ‘`]/g;
/** Arabic short vowels, shadda, sukun, Quranic marks and the tatweel: dictionaries write them, everyday text doesn't. */
const ARABIC_MARKS = /[ً-ٰٟۖ-ۭـ]/g;
/** Latin dictionaries mark long and short vowels (amō, Rōma); texts mostly don't. */
const QUANTITY_MARKS = /[̄̆]/g;
/** Serbian Cyrillic letters in Latin (Gaj's alphabet). */
const SH_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ђ: 'đ', е: 'e', ж: 'ž', з: 'z', и: 'i', ј: 'j', к: 'k', л: 'l', љ: 'lj', м: 'm', н: 'n',
  њ: 'nj', о: 'o', п: 'p', р: 'r', с: 's', т: 't', ћ: 'ć', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'č', џ: 'dž', ш: 'š',
};
/** Serbo-Croatian tone and length marks on a vowel (or syllabic r): grave, acute, macron, double grave, inverted breve. */
const SH_TONES = /([aeiour])[̀́̄̏̑]+/g;

/**
 * Identity of a word form, used as the key for word states and dictionary lookups.
 * - NFC, locale-aware lowercase, curly apostrophes (and Uzbek's ʻ in oʻ, gʻ) → '
 * - Russian/Ukrainian/…: combining stress marks (а́, о̀) are removed; ё stays distinct from е
 * - Greek: tonos is meaningful and kept; final sigma follows the lowercase rules
 * - Arabic: vowel marks and the tatweel are removed (كَتَبَ → كتب)
 * - Latin: macrons and breves are removed (amō → amo)
 */
export function normalizeWord(raw: string, lang: string): string {
  let s = raw.normalize('NFC').replace(APOSTROPHES, "'");
  if (STRESS_MARKED_LANGS.has(lang)) {
    // Decompose only to strip stress accents; й (и + U+0306) and ё (е + U+0308) are recomposed.
    s = s.normalize('NFD').replace(STRESS_MARKS, '').normalize('NFC');
  } else if (lang === 'ar') {
    s = s.replace(ARABIC_MARKS, '');
  } else if (lang === 'la') {
    s = s.normalize('NFD').replace(QUANTITY_MARKS, '').normalize('NFC');
  } else if (lang === 'sh') {
    // One pack for both scripts: Cyrillic becomes Latin (кућа → kuća), and the tone marks
    // dictionaries put on vowels go (kùća → kuća), while ć, č, š, ž and đ stay.
    s = s
      .toLowerCase()
      .replace(/[а-шђјљњћџ]/g, (c) => SH_LATIN[c] ?? c)
      .normalize('NFD')
      .replace(SH_TONES, '$1')
      .normalize('NFC');
  }
  return s.toLocaleLowerCase(lang);
}

/**
 * Accent-free fallback key, e.g. for Greek ALL-CAPS text that drops tonos (ΚΑΛΗΜΕΡΑ → καλημερα),
 * Russian text written with е instead of ё, or Arabic written with a bare alef for أ or إ. Only
 * used when an exact lookup misses.
 */
export function foldKey(raw: string, lang: string): string {
  if (lang === 'ar') {
    // Hamza seats and the final yā' are written loosely: أ إ آ ٱ → ا, ى → ي.
    return normalizeWord(raw, lang).replace(/[آأإٱ]/g, 'ا').replace(/ى/g, 'ي');
  }
  // Japanese and Korean keep their marks: dakuten (が) and Hangul jamo are letters of their own.
  if (lang === 'ja' || lang === 'ko') return normalizeWord(raw, lang);
  let s = normalizeWord(raw, lang).normalize('NFD').replace(ALL_MARKS, '').normalize('NFC');
  if (lang === 'el') s = s.replace(/ς/g, 'σ');
  return s;
}
