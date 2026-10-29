// "Which syllable is stressed?" (6-10): a word cut into syllables, the stressed one to be found. The answer comes from the dictionary's
// own mark (Russian) or from Spanish's written rules, so it is only asked where it can be known.
import type { FullDictRow } from '@/core/dictionary/format';
import { spanishStress } from '@/core/lang/stress';

export interface StressQuestion {
  word: string;
  syllables: string[];
  /** The index of the stressed syllable. */
  answer: number;
}

export function stressQuestion(lang: string, row: FullDictRow): StressQuestion | null {
  const entry = row.entries.find((e) => e.syl && e.syl.length >= 2 && e.syl.length <= 6);
  if (!entry?.syl) return null;
  const answer = lang === 'ru' ? entry.stress : lang === 'es' ? spanishStress(entry.syl) : undefined;
  if (answer === undefined || answer < 0 || answer >= entry.syl.length) return null;
  // Russian marks the stress in the headword itself: the syllables are shown without the mark.
  return { word: row.word, syllables: entry.syl.map((s) => s.replace(/́/g, '')), answer };
}
