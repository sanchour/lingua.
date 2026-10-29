import { expect, it } from 'vitest';
import { WRITING_TASKS, writingTaskPrompt } from '@/core/journal/tasks';
import { createDb } from './db';
import { createEntry, entryWords, saveEntryText, saveReview, updateEntry } from './journal';
import type { JournalReview } from './types';

it('saves a writing task and its material without changing free journal entries', async () => {
  const db = createDb(`journal-${crypto.randomUUID()}`);
  try {
    const task = WRITING_TASKS.find((t) => t.id === 'email')!;
    const prompt = writingTaskPrompt(task, 'Meet on Saturday.');
    const id = await createEntry('es', { text: prompt, taskId: task.id }, db);
    await saveEntryText(id, '**Hola**, Ana. ¿Nos vemos el sábado?', 'es', db);
    expect(await db.journalEntries.get(id)).toMatchObject({ lang: 'es', writingTaskId: 'email', prompt, words: 6 });
    expect(entryWords('**Hola**, Ana. ¿Nos vemos el sábado?', 'es')).toBe(6);
    await updateEntry(id, { portfolio: { level: 'A1', topic: 'Friends', at: 100 } }, db);
    expect((await db.journalEntries.get(id))?.portfolio).toEqual({ level: 'A1', topic: 'Friends', at: 100 });
    await updateEntry(id, { portfolio: undefined }, db);
    expect(await db.journalEntries.get(id)).toMatchObject({ text: '**Hola**, Ana. ¿Nos vemos el sábado?' });
    expect((await db.journalEntries.get(id))?.portfolio).toBeUndefined();
    const free = await createEntry('fr', undefined, db);
    expect((await db.journalEntries.get(free))?.writingTaskId).toBeUndefined();
  } finally {
    await db.delete();
  }
});

it('stores correction evidence atomically, maps categories and does not duplicate a saved review', async () => {
  const db = createDb(`journal-evidence-${crypto.randomUUID()}`);
  try {
    const id = await createEntry('es', undefined, db);
    const review: JournalReview = { text: 'Yo es feliz', corrected: 'Yo soy feliz', natural: '', corrections: [{ original: 'es', suggestion: 'soy', category: 'word choice', explanation: 'Use the first person.', severity: 'major' }], scores: { grammar: 50, vocabulary: 50, coherence: 50, overall: 50 }, cefr: 'A1', strengths: [], tip: '', model: 'fake', reviewedAt: Date.now() };
    await saveReview(id, review, db);
    await saveReview(id, review, db);
    expect(await db.evidence.count()).toBe(1);
    expect(await db.evidence.toArray()).toMatchObject([{ skill: 'writing', room: 'diarium', category: 'word-choice', given: 'es', expected: 'soy', contextId: id }]);
    expect((await db.journalEntries.get(id))?.review?.model).toBe('fake');
  } finally { await db.delete(); }
});
