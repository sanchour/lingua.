// Lingua 6 contract: the word record (6-1), plus the fields 6-2 and 6-3 add to words, decks, notes and cards.
// Types only: nothing in the app imports this yet. When a step builds its part, it adds exactly these fields to
// `src/data/types.ts` (the schema of record), and this file then stays as the page that says what they mean.
// Every new field is optional, and the way an old record reads (its default) is written beside it: an old record is
// never rewritten just to fill a field in.
import type { Bit, Lang } from '@/data/types';

// ── 6-1: the learner's half (Word) ──────────────────────────────────────────

/** Where a met word waits (6-2's inbox). Absent means 'kept': every word that exists before 6-2 stays where it is. */
export type InboxState = 'new' | 'kept' | 'ignored';

/** Fields `Word` gains in 6-1 (tags, favourite, important) and 6-2 (inbox). */
export interface WordV6 {
  /** The learner's own labels. Absent reads as []. Not the same as `Note.tags` (a card's tags). */
  tags?: string[];
  /** Absent reads as 0. Indexed (see db.ts), so a 0 | 1, not a boolean. */
  favourite?: Bit;
  important?: Bit;
  /** 6-2. Absent reads as 'kept'. */
  inbox?: InboxState;
  /** Grammar topics this word links to ("Why this form?" made general): Grammatica topic ids. Absent reads as []. */
  grammarTopics?: string[];
  /** Other words linked by the learner, as `${lang}:${norm}` word ids. Absent reads as []. */
  relatedWordIds?: string[];
}

/** What is derived and never stored on the word: first met, last reviewed, recall rate, the texts it was met in.
 *  They come from `sightings`, `cards` and `reviewLogs`, so there is one source and no copy to go stale. */
export interface WordHistory {
  firstMetAt?: number;
  lastReviewedAt?: number;
  /** Share of reviews rated 3 or 4, 0 to 1; undefined until the first review. */
  recallRate?: number;
  reviews: number;
}

// ── 6-1: the language's half (DictEntry, in the packs) ──────────────────────

/** Sense tags shown as small quiet chips, from Wiktionary's own sense tags. Absent reads as no label. */
export interface SenseLabels {
  /** formal · informal · slang · colloquial · vulgar · archaic · literary … as the pack spells them. */
  register?: string[];
  /** spain · mexico · brazil · portugal · britain · america … */
  region?: string[];
  /** pejorative · endearing · humorous … */
  connotation?: string[];
}

export interface WordFamily {
  root?: string;
  stem?: string;
  prefixes?: string[];
  suffixes?: string[];
  /** Derived and related terms (lemmas). */
  derived?: string[];
  related?: string[];
  /** A compound split into its parts (German first). */
  compound?: string[];
}

/** A false friend or a cognate with one of the learner's own languages (Tabula), each pair checked by meaning. */
export interface LanguagePair {
  /** The learner's language the word is compared with. */
  lang: Lang;
  word: string;
  meaning: string;
  kind: 'falseFriend' | 'cognate';
}

/** Fields `DictEntry` gains in 6-1. They come with a new pack format version: old packs still load, and a field
 *  a pack doesn't have is simply not shown. Tier 2 packs get what Wiktionary has for them, nothing hand-made. */
export interface DictEntryV6 {
  family?: WordFamily;
  /** The headword split into syllables, e.g. ['ma', 'dre']. */
  syllables?: string[];
  /** Index into `syllables` of the stressed one. Russian's comes from Wiktionary's accents. */
  stress?: number;
  /** Words that sound or are spelled the same. */
  homophones?: string[];
  homonyms?: string[];
  countable?: boolean;
  /** An irregular form to flag. */
  irregular?: boolean;
  /** Russian aspect pair: the other aspect's lemma. */
  aspectPair?: string;
  /** Phrasal or separable verb. */
  separable?: boolean;
  /** Per sense, parallel to `senses`. */
  labels?: SenseLabels[];
  /** Synonyms, ranked by frequency (most common first). */
  synonyms?: string[];
  /** The "easily confused" words, with a one-line difference each. */
  confusable?: Array<{ lemma: string; difference?: string }>;
  pairs?: LanguagePair[];
  /** Common spelling mistakes and learner errors (hand-made for the six core languages only). */
  mistakes?: string[];
}

/** Example sentences ranked by difficulty: the mean frequency rank of their words, higher is harder. Computed when
 *  the pack is built, never at runtime. */
export interface ExampleDifficulty {
  /** Parallel to `DictExample.ex`. */
  scores: number[];
}

// ── 6-2: decks, folders and notes ───────────────────────────────────────────

/** Fields `Deck` gains in 6-2. */
export interface DeckV6 {
  coverBlobId?: string;
  /** Absent reads as 0. Archived is not "mastered": the history stays. */
  archived?: Bit;
  pinned?: Bit;
  important?: Bit;
  /** Why the deck was made, for the preview and the tidy panel: 'text' | 'book' | 'song' | 'list' | … */
  madeFrom?: { kind: string; sourceId?: string };
}

/** `Folder` already has `parentId` (nested folders exist); 6-2 only uses it. `Note` gains `order`. */
export interface NoteV6 {
  /** The card's place in a hand-sorted deck. Absent: the order they were added. */
  order?: number;
}

// ── 6-3: cards and memory ───────────────────────────────────────────────────

/** What a card shows. Absent on a note means 'word-meaning', the card that exists today. */
export type CardTemplate =
  | 'word-meaning'
  | 'sentence-gap'
  | 'definition'
  | 'picture'
  | 'sound'
  | 'paragraph'
  | 'grammar-fact'
  | 'synonym'
  | 'antonym'
  | 'collocation'
  | 'several-meanings'
  | 'related-words'
  | 'image-occlusion';

export interface NoteV6Cards {
  template?: CardTemplate;
  mnemonic?: string;
  /** Image occlusion: boxes over the picture, as fractions of its width and height. */
  occlusion?: Array<{ x: number; y: number; w: number; h: number; label?: string }>;
  /** Where a picture came from and its licence, always kept. */
  imageCredit?: { source: string; licence: string; url?: string };
}

export interface CardV6 {
  /** Hidden until this time (a buried card), epoch ms. Absent: not buried. */
  buriedUntil?: number;
  /** Failed too many times: found by the leech check. Absent reads as 0. */
  leech?: Bit;
}

export interface ReviewLogV6 {
  /** A hint was used: the answer is logged as assisted (6-5). Absent reads as 0. */
  hinted?: Bit;
  /** "I guessed" after a right answer: counts as Hard. Absent reads as 0. */
  guessed?: Bit;
  /** Where in the app it was reviewed: a text, a song, a deck's own session. */
  contextId?: string;
}
