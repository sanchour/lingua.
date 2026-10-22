import type { UnitId } from './outline';

/** A word of a unit: the word (with its article where the language has one), its meaning, and a reading (pinyin). */
export type CourseWord = [term: string, meaning: string, reading?: string];

/**
 * A key phrase, like a Grammatica item: the word it turns on in [brackets], its translation, and
 * three wrong words for that place. `reading` is the pinyin of a Mandarin phrase.
 */
export interface CoursePhrase {
  s: string;
  en: string;
  wrong: [string, string, string];
  reading?: string;
}

export interface UnitContent {
  /** About ten words. */
  words: CourseWord[];
  /** About eight phrases, the ones the unit is about. */
  phrases: CoursePhrase[];
  /** Grammatica topic ids the unit uses, in the order taught (none for a unit that needs none). */
  grammar: string[];
  /** An answer to the writing task, at the unit's level. */
  model: string;
}

export interface CourseContent {
  lang: string;
  units: Record<UnitId, UnitContent>;
}
