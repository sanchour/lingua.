/// <reference lib="webworker" />
// Installs a language pack into IndexedDB off the main thread: download → gunzip → parse → store.
import Dexie from 'dexie';
import { PACK_FORMAT, packId } from '@/core/packs/format';
import type { PackFile } from '@/core/packs/format';
import { createDb } from '@/data/db';
import type { DictEntry, DictExample, DictForm, DictParadigm, FrequencyRow } from '@/data/types';

export type PackWorkerRequest = { lang: string; url: string };
export type PackWorkerMessage =
  | { type: 'progress'; phase: 'download' | 'unpack' | 'store'; pct: number }
  | { type: 'done'; packId: string; forms: number; entries: number; sizeBytes: number }
  | { type: 'error'; message: string };

const post = (message: PackWorkerMessage) => (self as DedicatedWorkerGlobalScope).postMessage(message);
const CHUNK = 4000;

async function download(url: string): Promise<{ blob: Blob; size: number }> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Could not download the language pack (HTTP ${res.status}).`);
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
  return { blob: new Blob(chunks as BlobPart[]), size: received };
}

async function unpack(blob: Blob): Promise<PackFile> {
  const head = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  // Some servers decompress .gz transparently; only gunzip when the bytes are still gzip.
  const gzipped = head[0] === 0x1f && head[1] === 0x8b;
  const text = gzipped ? await new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text() : await blob.text();
  return JSON.parse(text) as PackFile;
}

async function install({ lang, url }: PackWorkerRequest): Promise<void> {
  post({ type: 'progress', phase: 'download', pct: 0 });
  const { blob, size } = await download(url);
  post({ type: 'progress', phase: 'unpack', pct: 0 });
  const pack = await unpack(blob);
  if (pack.format !== PACK_FORMAT || pack.lang !== lang) throw new Error('This language pack is not compatible with this version of Lingua.');

  const id = packId(lang, pack.gloss);
  const entries: DictEntry[] = pack.lemmas.map(([lemma, head, ipa, gender, senses]) => ({
    pack: id,
    lemma,
    head: head || undefined,
    ipa: ipa || undefined,
    gender: gender || undefined,
    senses: senses.map(([pos, glosses]) => ({ pos, glosses })),
  }));
  const forms: DictForm[] = pack.forms.map(([form, lemmaIdx, g, d]) => ({
    pack: id,
    form,
    lemmas: lemmaIdx.map((i) => pack.lemmas[i][0]),
    g,
    d: d || undefined,
  }));
  const byLemma = new Map<string, DictExample>();
  for (const [i, sentence, translation, start, end] of pack.examples ?? []) {
    const lemma = pack.lemmas[i][0];
    let row = byLemma.get(lemma);
    if (!row) byLemma.set(lemma, (row = { pack: id, lemma, ex: [] }));
    row.ex.push([sentence, translation, start, end]);
  }
  const examples = [...byLemma.values()];
  const tagSets = pack.tagSets ?? [];
  const paradigms: DictParadigm[] = (pack.paradigms ?? []).map(([i, pos, rows]) => ({ pack: id, lemma: pack.lemmas[i][0], pos, forms: rows.map(([form, t]) => [form, tagSets[t] ?? '']) }));
  const formByKey = new Map(forms.map((f) => [f.form, f]));
  const frequency: FrequencyRow[] = pack.freq.map((norm, i) => {
    const f = formByKey.get(norm);
    return { id: `${lang}:${norm}`, lang, norm, rank: i + 1, lemma: f?.lemmas[0], gloss: f?.g };
  });

  const db = createDb();
  await db.open();
  // Replace any previous version of this pack.
  await db.dictForms.where('[pack+form]').between([id, Dexie.minKey], [id, Dexie.maxKey]).delete();
  await db.dictEntries.where('[pack+lemma]').between([id, Dexie.minKey], [id, Dexie.maxKey]).delete();
  await db.frequency.where('[lang+rank]').between([lang, Dexie.minKey], [lang, Dexie.maxKey]).delete();
  await db.dictExamples.where('[pack+lemma]').between([id, Dexie.minKey], [id, Dexie.maxKey]).delete();
  await db.dictParadigms.where('[pack+lemma]').between([id, Dexie.minKey], [id, Dexie.maxKey]).delete();

  const total = entries.length + forms.length + frequency.length + examples.length + paradigms.length;
  let stored = 0;
  const store = async <T>(table: { bulkPut: (rows: T[]) => Promise<unknown> }, rows: T[]) => {
    for (let i = 0; i < rows.length; i += CHUNK) {
      await table.bulkPut(rows.slice(i, i + CHUNK));
      stored += Math.min(CHUNK, rows.length - i);
      post({ type: 'progress', phase: 'store', pct: stored / total });
    }
  };
  await store(db.dictEntries, entries);
  await store(db.dictForms, forms);
  await store(db.frequency, frequency);
  await store(db.dictExamples, examples);
  await store(db.dictParadigms, paradigms);
  await db.starterLists.put({
    lang,
    version: pack.version,
    lemmaFreq: (pack.lemmaFreq ?? []).map((i) => pack.lemmas[i][0]),
    themes: pack.themes ?? {},
  });
  await db.dictPacks.put({
    id,
    lang,
    native: pack.gloss,
    version: pack.version,
    source: 'kaikki',
    forms: forms.length,
    entries: entries.length,
    sizeBytes: size,
    installedAt: Date.now(),
  });
  db.close();
  post({ type: 'done', packId: id, forms: forms.length, entries: entries.length, sizeBytes: size });
}

self.onmessage = (event: MessageEvent<PackWorkerRequest>) => {
  install(event.data).catch((error: unknown) => post({ type: 'error', message: error instanceof Error ? error.message : String(error) }));
};
