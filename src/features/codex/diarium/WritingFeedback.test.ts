import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { checkEntry } from '@/services/llm/journal';
import { WritingFeedback } from './WritingFeedback';

it('shows labelled suggestions and a rubric from a fake model, without applying them', async () => {
  const review = await checkEntry('es', 'A1', 'Hola amigo', 'Write a formal letter.', { name: 'fake-model', complete: async () => ({ writingFeedback: { suggestions: [{ kind: 'formality', original: 'Hola amigo', suggestion: 'Estimado señor', why: 'A formal opening.' }], rubric: [{ criterion: 'Register and tone', score: 1, reason: 'The greeting is informal.' }] } }) });
  const html = renderToStaticMarkup(createElement(WritingFeedback, { review, lang: 'es' }));
  expect(html).toContain('AI feedback');
  expect(html).toContain('fake-model');
  expect(html).toContain('Hola amigo');
  expect(html).toContain('Estimado señor');
  expect(html).toContain('Register and tone');
  expect(html).toContain('Your entry stays as you wrote it');
  expect(review.text).toBe('Hola amigo');
});
