import { chapterDensity, chapterVocabulary } from '@/core/reading/project';
import { db } from './db';
import type { LinguaDB } from './db';
import { textChapters } from './library';
import type { Text } from './types';
import { getWordStates } from './words';

export async function readingProject(text: Text, database: LinguaDB = db) {
  const chapters = await textChapters(text.id, database);
  const vocab: string[][] = [];
  for (const chapter of chapters) { vocab.push(chapterVocabulary(chapter, text.lang)); await new Promise<void>((resolve) => setTimeout(resolve, 0)); }
  const states = await getWordStates(text.lang, [...new Set(vocab.flat())], database);
  const notes = await database.notes.where('lang').equals(text.lang).filter((n) => !n.deletedAt && n.context?.textId === text.id).toArray();
  return chapters.map((chapter, i) => ({ chapter, ...chapterDensity(vocab[i], states), notes: notes.filter((n) => n.context?.chapterIndex === chapter.index) }));
}

export async function saveGlossary(textId: string, item: NonNullable<Text['readingGlossary']>[number], database: LinguaDB = db) {
  await database.transaction('rw', database.texts, database.chapters, async () => {
    const text = await database.texts.get(textId);
    const chapter = await database.chapters.where('[textId+index]').equals([textId, item.chapterIndex]).first();
    if (!text || text.deletedAt || !item.id || !item.name.trim() || item.name.length > 120 || item.note.length > 1000 || !['character', 'place'].includes(item.kind) || !item.quote.includes(item.name) || !chapter || chapter.deletedAt || !chapter.blocks.some((b) => b.t !== 'img' && b.text.includes(item.quote))) throw new Error('Use a name and an exact quote from this chapter.');
    await database.texts.update(textId, { readingGlossary: [...(text.readingGlossary ?? []).filter((g) => g.id !== item.id), item], updatedAt: Date.now() });
  });
}
