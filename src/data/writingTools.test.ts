import { expect, it } from 'vitest';
import { createDb } from './db';
import { saveWritingDraft, setWritingImage } from './writingTools';
import { captureRemoval } from './removalUndo';
import { exportBackup, readBackup, restoreBackup } from './backup';

it('keeps distinct draft snapshots and restores an image change without losing the entry', async () => {
  const db = createDb(`writing-tools-${crypto.randomUUID()}`);
  const restored = createDb(`writing-tools-restored-${crypto.randomUUID()}`);
  try {
    await db.journalEntries.add({ id: 'e', lang: 'ar', date: '2026-11-03', text: 'كتابي', words: 1, createdAt: 1, updatedAt: 1 });
    for (let i = 0; i < 12; i++) await saveWritingDraft('e', `draft ${i}`, db);
    await saveWritingDraft('e', 'draft 11', db);
    expect((await db.journalEntries.get('e'))?.versions?.map((v) => v.text)).toEqual(Array.from({ length: 10 }, (_, i) => `draft ${i + 2}`));
    expect((await db.journalEntries.get('e'))?.text).toBe('كتابي');
    await expect(setWritingImage('e', new Blob(['x'], { type: 'image/svg+xml' }), db)).rejects.toThrow('PNG');
    await expect(setWritingImage('e', new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: 'image/png' }), db)).rejects.toThrow('10 MB');
    await setWritingImage('e', new Blob(['pixels'], { type: 'image/png' }), db);
    const imageId = (await db.journalEntries.get('e'))!.pictureBlobId!;
    const removal = await captureRemoval(db, ['journalEntries', 'blobs'], () => setWritingImage('e', null, db));
    expect((await db.journalEntries.get('e'))?.pictureBlobId).toBeUndefined();
    await removal.undo();
    expect((await db.journalEntries.get('e'))?.pictureBlobId).toBe(imageId);
    const backup = await readBackup(await exportBackup({ includeMedia: true, includeApiKeys: false, markBackup: false }, db));
    await restoreBackup(backup, 'merge', restored, false);
    expect((await restored.journalEntries.get('e'))?.pictureBlobId).toBe(imageId);
    expect(await (await restored.blobs.get(imageId))?.blob.text()).toBe('pixels');
  } finally { await db.delete(); await restored.delete(); }
});
