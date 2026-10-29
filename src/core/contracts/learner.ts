// Lingua 6 contract: the learner's record (6-5). One append-only `evidence` row for every thing the learner did, so
// the tutor (6-15), what adapts (6-16), Ratio (6-17) and the exams (6-18) all ask the same table the same questions
// and agree about the weak spots. Private: on the device only, in backups, deleted with the language, exportable.
// Types only: nothing in the app imports this yet.
import type { Lang } from '@/data/types';

/** The skills Lingua 6 keeps apart. Quiet ones are found by comparing them. */
export type Skill = 'vocabulary' | 'grammar' | 'reading' | 'listening' | 'pronunciation' | 'speaking' | 'writing' | 'translating';

/** Where in the app it happened. */
export type Room = 'codex' | 'thesaurus' | 'ludus' | 'grammatica' | 'cursus' | 'sonus' | 'visio' | 'diarium' | 'sermo' | 'ratio' | 'tutor' | 'exam';

/** Diarium's categories, plus the two that come from hearing and speaking. One set across the whole app. */
export type MistakeCategory =
  | 'grammar'
  | 'spelling'
  | 'word-choice'
  | 'word-order'
  | 'agreement'
  | 'tense-aspect'
  | 'case'
  | 'punctuation'
  | 'style'
  | 'pronunciation'
  | 'mishearing';

/** What the learner worked on: a word, a grammar topic, a sound, or a sentence pattern. */
export type EvidenceItem =
  | { type: 'word'; wordId: string }
  | { type: 'grammar'; topicId: string }
  | { type: 'sound'; soundId: string }
  | { type: 'pattern'; patternId: string }
  | { type: 'text'; textId: string };

/** right · wrong · a near miss (accepted with a note) · not graded (a free answer waiting for a self-rating). */
export type Outcome = 'right' | 'close' | 'wrong' | 'ungraded';

/** One thing the learner did. Never edited; a correction is a new row. */
export interface EvidenceRow {
  /** crypto.randomUUID(). */
  id: string;
  lang: Lang;
  /** Epoch ms. */
  at: number;
  /** The local day as 'YYYY-MM-DD', for the daily summaries and for "seen on three different days". */
  day: string;
  skill: Skill;
  room: Room;
  item: EvidenceItem;
  /** The item as one string, for the index and for grouping: `word:es:casa`, `grammar:present`, `sound:ɾ`, `pattern:x`, `text:id`. */
  itemKey: string;
  outcome: Outcome;
  /** Hints, a retry, or a revealed answer were used: it counts less as knowing. */
  assisted: boolean;
  /** 1 guessed · 2 unsure · 3 sure; absent when never asked. */
  confidence?: 1 | 2 | 3;
  /** Only on a wrong or close answer. */
  category?: MistakeCategory;
  /** What was typed or said, and what was expected, kept short, for "your error log" examples. */
  given?: string;
  expected?: string;
  /** The exercise kind (exercise.ts), or 'free' for a journal line or a spoken turn. */
  kind?: string;
  /** Where to find it again: a deck, a text, a conversation, a journal entry. */
  contextId?: string;
}

/** A small derived summary, cached one row per language and day (`evidenceDays`). Derived: it can always be
 *  rebuilt from `evidence`, so it is `insertOnly` in backups and never the source of truth. */
export interface EvidenceDay {
  /** `${lang}:${day}` */
  id: string;
  lang: Lang;
  day: string;
  bySkill: Partial<Record<Skill, { right: number; wrong: number; assisted: number }>>;
  byCategory: Partial<Record<MistakeCategory, number>>;
}

/** A mistake seen on three different days or in three places is persistent; once is a slip. */
export const PERSISTENT_MISTAKE = { days: 3, places: 3 } as const;

export interface WeakSpot {
  item: EvidenceItem;
  category?: MistakeCategory;
  skill: Skill;
  wrong: number;
  days: number;
  places: number;
  persistent: boolean;
  /** The most recent examples, newest first, at most 5. */
  examples: Array<Pick<EvidenceRow, 'given' | 'expected' | 'at' | 'room' | 'contextId'>>;
}

/** The questions other rooms ask of `core/learner`. Each answers from `evidence` alone, on the device. They are the
 *  only way to read it: no room queries the table itself, so Grammatica, Ratio and the tutor can't disagree. */
export interface LearnerRecord {
  /** Appends one row. Resolves when it is written. */
  record: (row: Omit<EvidenceRow, 'id' | 'day'> & { id?: string }) => Promise<void>;
  /** The persistent weak spots first, then slips, for a language, optionally for one skill. */
  weakSpots: (lang: Lang, opts?: { skill?: Skill; limit?: number }) => Promise<WeakSpot[]>;
  /** Words answered right but only with help, or recognised but never recalled (right in a choice, wrong when typed). */
  recognisedNotRecalled: (lang: Lang, limit?: number) => Promise<string[]>;
  /** Skills with the fewest answers in the last `days` days, quietest first. */
  quietSkills: (lang: Lang, days?: number) => Promise<Skill[]>;
  /** How an item has gone: for "Why this form?", for the card, for the tutor's memory. */
  history: (lang: Lang, item: EvidenceItem, limit?: number) => Promise<EvidenceRow[]>;
  /** Per-day summaries between two days, inclusive (YYYY-MM-DD). Rebuilt from `evidence` when missing. */
  days: (lang: Lang, from: string, to: string) => Promise<EvidenceDay[]>;
  /** Deletes everything for a language (the language is removed). */
  forgetLanguage: (lang: Lang) => Promise<void>;
}
