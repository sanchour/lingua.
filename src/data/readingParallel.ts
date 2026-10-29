import { parallelSource, PARALLEL_LIMIT } from '@/core/reading/parallel';
import type { ParallelPassage } from '@/core/reading/parallel';
import { db } from './db';
import type { LinguaDB } from './db';

// shortcut: parallel passages share the text's newest-wins backup row; use a table for concurrent per-passage merging.
export async function saveReadingParallel(textId: string, passage: Omit<ParallelPassage, 'updatedAt'>, database: LinguaDB = db) {
  if (!Number.isInteger(passage.chapterIndex) || passage.chapterIndex < 0 || !passage.text.trim() || passage.text.length > PARALLEL_LIMIT || !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(passage.lang)) throw new Error('Add a parallel text under 4,000 characters and a language code such as en.');
  await database.transaction('rw', database.texts, database.chapters, async () => {
    const text = await database.texts.get(textId);
    const chapter = await database.chapters.where('[textId+index]').equals([textId, passage.chapterIndex]).first();
    if (!text || text.deletedAt || !chapter || chapter.deletedAt || !passage.source || parallelSource(chapter) !== passage.source) throw new Error('The source chapter changed. Open it again before saving.');
    await database.texts.update(textId, { readingParallel: [...(text.readingParallel ?? []).filter((p) => p.chapterIndex !== passage.chapterIndex), { ...passage, text: passage.text.trim(), updatedAt: Date.now() }], updatedAt: Date.now() });
  });
}
