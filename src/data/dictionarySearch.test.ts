import { afterAll, expect, it } from 'vitest';
import { createDb } from './db';
import { dictionarySearchRows, indexedDictionarySearch } from './dictionarySearch';
import { searchDictionaryRows } from '@/core/dictionary/searchTools';
const database = createDb('dictionary-search-' + Math.random());
afterAll(() => database.delete());
it('searches prefixes correctly and retains entries beyond the old 12,000-row cutoff', async () => {
  const row = (word: string, rank = 50000) => ({ lang: 'es', word, key: word, fold: word, rank, entries: [{ pos: 'noun', senses: [{ g: ['home dwelling'] }] }] });
  await database.fullDict.bulkAdd([...Array.from({ length: 12001 }, (_, i) => row('a' + String(i).padStart(5, '0'))), row('casa', 1), row('deshacer', 2), { ...row('zeta'), lang: 'fr' }]);
  expect((await indexedDictionarySearch('es', 'des', { mode: 'prefix' }, database)).map((h) => h.row.word)).toEqual(['deshacer']);
  expect((await indexedDictionarySearch('es', 'deshacer', { mode: 'word' }, database))[0]?.row.word).toBe('deshacer');
  const all = await dictionarySearchRows('es', database);
  expect(all).toHaveLength(12003);
  expect(searchDictionaryRows(all, 'kasa', { mode: 'fuzzy' })[0]?.row.word).toBe('casa');
  expect(searchDictionaryRows(all, 'home dwelling', { mode: 'meaning' }).some((h) => h.row.word === 'casa')).toBe(true);
});
