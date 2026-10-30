import { describe, expect, it } from 'vitest';
import { rankGlobalSearch } from './globalSearch';

describe('core/search/globalSearch (6-22)', () => {
  it('ranks matches across personal words, decks, flashcards/notes (F1283), saved texts & chapters (F1282), journal entries, and grammar topics', () => {
    const hits = rankGlobalSearch(
      {
        words: [
          {
            id: 'es:madrugada',
            lang: 'es',
            norm: 'madrugada',
            lemma: 'madrugada',
            state: 2,
            stateChangedAt: 1000,
            gloss: 'early morning, dawn',
            favourite: 1,
            createdAt: 1000,
            updatedAt: 1000,
          },
        ],
        decks: [
          {
            id: 'd1',
            lang: 'es',
            folderId: null,
            name: 'Madrugada & Time Expressions',
            order: 0,
            kind: 'custom',
            config: { newPerDay: 15, maxReviews: 200, desiredRetention: 0.9, directions: ['recognition'], defaultMode: 'classic' },
            createdAt: 1000,
            updatedAt: 1000,
          },
        ],
        notes: [
          {
            id: 'n1',
            deckId: 'd1',
            lang: 'es',
            term: 'de madrugada',
            meaning: 'at dawn / in the wee hours',
            example: { text: 'Llegamos a Madrid de madrugada.' },
            tags: ['time'],
            source: 'manual',
            createdAt: 1000,
            updatedAt: 1000,
          },
        ],
        texts: [
          {
            id: 't1',
            lang: 'es',
            kind: 'book',
            source: 'epub',
            title: 'Crónica de una madrugada',
            author: 'García Márquez',
            chapterCount: 1,
            wordCount: 500,
            createdAt: 1000,
            updatedAt: 1000,
          },
        ],
        chapters: [
          {
            id: 'ch1',
            textId: 't1',
            index: 0,
            title: 'Capítulo 1',
            wordCount: 20,
            blocks: [{ t: 'p', text: 'El tren salió en plena madrugada silenciosa.' }],
          },
        ],
        journalEntries: [
          {
            id: 'j1',
            lang: 'es',
            date: '2026-10-29',
            title: 'Mi rutina',
            text: 'Me desperté de madrugada para estudiar.',
            words: 6,
            createdAt: 1000,
            updatedAt: 1000,
          },
        ],
        grammarTopics: [
          {
            id: 'time-prepositions',
            title: 'Expressions of time (de madrugada, por la mañana)',
            level: 'A2',
            summary: 'How to express times of day.',
          },
        ],
      },
      'madrugada',
    );

    const kinds = new Set(hits.map((h) => h.kind));
    expect(kinds.has('word')).toBe(true);
    expect(kinds.has('deck')).toBe(true);
    expect(kinds.has('card')).toBe(true);
    expect(kinds.has('text')).toBe(true);
    expect(kinds.has('journal')).toBe(true);
    expect(kinds.has('grammar')).toBe(true);
    // Exact word match with favourite bonus ranks first
    expect(hits[0].kind).toBe('word');
    expect(hits[0].title).toBe('madrugada');
  });
});
