// What Max made (6-6), kept so it is paid for once, and the learner's Report.
import { useLiveQuery } from 'dexie-react-hooks';
import type { GeneratedRow } from '@/core/contracts/db';
import { db } from './db';
import type { LinguaDB } from './db';

/** What was made for this request before, unless the learner reported it. */
export async function findGenerated(hash: string, database: LinguaDB = db): Promise<GeneratedRow | undefined> {
  return (await database.generated.where('hash').equals(hash).toArray()).filter((r) => !r.reported).sort((a, b) => b.createdAt - a.createdAt)[0];
}

export async function saveGenerated(row: GeneratedRow, database: LinguaDB = db): Promise<void> {
  await database.generated.put(row);
}

/** "Report": the learner says it is wrong. It is not offered again, and the same request is made anew. */
export async function reportGenerated(id: string, database: LinguaDB = db): Promise<void> {
  await database.generated.update(id, { reported: true });
}

export function useGenerated(id: string | undefined): GeneratedRow | undefined {
  return useLiveQuery(async () => (id ? await db.generated.get(id) : undefined), [id]);
}
