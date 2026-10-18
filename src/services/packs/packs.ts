import { create } from 'zustand';
import { useLiveQuery } from 'dexie-react-hooks';
import Dexie from 'dexie';
import { packFileName, packId, PACK_VERSION } from '@/core/packs/format';
import { db } from '@/data/db';
import type { DictPack } from '@/data/types';
import { applyKnownSeed } from '@/data/words';
import { ensureLexicon, resetLexicon } from './lexicon';
import type { PackWorkerMessage } from '@/workers/packs.worker';
import PacksWorker from '@/workers/packs.worker?worker';

export interface PackJob {
  lang: string;
  phase: 'download' | 'unpack' | 'store';
  pct: number;
}

interface PackState {
  jobs: Record<string, PackJob>;
  set: (lang: string, job: PackJob | null) => void;
}

export const usePackJobs = create<PackState>((set) => ({
  jobs: {},
  set: (lang, job) =>
    set((s) => {
      const jobs = { ...s.jobs };
      if (job) jobs[lang] = job;
      else delete jobs[lang];
      return { jobs };
    }),
}));

const running = new Map<string, Promise<void>>();

/** Downloads and installs a language pack in a worker. Concurrent calls share one install. */
export function installPack(lang: string): Promise<void> {
  const existing = running.get(lang);
  if (existing) return existing;
  const { set } = usePackJobs.getState();
  set(lang, { lang, phase: 'download', pct: 0 });

  const job = new Promise<void>((resolve, reject) => {
    const worker = new PacksWorker();
    worker.onmessage = (event: MessageEvent<PackWorkerMessage>) => {
      const msg = event.data;
      if (msg.type === 'progress') set(lang, { lang, phase: msg.phase, pct: msg.pct });
      if (msg.type === 'done' || msg.type === 'error') {
        worker.terminate();
        set(lang, null);
        if (msg.type === 'done') resolve();
        else reject(new Error(msg.message));
      }
    };
    worker.onerror = (event) => {
      worker.terminate();
      set(lang, null);
      reject(new Error(event.message || 'The language pack could not be installed.'));
    };
    worker.postMessage({ lang, url: `${import.meta.env.BASE_URL}packs/${packFileName(lang)}` });
  })
    .then(() => applyKnownSeed(lang))
    .then(() => {
      // Japanese text is split by the pack's words: from now on, by the new ones.
      resetLexicon(lang);
      return ensureLexicon(lang);
    })
    .then(() => undefined)
    .finally(() => running.delete(lang));

  running.set(lang, job);
  return job;
}

/** True when the language needs its pack installed (or updated). */
export async function packMissing(lang: string): Promise<boolean> {
  const installed = await db.dictPacks.get(packId(lang));
  return !installed || installed.version < PACK_VERSION;
}

export async function removePack(lang: string): Promise<void> {
  const id = packId(lang);
  await db.dictForms.where('[pack+form]').between([id, Dexie.minKey], [id, Dexie.maxKey]).delete();
  await db.dictEntries.where('[pack+lemma]').between([id, Dexie.minKey], [id, Dexie.maxKey]).delete();
  await db.frequency.where('[lang+rank]').between([lang, Dexie.minKey], [lang, Dexie.maxKey]).delete();
  await db.dictExamples.where('[pack+lemma]').between([id, Dexie.minKey], [id, Dexie.maxKey]).delete();
  await db.dictParadigms.where('[pack+lemma]').between([id, Dexie.minKey], [id, Dexie.maxKey]).delete();
  await db.starterLists.delete(lang);
  await db.dictPacks.delete(id);
  resetLexicon(lang);
}

export function useInstalledPacks(): DictPack[] | undefined {
  return useLiveQuery(() => db.dictPacks.toArray(), []);
}
