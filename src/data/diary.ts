// The pronunciation diary (6-10): the same passage read aloud now and then, kept on the device, played back over time, deleted at will.
// A recording is a blob of kind 'recording' whose id says what it is: `diary:<lang>:<time>`.
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { LinguaDB } from './db';

export interface DiaryEntry {
  id: string;
  at: number;
  size: number;
  mime: string;
}

const prefix = (lang: string) => `diary:${lang}:`;

export async function saveReading(lang: string, blob: Blob, at = Date.now(), database: LinguaDB = db): Promise<string> {
  const id = `${prefix(lang)}${at}`;
  await database.blobs.put({ id, kind: 'recording', mime: blob.type || 'audio/webm', size: blob.size, blob, createdAt: at });
  return id;
}

/** A language's readings, the first one first (so the learner's progress reads left to right). */
export async function readings(lang: string, database: LinguaDB = db): Promise<DiaryEntry[]> {
  const rows = await database.blobs.where('id').between(prefix(lang), `${prefix(lang)}￿`).toArray();
  return rows.map((r) => ({ id: r.id, at: r.createdAt, size: r.size, mime: r.mime })).sort((a, b) => a.at - b.at);
}

export async function deleteReading(id: string, database: LinguaDB = db): Promise<void> {
  await database.blobs.delete(id);
}

export const useReadings = (lang: string) => useLiveQuery(() => readings(lang), [lang]);

/** Whole days since the last reading, or null when there is none: the diary asks again after a week. */
export const daysSince = (entries: readonly DiaryEntry[], now = Date.now()): number | null => (entries.length ? Math.floor((now - entries[entries.length - 1].at) / 86_400_000) : null);
