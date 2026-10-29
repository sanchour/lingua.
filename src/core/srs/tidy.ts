// Tidying a deck (6-2b): what is doubled, and what is missing, found from the notes alone so it can be shown before anything changes.
import { normalizeWord } from '@/core/text/normalize';
import type { Note } from '@/data/types';

export interface TidyReport {
  /** The same word with the same meaning, more than once: the later ones can go. */
  duplicates: Note[][];
  /** The same word with different meanings: kept, but worth a look. */
  sameWord: Note[][];
  /** Different words given the same meaning: kept, but one may be a mix-up. */
  sameMeaning: Note[][];
  noMeaning: Note[];
  noExample: Note[];
}

const norm = (s: string) => s.trim().toLocaleLowerCase().replace(/\s+/g, ' ');

export function tidyReport(notes: readonly Note[], lang: string): TidyReport {
  const live = notes.filter((n) => !n.deletedAt).sort((a, b) => a.createdAt - b.createdAt);
  const byWord = new Map<string, Note[]>();
  for (const n of live) {
    const key = normalizeWord(n.term, lang) || norm(n.term);
    byWord.set(key, [...(byWord.get(key) ?? []), n]);
  }
  const duplicates: Note[][] = [];
  const sameWord: Note[][] = [];
  for (const group of byWord.values()) {
    if (group.length < 2) continue;
    const byMeaning = new Map<string, Note[]>();
    for (const n of group) byMeaning.set(norm(n.meaning), [...(byMeaning.get(norm(n.meaning)) ?? []), n]);
    for (const same of byMeaning.values()) if (same.length > 1) duplicates.push(same);
    if (byMeaning.size > 1) sameWord.push(group);
  }
  const byMeaning = new Map<string, Note[]>();
  for (const n of live) if (n.meaning.trim()) byMeaning.set(norm(n.meaning), [...(byMeaning.get(norm(n.meaning)) ?? []), n]);
  const sameMeaning = [...byMeaning.values()].filter((g) => new Set(g.map((n) => normalizeWord(n.term, lang) || norm(n.term))).size > 1);
  return { duplicates, sameWord, sameMeaning, noMeaning: live.filter((n) => !n.meaning.trim()), noExample: live.filter((n) => !n.example?.text?.trim() && !n.context?.sentence?.trim()) };
}

/** The notes a tidy would delete: every copy after the first of each doubled word. */
export const extraCopies = (report: TidyReport): Note[] => report.duplicates.flatMap((g) => g.slice(1));
