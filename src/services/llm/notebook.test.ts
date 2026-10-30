import { expect, it, vi } from 'vitest';
import { studyNotebook } from './notebook';
const source = '# Articles\nLa casa is feminine. El libro is masculine.';
it('uses only the explicit source and an injected model, preserving exact answer quotes', async () => {
  const complete = vi.fn(async (_request: { user: string }) => ({ summary: 'Two examples of gender.', exercises: [{ question: 'Which example is feminine?', quote: 'La casa' }] }));
  const result = await studyNotebook('es', source, { name: 'fake-not-a-real-model', complete });
  expect(JSON.parse(complete.mock.calls[0][0].user)).toEqual({ language: 'es', notes: source });
  expect(result).toMatchObject({ source, model: 'fake-not-a-real-model', exercises: [{ quote: 'La casa' }] });
});
it('rejects oversized requests, invented quotes and malformed model output', async () => {
  const complete = vi.fn(async (_request: { user: string }) => ({ summary: 'Summary', exercises: [{ question: 'What?', quote: 'not in the source' }] }));
  await expect(studyNotebook('es', 'x'.repeat(6001), { name: 'fake', complete })).rejects.toThrow(); expect(complete).not.toHaveBeenCalled();
  await expect(studyNotebook('es', source, { name: 'fake', complete })).rejects.toThrow('source quote');
  await expect(studyNotebook('es', source, { name: 'fake', complete: async () => null })).rejects.toThrow();
});
