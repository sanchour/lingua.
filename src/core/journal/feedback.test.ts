import { expect, it } from 'vitest';
import { parseWritingFeedback } from './feedback';

it('keeps suggestions grounded in the original and validates rubric scores', () => {
  expect(parseWritingFeedback(null, 'Hola')).toBeUndefined();
  const result = parseWritingFeedback({ suggestions: [
    { kind: 'formality', original: 'Hola', suggestion: 'Estimado señor', why: 'For a formal letter.' },
    { kind: 'idiom', original: 'invented quote', suggestion: 'x', why: 'x' },
    { kind: 'unknown', original: 'Hola', suggestion: 'x', why: 'x' },
  ], rubric: [{ criterion: 'Task completion', score: 3, reason: 'You make the request.' }, { criterion: 'Organisation', score: 99, reason: 'Invalid' }] }, 'Hola');
  expect(result?.suggestions).toHaveLength(1);
  expect(result?.rubric).toEqual([{ criterion: 'Task completion', score: 3, reason: 'You make the request.' }]);
});
