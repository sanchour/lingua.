import { db } from './db';
import type { LinguaDB } from './db';
import type { BlobRow } from './types';

export const MEDIA_KINDS: BlobRow['kind'][] = ['audio', 'video', 'recording', 'image', 'cover'];

export async function storedMedia(database: LinguaDB = db) {
  const rows = await database.blobs.toArray();
  return MEDIA_KINDS.map((kind) => ({ kind, count: rows.filter((r) => r.kind === kind).length, bytes: rows.filter((r) => r.kind === kind).reduce((n, r) => n + r.size, 0) }));
}

/** Keep the removed blobs for the page's Undo, without touching attachments of another kind. */
export async function removeStoredMedia(kind: BlobRow['kind'], database: LinguaDB = db): Promise<BlobRow[]> {
  if (!MEDIA_KINDS.includes(kind)) throw new Error('Unknown media kind.');
  return database.transaction('rw', database.blobs, async () => {
    const rows = await database.blobs.where('kind').equals(kind).toArray();
    await database.blobs.bulkDelete(rows.map((r) => r.id));
    return rows;
  });
}

export async function restoreStoredMedia(rows: BlobRow[], database: LinguaDB = db): Promise<void> {
  await database.transaction('rw', database.blobs, async () => {
    const current = await database.blobs.bulkGet(rows.map((r) => r.id));
    await database.blobs.bulkAdd(rows.filter((_, i) => !current[i]));
  });
}
