import { useSyncExternalStore } from 'react';
import Dexie from 'dexie';
import { packId } from '@/core/packs/format';
import { getLexiconVersion, hasLexicon, setLexicon, subscribeLexicon } from '@/core/text/tokenizer';
import { db } from '@/data/db';

/** Languages split into words by their own dictionary rather than the browser's. */
const SPLIT_BY_DICTIONARY = new Set(['ja']);
const loading = new Map<string, Promise<void>>();

/**
 * Reads the language's pack words and their frequency into memory, once, so Japanese is split
 * into whole words (食べました, not 食|べ|ま|した). Resolves at once for other languages and when
 * the pack isn't installed yet.
 */
export function ensureLexicon(lang: string): Promise<void> {
  if (!SPLIT_BY_DICTIONARY.has(lang) || hasLexicon(lang)) return Promise.resolve();
  let job = loading.get(lang);
  if (!job) {
    job = (async () => {
      const id = packId(lang);
      const keys = await db.dictForms.where('[pack+form]').between([id, Dexie.minKey], [id, Dexie.maxKey]).primaryKeys();
      if (!keys.length) return;
      const words = new Set(keys.map((k) => k[1]));
      const ranks = new Map<string, number>();
      await db.frequency
        .where('[lang+rank]')
        .between([lang, Dexie.minKey], [lang, Dexie.maxKey])
        .each((r) => void ranks.set(r.norm, r.rank));
      setLexicon(lang, {
        has: (w) => words.has(w),
        // About ln(rank): the commonest words cost 3, rare listed ones 11.5 (see segmentJapanese).
        cost: (w) => {
          const rank = ranks.get(w);
          return rank ? Math.log(rank + 20) : 11.5;
        },
      });
    })()
      .catch(() => undefined)
      .finally(() => loading.delete(lang));
    loading.set(lang, job);
  }
  return job;
}

/** After a pack is installed or removed: the next split reads its words afresh. */
export function resetLexicon(lang: string): void {
  if (SPLIT_BY_DICTIONARY.has(lang)) setLexicon(lang, null);
}

/** Re-renders when a word list arrives, so text split before it is split again. */
export function useLexiconVersion(): number {
  return useSyncExternalStore(subscribeLexicon, getLexiconVersion, getLexiconVersion);
}
