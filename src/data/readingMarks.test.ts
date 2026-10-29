import { expect, it } from 'vitest';
import { createDb } from './db';
import { saveReadingMark, removeReadingMark } from './readingMarks';
import type { ReadingMark } from '@/core/reading/aids';

it('keeps highlights and notes on the existing text, rejects changed passages and supports undo', async () => {
  const db = createDb(`reading-marks-${crypto.randomUUID()}`);
  try {
    await db.texts.add({ id: 't', lang: 'es', title: 'Test', kind: 'article', source: 'paste', chapterCount: 1, wordCount: 3, createdAt: 1, updatedAt: 1 });
    await db.chapters.add({ id: 'c', textId: 't', index: 0, wordCount: 3, blocks: [{ t: 'p', text: 'Una casa grande.' }] });
    const mark: ReadingMark = { id: 'm', chapterIndex: 0, blockIndex: 0, start: 4, end: 8, quote: 'casa', colour: 'sage', note: 'house' };
    await saveReadingMark('t', mark, db);
    await saveReadingMark('t', { ...mark, note: 'a house' }, db);
    expect((await db.texts.get('t'))?.readingMarks).toEqual([{ ...mark, note: 'a house' }]);
    await expect(saveReadingMark('t', { ...mark, quote: 'wrong' }, db)).rejects.toThrow('passage changed');
    await removeReadingMark('t', 'm', db);
    expect((await db.texts.get('t'))?.readingMarks).toEqual([]);
    await saveReadingMark('t', mark, db);
    expect((await db.texts.get('t'))?.readingMarks).toEqual([mark]);
    await db.chapters.update('c', { blocks: [{ t: 'p', text: 'Otra casa grande.' }] });
    await expect(saveReadingMark('t', mark, db)).rejects.toThrow('passage changed');
    expect((await db.texts.get('t'))?.readingMarks).toEqual([mark]);
  } finally { await db.delete(); }
});
