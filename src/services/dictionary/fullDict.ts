// The full dictionary of a core language on this device (4.0-2): installed once from the site,
// then looked up and searched offline.
import { useLiveQuery } from 'dexie-react-hooks';
import { create } from 'zustand';
import { DICT_VERSION, dictFileName } from '@/core/dictionary/format';
import type { FullDictRow } from '@/core/dictionary/format';
import { searchDictionaryRows } from '@/core/dictionary/searchTools';
import type { DictSearchOptions, ScoredDictRow } from '@/core/dictionary/searchTools';
import { foldKey, normalizeWord } from '@/core/text/normalize';
import { db } from '@/data/db';
import type { DictWorkerMessage } from '@/workers/dict.worker';
import DictWorker from '@/workers/dict.worker?worker';

const VERSION_KEY = '#version';

/** Download sizes, for the button that offers them (MB, rounded up). */
export const DICT_SIZE_MB: Record<string, number> = { es: 9, fr: 9, de: 11, ru: 11, ar: 3, zh: 17 };

export const useDictJobs = create<{ jobs: Record<string, { phase: 'download' | 'store'; pct: number } | null>; set: (lang: string, job: { phase: 'download' | 'store'; pct: number } | null) => void }>((set) => ({
  jobs: {},
  set: (lang, job) => set((s) => ({ jobs: { ...s.jobs, [lang]: job } })),
}));

const running = new Map<string, Promise<number>>();

/** Downloads and stores a language's dictionary; resolves with how many words it has. */
export function installDictionary(lang: string): Promise<number> {
  const existing = running.get(lang);
  if (existing) return existing;
  const { set } = useDictJobs.getState();
  set(lang, { phase: 'download', pct: 0 });
  const job = new Promise<number>((resolve, reject) => {
    const worker = new DictWorker();
    worker.onmessage = (event: MessageEvent<DictWorkerMessage>) => {
      const msg = event.data;
      if (msg.type === 'progress') set(lang, { phase: msg.phase, pct: msg.pct });
      if (msg.type === 'done' || msg.type === 'error') {
        worker.terminate();
        set(lang, null);
        if (msg.type === 'done') resolve(msg.words);
        else reject(new Error(msg.message));
      }
    };
    worker.onerror = (event) => {
      worker.terminate();
      set(lang, null);
      reject(new Error(event.message || 'The dictionary could not be installed.'));
    };
    worker.postMessage({ lang, url: `${import.meta.env.BASE_URL}dict/${dictFileName(lang)}` });
  }).finally(() => running.delete(lang));
  running.set(lang, job);
  return job;
}

export async function removeDictionary(lang: string): Promise<void> {
  await db.fullDict.where('lang').equals(lang).delete();
}

/** 'none', 'old' (an earlier build: offered again) or 'ready', and how many words. */
export function useDictionaryState(lang: string): { state: 'none' | 'old' | 'ready'; words: number } | undefined {
  return useLiveQuery(async () => {
    const version = await db.fullDict.get([lang, VERSION_KEY]);
    if (!version) return { state: 'none' as const, words: 0 };
    const words = (await db.fullDict.where('lang').equals(lang).count()) - 1;
    return { state: (version.rank ?? 0) < DICT_VERSION ? ('old' as const) : ('ready' as const), words };
  }, [lang]);
}

/** A headword's entry: as the pack keys lemmas, else by its accent-free spelling. */
export async function lookUpFull(lang: string, word: string): Promise<FullDictRow | undefined> {
  const exact = await db.fullDict.get([lang, normalizeWord(word, lang)]);
  if (exact && exact.key !== VERSION_KEY) return exact;
  return (await db.fullDict.where('[lang+fold]').equals([lang, foldKey(word, lang)]).first()) ?? undefined;
}

export function useFullEntry(lang: string, word: string | undefined): FullDictRow | null | undefined {
  return useLiveQuery(async () => (word ? ((await lookUpFull(lang, word)) ?? null) : null), [lang, word]);
}

/** Headwords starting with what was typed (accents aside), the most common first. */
export async function searchFull(lang: string, query: string, limit = 12): Promise<FullDictRow[]> {
  const q = foldKey(query.trim(), lang);
  if (!q) return [];
  const found = await db.fullDict
    .where('[lang+fold]')
    .between([lang, q], [lang, `${q}￿`])
    .limit(400)
    .toArray();
  return found
    .filter((r) => r.key !== VERSION_KEY)
    .sort((a, b) => Number(b.fold === q) - Number(a.fold === q) || (a.rank ?? 1e9) - (b.rank ?? 1e9) || a.word.length - b.word.length)
    .slice(0, limit);
}

/** Advanced dictionary search across modes (meaning/reverse, fuzzy, prefix, suffix, rhyme, sound, POS filter). */
export async function searchFullAdvanced(lang: string, query: string, options: DictSearchOptions): Promise<ScoredDictRow[]> {
  const limit = options.limit ?? 20;
  const q = foldKey(query.trim(), lang);
  if (options.mode === 'word' && (!options.pos || options.pos === 'all') && q) {
    const fast = await searchFull(lang, query, limit);
    if (fast.length >= Math.min(4, limit)) {
      return fast.map((row, idx) => ({ row, score: 100 - idx }));
    }
  }
  if (options.mode === 'prefix' && q) {
    const prefRows = await db.fullDict
      .where('[lang+fold]')
      .between([lang, q], [lang, `${q}`])
      .limit(600)
      .toArray();
    return searchDictionaryRows(prefRows, query, { ...options, limit });
  }
  const rows = await db.fullDict.where('lang').equals(lang).limit(12000).toArray();
  return searchDictionaryRows(rows, query, { ...options, limit });
}
