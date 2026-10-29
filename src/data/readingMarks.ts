import { markMatches } from '@/core/reading/aids';
import type { ReadingMark } from '@/core/reading/aids';
import { db } from './db';
import type { LinguaDB } from './db';

// shortcut: marks share the text's newest-wins backup row; use a table if concurrent annotation merging is needed.
export async function saveReadingMark(textId: string, mark: ReadingMark, database: LinguaDB = db): Promise<void> {
  await database.transaction('rw', database.texts, database.chapters, async () => {
    const text = await database.texts.get(textId);
    const chapter = await database.chapters.where('[textId+index]').equals([textId, mark.chapterIndex]).first();
    const block = chapter?.blocks[mark.blockIndex];
    if (!text || text.deletedAt || !block || block.t === 'img' || !markMatches(mark, block.text)) throw new Error('The passage changed. Select it again before saving.');
    if (!mark.id || typeof mark.note !== 'string' || !['amber', 'sage', 'blue'].includes(mark.colour) || mark.note.length > 4000) throw new Error('Choose a highlight colour and a note under 4,000 characters.');
    await database.texts.update(textId, { readingMarks: [...(text.readingMarks ?? []).filter((m) => m.id !== mark.id), mark], updatedAt: Date.now() });
  });
}
export async function removeReadingMark(textId: string, id: string, database: LinguaDB = db): Promise<void> {
  await database.transaction('rw', database.texts, async () => {
    const text = await database.texts.get(textId);
    if (text) await database.texts.update(textId, { readingMarks: (text.readingMarks ?? []).filter((m) => m.id !== id), updatedAt: Date.now() });
  });
}
