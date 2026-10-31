import { afterAll, expect, it } from 'vitest';
import { createDb } from './db';
import { removeStoredMedia, restoreStoredMedia, storedMedia } from './storageMedia';
const database = createDb('storage-media-' + Math.random());
afterAll(() => database.delete());
it('deletes only the selected saved kind and restores it without overwriting newer files', async () => {
  const rows = ['audio', 'video', 'recording', 'image', 'cover'].map((kind, i) => ({ id: String(i), kind: kind as 'audio', mime: 'test/plain', size: 3, blob: new Blob(['old']), createdAt: 1 }));
  await database.blobs.bulkAdd(rows);
  expect((await storedMedia(database)).find((r) => r.kind === 'recording')).toMatchObject({ count: 1, bytes: 3 });
  const removed = await removeStoredMedia('audio', database);
  expect(await database.blobs.count()).toBe(4);
  expect(await database.blobs.get('2')).toEqual(rows[2]);
  await restoreStoredMedia(removed, database);
  expect(await database.blobs.count()).toBe(5);
  await removeStoredMedia('audio', database);
  await database.blobs.put({ ...rows[0], size: 5, blob: new Blob(['newer']) });
  await restoreStoredMedia(removed, database);
  expect((await database.blobs.get('0'))?.size).toBe(5);
});
