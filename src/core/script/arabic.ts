// Arabic roots and patterns (6-23): words are a three-letter root fitted into a pattern (ك ت ب in فاعل gives كاتب, “writer”).
// The explorer shows a root's words from the dictionary (public/dict/ar-roots.json, from Wiktionary's root templates, built by
// scripts/script/roots.ts) and, for the roots below, hand-written meanings: the dictionary's etymology data is thin.

export interface RootWord {
  w: string;
  en: string;
}
/** Roots with the words they give (hand-written, vowelled). */
export const ROOTS: Record<string, { en: string; words: RootWord[] }> = {
  'ك ت ب': { en: 'writing', words: [{ w: 'كَتَبَ', en: 'he wrote' }, { w: 'كِتاب', en: 'book' }, { w: 'كاتِب', en: 'writer' }, { w: 'مَكْتَب', en: 'office, desk' }, { w: 'مَكْتَبة', en: 'library, bookshop' }, { w: 'مَكْتوب', en: 'written; a letter' }] },
  'د ر س': { en: 'studying', words: [{ w: 'دَرَسَ', en: 'he studied' }, { w: 'دَرْس', en: 'lesson' }, { w: 'مَدْرَسة', en: 'school' }, { w: 'مُدَرِّس', en: 'teacher' }, { w: 'دِراسة', en: 'study' }] },
  'ع ل م': { en: 'knowing', words: [{ w: 'عَلِمَ', en: 'he knew' }, { w: 'عِلْم', en: 'knowledge, science' }, { w: 'عالِم', en: 'scholar, scientist' }, { w: 'مُعَلِّم', en: 'teacher' }, { w: 'تَعْليم', en: 'education' }, { w: 'مَعْلوم', en: 'known' }] },
  'ج ل س': { en: 'sitting', words: [{ w: 'جَلَسَ', en: 'he sat' }, { w: 'جَلْسة', en: 'a sitting, a session' }, { w: 'مَجْلِس', en: 'council; sitting room' }] },
  'ط ب خ': { en: 'cooking', words: [{ w: 'طَبَخَ', en: 'he cooked' }, { w: 'مَطْبَخ', en: 'kitchen' }, { w: 'طَبّاخ', en: 'cook' }, { w: 'طَبْخة', en: 'a dish' }] },
  'ف ت ح': { en: 'opening', words: [{ w: 'فَتَحَ', en: 'he opened' }, { w: 'مِفْتاح', en: 'key' }, { w: 'مَفْتوح', en: 'open' }, { w: 'فَتْح', en: 'opening; conquest' }] },
  'خ ر ج': { en: 'going out', words: [{ w: 'خَرَجَ', en: 'he went out' }, { w: 'مَخْرَج', en: 'exit' }, { w: 'خارِج', en: 'outside' }, { w: 'مُخْرِج', en: 'director (of a film)' }] },
  'س ف ر': { en: 'travelling', words: [{ w: 'سافَرَ', en: 'he travelled' }, { w: 'سَفَر', en: 'journey' }, { w: 'مُسافِر', en: 'traveller' }, { w: 'سَفير', en: 'ambassador' }, { w: 'سَفارة', en: 'embassy' }] },
};

/** Patterns: ف ع ل stand for the root's three letters. */
export const PATTERNS: Array<{ pattern: string; name: string }> = [
  { pattern: 'فَعَلَ', name: 'Form I verb: he did' },
  { pattern: 'فاعِل', name: 'doer (active participle)' },
  { pattern: 'مَفْعول', name: 'done (passive participle)' },
  { pattern: 'مَفْعَل', name: 'place or time of the action' },
  { pattern: 'مَفْعَلة', name: 'place, with a feminine ending' },
  { pattern: 'فِعال', name: 'a noun of the action or its result' },
  { pattern: 'فَعَّلَ', name: 'Form II: do it intensively, or make someone do it' },
  { pattern: 'مُفَعِّل', name: 'Form II doer' },
  { pattern: 'فاعَلَ', name: 'Form III: do it with someone' },
  { pattern: 'اِسْتَفْعَلَ', name: 'Form X: ask for, consider' },
];

/** A root's letters fitted into a pattern; null when the root isn't three Arabic letters. */
export function applyPattern(root: string, pattern: string): string | null {
  const letters = root.trim().split(/\s+/);
  if (letters.length !== 3 || !letters.every((l) => /^[ء-ي]$/.test(l))) return null;
  return pattern.replace(/[فعل]/g, (c) => letters['فعل'.indexOf(c)]);
}

/** Without the short vowel marks. */
export const stripVowels = (s: string) => s.replace(/[ً-ْٰ]/g, '');

/** A scholarly transliteration (ā, ḥ, ʿ) in plain letters: macrons and dots dropped, ʿ and ʾ as an apostrophe. */
export const simpleTranslit = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ʿʾ]/g, "'").normalize('NFC');

type Row = [word: string, pos: string, gloss: string, rank: number];
let dictRoots: Promise<Record<string, Row[]>> | undefined;
/** Roots from the dictionary, fetched the first time the explorer opens (44 kB). */
export function loadDictRoots(): Promise<Record<string, Row[]>> {
  dictRoots ??= fetch(`${import.meta.env.BASE_URL}dict/ar-roots.json`).then((r) => {
    if (!r.ok) throw new Error('Roots are not available');
    return r.json() as Promise<Record<string, Row[]>>;
  });
  dictRoots.catch(() => (dictRoots = undefined));
  return dictRoots;
}
