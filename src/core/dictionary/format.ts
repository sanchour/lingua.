// The full dictionary (4.0-2) for the six core languages: built from open data by
// scripts/lang-data/dictionary.ts, served as public/dict/<lang>.v<N>.json.gz, downloaded once per
// language and kept on the device (the `fullDict` table). Inflection tables stay in the language
// pack (dictParadigms), which every language already has.

/** 3: syllables, stress, homophones, cognates, the parts a word is made of and where it comes from (6-1b). */
/** 2: definitions from the language's own Wiktionary, and Tatoeba's sentences (4.0-2, second pass). */
export const DICT_VERSION = 3;
export const DICT_LANGS = ['es', 'ru', 'zh', 'fr', 'de', 'ar'] as const;
export const dictFileName = (lang: string) => `${lang}.v${DICT_VERSION}.json.gz`;
export const hasFullDictionary = (lang: string) => (DICT_LANGS as readonly string[]).includes(lang);

/** One meaning. `tags` are Wiktionary's labels (formal, slang, regional, …). */
export interface FullSense {
  g: string[];
  tags?: string[];
  /** Examples: the sentence, its translation, and where the word is in it. */
  ex?: Array<[text: string, translation?: string, start?: number, end?: number]>;
  syn?: string[];
  ant?: string[];
}

/** One part of speech of a headword (a word can be a noun and a verb, or two words spelt alike). */
export interface FullEntry {
  pos: string;
  /** The headword with its marks (stress in Russian, the article in German, …) when they differ. */
  head?: string;
  /** IPA, or pinyin with tones for Mandarin. */
  ipa?: string[];
  /** A recording on Wikimedia Commons. */
  audio?: string;
  gender?: string;
  /** The other half of a pair: the perfective of an imperfective verb, the feminine of a noun. */
  pair?: Array<[label: string, word: string]>;
  senses: FullSense[];
  /** Set phrases and collocations with this word, with their meaning when Wiktionary gives one. */
  phrases?: Array<[phrase: string, gloss?: string]>;
  derived?: string[];
  related?: string[];
  syn?: string[];
  ant?: string[];
  ety?: string;
  /** Syllables, from Wiktionary's hyphenation points (v3); they spell the headword. */
  syl?: string[];
  /** Index into `syl` of the stressed syllable, where the headword is written with its stress mark (Russian). */
  stress?: number;
  /** Words that sound the same (v3). */
  hom?: string[];
  /** The same word in other languages, as Wiktionary's etymology lists them: [language code, word] (v3). */
  cog?: Array<[lang: string, word: string]>;
  /** What a compound or derived word is made of, as Wiktionary writes it: `des-`, `hacer`, `-ia` (v3). */
  parts?: string[];
  /** The word it was inherited, borrowed or derived from, in another language: [language code, word] (v3). */
  root?: [lang: string, word: string];
}

export interface FullDictFile {
  format: 'lingua-dict';
  version: number;
  lang: string;
  builtAt: string;
  sources: string[];
  /**
   * Lemma → its entries; `r` is the lemma's frequency rank, `c` words easily confused with it, `m`
   * definitions in the language itself (its own Wiktionary), `t` Tatoeba sentences with the word.
   */
  words: Array<{ w: string; r?: number; c?: string[]; e: FullEntry[]; m?: MonoDefinitions[]; t?: TatoebaSentence[] }>;
}

/** A row on the device: one headword. */
export interface FullDictRow {
  lang: string;
  /** The headword as the pack keys its lemmas (normalizeWord). */
  key: string;
  /** Accent-free, for the search box (foldKey). */
  fold: string;
  word: string;
  rank?: number;
  confused?: string[];
  entries: FullEntry[];
  mono?: MonoDefinitions[];
  tatoeba?: TatoebaSentence[];
}

/** Definitions written in the language itself, as its own Wiktionary gives them (the 30,000 most common words). */
export interface MonoDefinitions {
  pos: string;
  defs: string[];
}

/** A Tatoeba sentence with its English translation, and where the word is in it. */
export type TatoebaSentence = [text: string, translation: string, start: number, end: number];
