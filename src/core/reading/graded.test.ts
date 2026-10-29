import { expect, it } from 'vitest';
import type { Text } from '@/data/types';
import { GRADED_FILTER, READING_GENRES, SOURCE_QUERIES, gradedTexts } from './graded';
const base: Text = { id: 'a', lang: 'es', title: 'El viaje', kind: 'article', source: 'paste', chapterCount: 1, wordCount: 200, createdAt: 1, updatedAt: 1, readingTopic: 'Café', readingGenre: 'story', stats: { uniqueWords: 30, knownShare: 0.8, newWords: 5, level: 'A2', computedAt: 1 } };
it('filters by measured level, topic, genre, length and known-or-learning share in one language', () => {
  const rows = [base, { ...base, id: 'b', lang: 'fr' }, { ...base, id: 'c', deletedAt: 1 }, { ...base, id: 'd', kind: 'shelfItem' as const }];
  expect(gradedTexts(rows, 'es', { query: 'cafe', genre: 'story', level: 'A2', maxWords: 200, minKnown: 0.8 }).map((t) => t.id)).toEqual(['a']);
  expect(gradedTexts(rows, 'es', { ...GRADED_FILTER, minKnown: 0.9 })).toEqual([]);
  expect(gradedTexts(rows, 'es', { ...GRADED_FILTER, maxWords: 199 })).toEqual([]);
});
it('does not replace an unmeasured level with a manual level, or missing statistics with a known share', () => {
  const unknown = { ...base, id: 'u', stats: undefined, level: 'C1' as const };
  expect(gradedTexts([unknown, base], 'es', GRADED_FILTER).map((t) => t.id)).toEqual(['a', 'u']);
  expect(gradedTexts([unknown], 'es', { ...GRADED_FILTER, level: 'C1' })).toEqual([]);
  expect(gradedTexts([unknown], 'es', { ...GRADED_FILTER, level: 'unknown' })).toHaveLength(1);
  expect(gradedTexts([unknown], 'es', { ...GRADED_FILTER, minKnown: 0.5 })).toEqual([]);
  expect(gradedTexts([base], 'es', { ...GRADED_FILTER, level: 'A2' }, false)).toEqual([]);
  expect(gradedTexts([base], 'es', { ...GRADED_FILTER, level: 'unknown' }, false)).toHaveLength(1);
  for (const list of Object.values(SOURCE_QUERIES)) expect(list).toHaveLength(READING_GENRES.length);
});
