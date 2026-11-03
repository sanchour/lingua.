import { db } from './db';
import type { LinguaDB } from './db';
import { removalInProgress, undoableRemoval } from './removalUndo';

export async function saveWritingDraft(id: string, text: string, database: LinguaDB = db) {
  if (text.length > 100000) throw new Error('Use a draft under 100,000 characters.');
  await database.transaction('rw', database.journalEntries, async () => {
    const entry = await database.journalEntries.get(id);
    if (!entry || entry.deletedAt) throw new Error('This entry is no longer available.');
    const versions = [...(entry.versions ?? [])];
    if (versions.at(-1)?.text === text) return;
    await database.journalEntries.update(id, { versions: [...versions, { text, at: Date.now() }].slice(-10), updatedAt: Date.now() });
  });
}

export async function setWritingImage(id: string, picture: Blob | null, database: LinguaDB = db): Promise<void> {
  if (picture && (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(picture.type) || picture.size > 10 * 1024 * 1024)) throw new Error('Choose a PNG, JPEG, WebP or GIF under 10 MB.');
  if (!removalInProgress(database)) return undoableRemoval(database, ['journalEntries', 'blobs'], () => setWritingImage(id, picture, database));
  await database.transaction('rw', database.journalEntries, database.blobs, async () => {
    const entry = await database.journalEntries.get(id);
    if (!entry || entry.deletedAt) throw new Error('This entry is no longer available.');
    const pictureBlobId = picture ? crypto.randomUUID() : undefined;
    if (picture && pictureBlobId) await database.blobs.add({ id: pictureBlobId, kind: 'image', blob: picture, mime: picture.type, size: picture.size, createdAt: Date.now() });
    await database.journalEntries.update(id, { pictureBlobId, updatedAt: Date.now() });
    if (entry.pictureBlobId) await database.blobs.delete(entry.pictureBlobId);
  });
}
