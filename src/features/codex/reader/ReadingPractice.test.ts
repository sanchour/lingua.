import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ReadingRun } from './ReadingPractice';
import { readingSpec, selfReadingSpecs } from '@/core/exercise/reading';
it('draws free answers, ordered events and paragraph matching using shared views', () => {
  const draw = (specs: ReturnType<typeof selfReadingSpecs>) => renderToStaticMarkup(createElement(ReadingRun, { specs, source: 'A source passage.', guides: true, onDone: () => {} }));
  expect(draw(selfReadingSpecs('es', 'text'))).toContain('Show self-check');
  const base = { question: 'Ordena', answer: 'A B C', quote: 'A', why: 'Source' };
  expect(draw([readingSpec('es', 'text', { ...base, kind: 'events', items: ['A', 'B', 'C'] }, 0)])).toContain('Check answer');
  const matching = draw([readingSpec('es', 'text', { ...base, kind: 'headings', pairs: [{ left: 'Un párrafo', right: 'Un título' }, { left: 'Otro párrafo', right: 'Otro título' }] }, 0)]);
  expect(matching).toContain('Un párrafo');
  expect(matching).toContain('Otro título');
});
