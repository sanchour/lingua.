// The on-disk language-pack format, shared by the builder (scripts/lang-data, Node) and the
// installer (workers/packs.worker.ts).

export const PACK_FORMAT = 1;
/** Bump when packs are rebuilt with better data; installed packs older than this are refreshed. */
export const PACK_VERSION = 6;

/** [lemma key, display headword or "", ipa or "", gender or "", senses] */
export type PackLemma = [string, string, string, string, PackSense[]];
/** [part of speech, glosses] */
export type PackSense = [string, string[]];
/** [form key, lemma indexes, short gloss, form description or ""] */
export type PackForm = [string, number[], string, string];
/** [lemma index, sentence, English translation or "", cloze start, cloze end] — the span is the lemma's form in the sentence. */
export type PackExample = [number, string, string, number, number];
/** A themed starter word: [term as written, meaning, part of speech, gender (m/f/n/c) or ""] */
export type PackThemeItem = [string, string, string, string];
/** An inflection table: [lemma index, part of speech, rows of [form as written, index into tagSets]]. */
export type PackParadigm = [number, string, Array<[string, number]>];

export interface PackFile {
  format: number;
  lang: string;
  /** Language of the glosses. */
  gloss: string;
  version: number;
  builtAt: string;
  source: string;
  /** Normalised word forms by frequency (index 0 = rank 1). */
  freq: string[];
  lemmas: PackLemma[];
  forms: PackForm[];
  /** Since v2: lemma indexes by frequency (all their forms counted together), for the Top-N decks. */
  lemmaFreq?: number[];
  /** Since v2: short usage examples for frequent lemmas (from Wiktionary). */
  examples?: PackExample[];
  /** Since v2: themed starter lists, theme id → words (see core/lang/starter.ts). */
  themes?: Record<string, PackThemeItem[]>;
  /** Since v6: inflection tables for frequent lemmas, and the tag sets they refer to ("first-person present singular"). */
  paradigms?: PackParadigm[];
  tagSets?: string[];
}

export const packId = (lang: string, gloss = 'en') => `${lang}-${gloss}`;
export const packFileName = (lang: string, version = PACK_VERSION) => `${lang}.v${version}.json.gz`;
