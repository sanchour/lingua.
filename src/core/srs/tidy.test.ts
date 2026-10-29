import { describe, expect, it } from 'vitest';
import type { Note } from '@/data/types';
import { extraCopies, tidyReport } from './tidy';

const note = (id: string, term: string, meaning: string, at: number, extra: Partial<Note> = {}): Note =>
  ({ id, deckId: 'd', lang: 'es', term, meaning, tags: [], source: 'manual', createdAt: at, updatedAt: at, ...extra }) as Note;

describe('tidying a deck', () => {
  const notes = [
    note('a', 'Casa', 'house', 1, { example: { text: 'Mi casa.' } }),
    note('b', 'casa', 'House ', 2),
    note('c', 'casa', 'home', 3),
    note('d', 'perro', '', 4),
    note('e', 'gato', 'cat', 5, { deletedAt: 9 }),
  ];
  const report = tidyReport(notes, 'es');
  it('finds the same word with the same meaning, ignoring case and spaces, and keeps the first', () => {
    expect(report.duplicates.map((g) => g.map((n) => n.id))).toEqual([['a', 'b']]);
    expect(extraCopies(report).map((n) => n.id)).toEqual(['b']);
  });
  it('lists different words with one meaning, to be looked at', () => {
    expect(tidyReport([note('a', 'casa', 'house', 1), note('b', 'hogar', 'House', 2), note('c', 'perro', 'dog', 3)], 'es').sameMeaning.map((g) => g.map((n) => n.id))).toEqual([['a', 'b']]);
  });
  it('lists a word with two meanings apart, and what is missing; deleted notes do not count', () => {
    expect(report.sameWord.map((g) => g.map((n) => n.id))).toEqual([['a', 'b', 'c']]);
    expect(report.noMeaning.map((n) => n.id)).toEqual(['d']);
    expect(report.noExample.map((n) => n.id)).toEqual(['b', 'c', 'd']);
  });
});
