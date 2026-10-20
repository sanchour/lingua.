/// <reference lib="webworker" />
// Installs a core language's full dictionary into IndexedDB off the main thread: download → gunzip
// → parse → store, in chunks. A row keyed "#version" says which build is installed.
import { DICT_VERSION } from '@/core/dictionary/format';
import type { FullDictFile, FullDictRow } from '@/core/dictionary/format';
import { foldKey, normalizeWord } from '@/core/text/normalize';
import { createDb } from '@/data/db';

export type DictWorkerRequest = { lang: string; url: string };
export type DictWorkerMessage = { type: 'progress'; phase: 'download' | 'store'; pct: number } | { type: 'done'; words: number } | { type: 'error'; message: string };

export const VERSION_KEY = '#version';
const post = (message: DictWorkerMessage) => (self as DedicatedWorkerGlobalScope).postMessage(message);
const CHUNK = 5000;

async function install({ lang, url }: DictWorkerRequest): Promise<void> {
  post({ type: 'progress', phase: 'download', pct: 0 });
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Could not download the dictionary (HTTP ${res.status}).`);
  const total = Number(res.headers.get('content-length')) || 0;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  let lastPost = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total && performance.now() - lastPost > 100) {
      lastPost = performance.now();
      post({ type: 'progress', phase: 'download', pct: received / total });
    }
  }
  const blob = new Blob(chunks as BlobPart[]);
  const head = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  const gzipped = head[0] === 0x1f && head[1] === 0x8b;
  const text = gzipped ? await new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text() : await blob.text();
  const file = JSON.parse(text) as FullDictFile;
  if (file.format !== 'lingua-dict' || file.lang !== lang) throw new Error('This dictionary is not compatible with this version of Lingua.');

  const db = createDb();
  await db.fullDict.where('lang').equals(lang).delete();
  const rows: FullDictRow[] = file.words.map((w) => ({ lang, key: normalizeWord(w.w, lang), fold: foldKey(w.w, lang), word: w.w, rank: w.r, confused: w.c, entries: w.e }));
  for (let i = 0; i < rows.length; i += CHUNK) {
    await db.fullDict.bulkPut(rows.slice(i, i + CHUNK));
    post({ type: 'progress', phase: 'store', pct: Math.min(1, (i + CHUNK) / rows.length) });
  }
  await db.fullDict.put({ lang, key: VERSION_KEY, fold: VERSION_KEY, word: '', rank: file.version ?? DICT_VERSION, entries: [] });
  db.close();
  post({ type: 'done', words: rows.length });
}

self.onmessage = (event: MessageEvent<DictWorkerRequest>) => {
  install(event.data).catch((error: unknown) => post({ type: 'error', message: error instanceof Error ? error.message : 'The dictionary could not be installed.' }));
};
