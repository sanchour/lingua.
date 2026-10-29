import { expect, it, vi } from 'vitest';
import { readingQuestions, judgeReading } from './readingQuestions';
import { selfReadingSpecs } from '@/core/exercise/reading';
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
