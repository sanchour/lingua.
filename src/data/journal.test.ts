import { expect, it } from 'vitest';
import { WRITING_TASKS, writingTaskPrompt } from '@/core/journal/tasks';
import { createDb } from './db';
import { createEntry, entryWords, saveEntryText } from './journal';

it('saves a writing task and its material without changing free journal entries', async () => {
  const db = createDb(`journal-${crypto.randomUUID()}`);
  try {
    const task = WRITING_TASKS.find((t) => t.id === 'email')!;
    const prompt = writingTaskPrompt(task, 'Meet on Saturday.');
    const id = await createEntry('es', { text: prompt, taskId: task.id }, db);
    await saveEntryText(id, '**Hola**, Ana. ¿Nos vemos el sábado?', 'es', db);
    expect(await db.journalEntries.get(id)).toMatchObject({ lang: 'es', writingTaskId: 'email', prompt, words: 6 });
    expect(entryWords('**Hola**, Ana. ¿Nos vemos el sábado?', 'es')).toBe(6);
    const free = await createEntry('fr', undefined, db);
    expect((await db.journalEntries.get(free))?.writingTaskId).toBeUndefined();
  } finally {
    await db.delete();
  }
});
