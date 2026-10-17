import { afterEach, describe, expect, it } from 'vitest';
import { createDb } from './db';
import type { LinguaDB } from './db';
import { addText, appendChapters, getChapter, rewriteChapters, textChapters } from './library';

const open: LinguaDB[] = [];
function freshDb(): LinguaDB {
  const db = createDb(`library-${Math.random().toString(36).slice(2)}`);
  open.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(open.splice(0).map((db) => db.delete()));
});

const para = (text: string) => ({ t: 'p' as const, text });

async function book(db: LinguaDB) {
  return addText(
    {
      lang: 'es',
      title: 'Cuentos',
      kind: 'book',
      source: 'paste',
      chapters: [
        { title: 'Uno', blocks: [para('El perro duerme.')] },
        { title: 'Dos', blocks: [para('El gato come.')] },
        { title: 'Tres', blocks: [para('La casa es grande.')] },
      ],
    },
    db,
  );
}

describe('editing a text', () => {
  it('edits one chapter in place and keeps the others untouched', async () => {
    const db = freshDb();
    const id = await book(db);
    const [one, two, three] = await textChapters(id, db);
    await rewriteChapters(id, [{ id: one.id, title: 'Uno', blocks: [para('El perro duerme mucho.')] }, two, three], [], db);

    const after = await textChapters(id, db);
    expect(after.map((c) => c.id)).toEqual([one.id, two.id, three.id]);
    expect(after[0].blocks).toEqual([para('El perro duerme mucho.')]);
    expect(after[0].updatedAt).toBeGreaterThan(0);
    expect(after[1].updatedAt).toBeUndefined();
    expect((await db.texts.get(id))?.wordCount).toBe(4 + 3 + 4);
  });

  it('removes a chapter as a tombstone and renumbers the rest', async () => {
    const db = freshDb();
    const id = await book(db);
    const [one, , three] = await textChapters(id, db);
    await db.readingProgress.put({ textId: id, chapterIndex: 2, blockIndex: 0, percent: 0.9, updatedAt: 1 });
    await rewriteChapters(id, [one, three], [], db);

    const after = await textChapters(id, db);
    expect(after.map((c) => [c.title, c.index])).toEqual([
      ['Uno', 0],
      ['Tres', 1],
    ]);
    expect((await getChapter(id, 1, db))?.title).toBe('Tres');
    const tombstones = (await db.chapters.toArray()).filter((c) => c.deletedAt);
    expect(tombstones).toHaveLength(1);
    expect(tombstones[0].blocks).toEqual([]);
    expect((await db.texts.get(id))?.chapterCount).toBe(2);
    expect((await db.readingProgress.get(id))?.chapterIndex).toBe(1);
  });

  it('adds a file’s chapters after the last one', async () => {
    const db = freshDb();
    const id = await book(db);
    await appendChapters(id, [{ title: 'Cuatro', blocks: [para('Fin.')] }], [], db);
    expect((await textChapters(id, db)).map((c) => c.title)).toEqual(['Uno', 'Dos', 'Tres', 'Cuatro']);
  });
});
