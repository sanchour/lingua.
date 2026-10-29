import { expect, it } from 'vitest';
import { checkEntry } from './journal';

it('gets task feedback from an injected model without a key or settings', async () => {
  const result = await checkEntry('es', 'A1', 'Hola amigo', 'Write a formal request, 60–120 words.', { name: 'fake-model', complete: async ({ system, user }) => {
    expect(system).toContain('preserving the writer');
    expect(user).toContain('formal request');
    return { corrected: 'Hola, amigo', corrections: [{ original: 'imaginary', suggestion: 'x' }], writingFeedback: { suggestions: [{ kind: 'formality', original: 'Hola amigo', suggestion: 'Estimado señor', why: 'A formal opening fits the request.' }], rubric: [{ criterion: 'Task completion', score: 1, reason: 'The request is missing.' }] } };
  } });
  expect(result.model).toBe('fake-model');
  expect(result.corrections).toEqual([]);
  expect(result.writingFeedback?.suggestions[0].kind).toBe('formality');
  await expect(checkEntry('es', 'A1', 'Hola', undefined, { name: 'fake', complete: async () => null })).rejects.toThrow('expected format');
});
