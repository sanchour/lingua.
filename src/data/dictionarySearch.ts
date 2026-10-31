import type { LinguaDB } from './db';
import { db } from './db';
import { foldKey } from '@/core/text/normalize';
import { searchDictionaryRows } from '@/core/dictionary/searchTools';
import type { DictSearchOptions } from '@/core/dictionary/searchTools';

export function dictionarySearchRows(lang: string, database: LinguaDB = db) {
  return database.fullDict.where('lang').equals(lang).toArray().then((rows) => rows.filter((r) => r.key !== '#version'));
}

export async function indexedDictionarySearch(lang: string, query: string, options: DictSearchOptions, database: LinguaDB = db) {
  const q = foldKey(query.trim(), lang).replace(options.mode === 'prefix' ? /-$/ : /$^/, '');
  if (!q) return [];
  const rows = await database.fullDict.where('[lang+fold]').between([lang, q], [lang, q + '\uffff'], true, true).toArray();
  return searchDictionaryRows(rows, query, options);
}
