import { expect, it } from 'vitest';
import { createDb } from './db';
import { saveReadingParallel } from './readingParallel';
import { parallelSource } from '@/core/reading/parallel';
it('stores one parallel text per chapter, retains other chapters and refuses a changed source', async () => {
  const db = createDb(`parallel-${crypto.randomUUID()}`);
  try {
    const blocks = [{ t: 'p' as const, text: 'Ana lee un libro.' }];
    await db.texts.add({ id: 't', lang: 'es', title: 'Test', kind: 'article', source: 'paste', chapterCount: 2, wordCount: 8, createdAt: 1, updatedAt: 1 });
    await db.chapters.bulkAdd([0, 1].map((index) => ({ id: `c${index}`, textId: 't', index, wordCount: 4, blocks })));
    const passage = { chapterIndex: 0, source: parallelSource({ blocks }), text: 'Ana reads a book.', lang: 'en' };
    await saveReadingParallel('t', passage, db);
    await saveReadingParallel('t', { ...passage, chapterIndex: 1 }, db);
    await saveReadingParallel('t', { ...passage, text: 'Ana is reading a book.' }, db);
    expect((await db.texts.get('t'))?.readingParallel).toHaveLength(2);
    await expect(saveReadingParallel('t', { ...passage, source: 'wrong' }, db)).rejects.toThrow('changed');
    await expect(saveReadingParallel('t', { ...passage, lang: '<invalid>' }, db)).rejects.toThrow('language code');
    await db.chapters.update('c0', { blocks: [{ t: 'p', text: 'Ana lee otro libro.' }] });
    await expect(saveReadingParallel('t', passage, db)).rejects.toThrow('changed');
    expect((await db.texts.get('t'))?.readingParallel?.find((p) => p.chapterIndex === 0)?.text).toBe('Ana is reading a book.');
  } finally { await db.delete(); }
});
