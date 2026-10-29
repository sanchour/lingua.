import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { LinguaDB } from './db';

const noteKey = (pairKey: string) => `compare:notes:${pairKey}`;

export async function getContrastNote(pairKey: string, database: LinguaDB = db): Promise<string> {
  const row = await database.settings.get(noteKey(pairKey));
  if (!row || typeof row.value !== 'string') return '';
  return row.value;
}

export function useContrastNote(pairKey: string): string {
  const result = useLiveQuery(() => getContrastNote(pairKey), [pairKey]);
  return result ?? '';
}

export async function saveContrastNote(pairKey: string, note: string, database: LinguaDB = db): Promise<void> {
  await database.settings.put({
    key: noteKey(pairKey),
    value: note,
    updatedAt: Date.now(),
  });
}
