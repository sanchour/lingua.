export type MarkColour = 'amber' | 'sage' | 'blue';
export interface ReadingMark {
  id: string;
  chapterIndex: number;
  blockIndex: number;
  start: number;
  end: number;
  quote: string;
  colour: MarkColour;
  note: string;
}
export interface ReadingAids { pos: boolean; endings: boolean; glosses: boolean; hideGlosses: boolean; ruler: boolean; rulerY: number }
export const READING_AIDS: ReadingAids = { pos: false, endings: false, glosses: false, hideGlosses: false, ruler: false, rulerY: 50 };
export const MARK_COLOURS: Record<MarkColour, string> = { amber: 'color-mix(in srgb, #d49b54 25%, transparent)', sage: 'color-mix(in srgb, var(--sage) 25%, transparent)', blue: 'color-mix(in srgb, #6a90b4 25%, transparent)' };
export const POS_COLOURS: Record<string, string> = { noun: 'color-mix(in oklab, #6a90b4 62%, var(--ink))', verb: 'color-mix(in oklab, #c86d51 62%, var(--ink))', adj: 'var(--sage-text)', adv: 'color-mix(in oklab, #d49b54 62%, var(--ink))' };

export function markMatches(mark: ReadingMark, source: string): boolean {
  return Number.isInteger(mark.start) && Number.isInteger(mark.end) && mark.start >= 0 && mark.end > mark.start && mark.end <= source.length && source.slice(mark.start, mark.end) === mark.quote;
}

/** A changed suffix of an attested inflected form, never a guessed root for a word with no shared stem. */
export function endingStart(form: string, lemma: string): number | undefined {
  if (!lemma || form === lemma) return;
  const letters = [...form];
  const base = [...lemma];
  let i = 0;
  while (i < letters.length && i < base.length && letters[i].toLocaleLowerCase() === base[i].toLocaleLowerCase()) i++;
  return i >= 2 && i < letters.length ? letters.slice(0, i).join('').length : undefined;
}
