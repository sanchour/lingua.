import { expect, it } from 'vitest';
import { createDb } from './db';
import { readingProject, saveGlossary } from './readingProject';
import { exportBackup, readBackup, restoreBackup } from './backup';
import { chapterDensity, chapterVocabulary } from '@/core/reading/project';

it('counts occurrences per chapter, keeps collected vocabulary and confirms only attested names', async () => {
  const db = createDb(`reading-project-${crypto.randomUUID()}`);
  const restored = createDb(`reading-project-restored-${crypto.randomUUID()}`);
  try {
    const text = { id: 'book', lang: 'es', title: 'Ana', kind: 'book' as const, source: 'paste' as const, chapterCount: 2, wordCount: 7, createdAt: 1, updatedAt: 1 };
    await db.texts.add(text);
    await db.chapters.bulkAdd([{ id: 'a', textId: text.id, index: 0, wordCount: 4, blocks: [{ t: 'p', text: 'Ana lee. Ana lee.' }] }, { id: 'b', textId: text.id, index: 1, wordCount: 3, blocks: [{ t: 'p', text: 'Ana visita Madrid.' }] }]);
    await db.words.put({ id: 'es:lee', lang: 'es', norm: 'lee', state: 2, stateChangedAt: 1, createdAt: 1, updatedAt: 1 });
    await db.notes.put({ id: 'note', lang: 'es', deckId: 'deck', term: 'lee', meaning: 'reads', source: 'codex', tags: [], context: { sentence: 'Ana lee.', textId: text.id, chapterIndex: 0 }, createdAt: 1, updatedAt: 1 });
    const rows = await readingProject(text, db);
    expect(rows.map((r) => [r.words, r.unknown, r.notes.length])).toEqual([[4, 2, 1], [3, 3, 0]]);
    const name = { id: 'ana', name: 'Ana', kind: 'character' as const, chapterIndex: 0, quote: 'Ana lee.', note: 'The reader' };
    await saveGlossary(text.id, name, db);
    await expect(saveGlossary(text.id, { ...name, name: 'Invented' }, db)).rejects.toThrow('exact quote');
    const parsed = await readBackup(await exportBackup({ includeMedia: true, includeApiKeys: false, markBackup: false }, db));
    await restoreBackup(parsed, 'merge', restored, false);
    expect((await restored.texts.get(text.id))?.readingGlossary).toEqual([name]);
    expect(chapterDensity([], new Map()).share).toBeNull();
    for (const [lang, sentence] of [['ar', 'أنا أقرأ كتاباً.'], ['zh', '我喜欢读书。'], ['ru', 'Анна читает.']]) expect(chapterVocabulary({ blocks: [{ t: 'p', text: sentence }] }, lang).length).toBeGreaterThan(0);
  } finally { await db.delete(); await restored.delete(); }
});
