import { afterAll, afterEach, expect, it } from 'vitest';
import { createDb } from './db';
import { listLibrary, newPhrase, newNotebookNote, phraseToCard, removeLibrary, saveLibrary } from './notebook';
const database = createDb('notebook-test-' + Math.random());
afterAll(() => database.delete());
afterEach(async () => { await database.settings.clear(); await database.blobs.clear(); });
it('keeps phrases by language, tombstones deletion and restores without replacing other rows', async () => {
  const a = await saveLibrary('phrasebook', newPhrase('es', 'Hola', 'Hello'), undefined, database);
  await saveLibrary('phrasebook', newPhrase('fr', 'Salut', 'Hi'), undefined, database);
  expect((await listLibrary('phrasebook', 'es', database)).map((p) => p.text)).toEqual(['Hola']);
  await removeLibrary('phrasebook', a, database);
  expect(await listLibrary('phrasebook', 'es', database)).toEqual([]);
  expect((await database.settings.toArray()).some((r) => (r.value as { deletedAt?: number }).deletedAt)).toBe(true);
  await saveLibrary('phrasebook', a, undefined, database);
  expect(await listLibrary('phrasebook', 'fr', database)).toHaveLength(1);
  await phraseToCard(a, database); await phraseToCard(a, database);
  expect(await database.notes.filter((n) => n.extra?.phrasebookId === a.id).count()).toBe(1);
});
it('rejects invalid records/audio and preserves corrupt saved data', async () => {
  const p = newPhrase('es', 'Hola');
  await expect(saveLibrary('phrasebook', p, new Blob(['x'], { type: 'text/html' }), database)).rejects.toThrow();
  await expect(saveLibrary('phrasebook', { ...p, text: '' }, undefined, database)).rejects.toThrow();
  await database.settings.put({ key: 'phrasebook.item:es:broken', value: { unexpected: true }, updatedAt: 1 });
  await expect(listLibrary('phrasebook', 'es', database)).rejects.toThrow('not been changed');
  expect(await database.settings.get('phrasebook.item:es:broken')).toBeTruthy();
});

it('stores attached audio with its phrase atomically on the device', async () => {
  const saved = await saveLibrary('phrasebook', newPhrase('es', 'Buenos días'), new Blob(['audio'], { type: 'audio/webm' }), database);
  expect(saved.audioBlobId).toBeTruthy();
  expect((await database.blobs.get(saved.audioBlobId!))?.size).toBe(5);
});

it('keeps notebook links, tags, Markdown and tombstone undo independently', async () => {
  const item = { ...newNotebookNote('es'), title: 'Gender', body: '# Forms\n\n**la casa**', folder: 'Grammar', tags: ['gender'], links: [{ kind: 'word' as const, target: 'casa', label: 'casa' }] };
  const saved = await saveLibrary('notebook', item, undefined, database);
  expect(await listLibrary('notebook', 'es', database)).toEqual([saved]);
  await removeLibrary('notebook', saved, database);
  expect(await listLibrary('notebook', 'es', database)).toEqual([]);
  await saveLibrary('notebook', saved, undefined, database);
  expect((await listLibrary('notebook', 'es', database))[0].links[0].target).toBe('casa');
});

it('makes only one phrase card when requests overlap', async () => {
  const p = newPhrase('es', 'Gracias', 'Thank you');
  const decks = await Promise.all([phraseToCard(p, database), phraseToCard(p, database)]);
  expect(decks[0]).toBe(decks[1]);
  expect(await database.notes.filter((n) => n.extra?.phrasebookId === p.id).count()).toBe(1);
});
