import { useLiveQuery } from 'dexie-react-hooks';
import { localDateKey } from '@/lib/format';
import { db } from './db';
import type { LinguaDB } from './db';
import type { ChallengeDone } from './types';

// Mundus › Beyond the app: which challenges were done, and when. One row per challenge and day, so
// marking the same one twice in a day changes nothing and two devices merge cleanly.

export const challengeId = (lang: string, tipId: string, date: string) => `${lang}:${tipId}:${date}`;

/** Marks a challenge done today, or undoes today's mark. Returns whether it is now done. */
export async function toggleChallenge(lang: string, tipId: string, date = localDateKey(), database: LinguaDB = db): Promise<boolean> {
  const id = challengeId(lang, tipId, date);
  return database.transaction('rw', database.challenges, async () => {
    const row = await database.challenges.get(id);
    const now = Date.now();
    if (row && !row.deletedAt) {
      await database.challenges.put({ ...row, deletedAt: now, updatedAt: now });
      return false;
    }
    await database.challenges.put({ id, lang, tipId, date, createdAt: row?.createdAt ?? now, updatedAt: now });
    return true;
  });
}

export async function challengesDone(lang: string, database: LinguaDB = db): Promise<ChallengeDone[]> {
  return (await database.challenges.where('lang').equals(lang).toArray()).filter((r) => !r.deletedAt);
}

/** The challenges done in a language, live; `undefined` while loading. */
export function useChallenges(lang: string): ChallengeDone[] | undefined {
  return useLiveQuery(() => challengesDone(lang), [lang]);
}
