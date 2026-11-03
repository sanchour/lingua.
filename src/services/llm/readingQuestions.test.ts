import { expect, it, vi } from 'vitest';
import { readingQuestions, judgeReading } from './readingQuestions';
import { selfReadingSpecs } from '@/core/exercise/reading';
it('asks for a chosen interpretation and refuses a model response that ignores it', async () => {
  const complete = vi.fn(async (_request: { system: string }) => ({ questions: [{ kind: 'discussion', question: 'Why read?', answer: 'To learn.', quote: 'Ana', why: 'An example.' }] }));
  const source = 'Ana compra pan para su padre y vuelve a casa.';
  expect(await readingQuestions('es', source, { complete }, 'discussion')).toHaveLength(1);
  expect(complete.mock.calls[0][0].system).toContain('discussion');
  await expect(readingQuestions('es', source, { complete }, 'tone')).rejects.toThrow('No questions');
});
it('uses an injected model, validates source quotes and judges a free answer with the source', async () => {
  const source = 'Ana compra pan para su padre y vuelve a casa.';
  const complete = vi.fn().mockResolvedValueOnce({ questions: [{ kind: 'main-idea', question: '¿Qué hace Ana?', answer: 'Compra pan.', quote: 'Ana compra pan', why: 'The source says this.' }] }).mockResolvedValueOnce({ verdict: 'good', explanation: 'Both actions are in the source.' });
  expect(await readingQuestions('es', source, { complete })).toHaveLength(1);
  expect((await judgeReading(selfReadingSpecs('es', 'text')[0], source, 'Compra pan.', { complete })).verdict).toBe('good');
  expect(complete.mock.calls[1][0].user).toContain(source);
  await expect(readingQuestions('es', source, { complete: async () => ({ questions: [] }) })).rejects.toThrow('No questions');
  await expect(judgeReading(selfReadingSpecs('es', 'text')[0], source, 'a', { complete: async () => ({}) })).rejects.toThrow('could not be read');
  await expect(readingQuestions('es', '', { complete })).rejects.toThrow('40');
});
