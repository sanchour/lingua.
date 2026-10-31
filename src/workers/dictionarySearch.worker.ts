/// <reference lib="webworker" />
import { liveQuery } from 'dexie';
import { dictionarySearchRows } from '@/data/dictionarySearch';
import { prepareDictionarySearch, searchDictionaryRows } from '@/core/dictionary/searchTools';
import type { DictSearchOptions } from '@/core/dictionary/searchTools';
import type { FullDictRow } from '@/core/dictionary/format';
export type DictionarySearchRequest = { id: number; lang: string; query: string; options: DictSearchOptions };
let lang = '';
let rows: FullDictRow[] = [];
let subscription: { unsubscribe(): void } | undefined;
let ready: Promise<void>;
self.onmessage = async ({ data }: MessageEvent<DictionarySearchRequest>) => {
  try {
    if (lang !== data.lang) {
      lang = data.lang;
      subscription?.unsubscribe();
      ready = new Promise<void>((resolve, reject) => {
        subscription = liveQuery(() => dictionarySearchRows(data.lang)).subscribe({ next: (next) => { prepareDictionarySearch(next); rows = next; resolve(); }, error: reject });
      });
    }
    await ready;
    const start = performance.now();
    const hits = searchDictionaryRows(rows, data.query, data.options);
    self.postMessage({ id: data.id, hits, elapsedMs: performance.now() - start, count: rows.length });
  } catch (error) { self.postMessage({ id: data.id, error: error instanceof Error ? error.message : String(error) }); }
};
