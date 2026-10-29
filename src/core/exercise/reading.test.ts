import { describe, expect, it } from 'vitest';
import { judge } from './judge';
import { readReadingQuestions, readingSpec, selfReadingSpecs } from './reading';
const source = 'Ana sale. Ana compra pan. Ana vuelve. El pan es para su padre.';
const common = { question: 'Pregunta', answer: 'Respuesta', quote: 'Ana sale.', why: 'It follows from the passage.' };
const raw = { questions: [
  { ...common, kind: 'main-idea' }, { ...common, kind: 'title' }, { ...common, kind: 'context' }, { ...common, kind: 'short-answer' },
  { ...common, kind: 'true-false', options: ['True', 'False'], answer: '1' },
  { ...common, kind: 'odd-sentence', options: ['Ana sale.', 'La luna es de queso.', 'Ana vuelve.'], answer: '2' },
  { ...common, kind: 'events', items: ['Ana sale.', 'Ana compra pan.', 'Ana vuelve.'] },
  { ...common, kind: 'headings', pairs: [{ left: 'Ana sale.', right: 'La salida' }, { left: 'Ana vuelve.', right: 'La vuelta' }] },
] };
describe('reading exercise specs', () => {
  it('builds all comprehension tasks using existing screens and source text evidence', () => {
    const questions = readReadingQuestions(raw, source);
    expect(questions).toHaveLength(8);
    const specs = questions.map((q, i) => readingSpec('es', 'book', q, i, 'self', () => 0));
    expect(new Set(specs.map((s) => s.kind))).toEqual(new Set(['rewrite', 'drag-drop', 'match-definition']));
    expect(judge(specs[4].check, '1', 'es').outcome).toBe('right');
    expect(judge(specs[5].check, '1', 'es').outcome).toBe('wrong');
    expect(judge(specs[6].check, ['Ana sale.', 'Ana compra pan.', 'Ana vuelve.'], 'es').outcome).toBe('right');
    expect(judge(specs[6].check, ['Ana vuelve.', 'Ana compra pan.', 'Ana sale.'], 'es').outcome).toBe('wrong');
    expect(specs.every((s) => s.trains.skill === 'reading' && s.trains.item.type === 'text' && s.trains.item.textId === 'book')).toBe(true);
    expect(readingSpec('es', 'book', questions[0], 0, 'ai').check.rule).toBe('ai');
    expect(selfReadingSpecs('es', 'book')).toHaveLength(4);
  });
  it('rejects invented quotes, answer indexes, repeated choices, events or paragraphs', () => {
    for (const q of [ { ...raw.questions[0], quote: 'Invented' }, { ...raw.questions[4], answer: '3' }, { ...raw.questions[5], answer: '1' }, { ...raw.questions[4], options: ['True', 'True'] }, { ...raw.questions[6], items: ['Ana sale.', 'Ana sale.', 'Ana vuelve.'] }, { ...raw.questions[7], pairs: [{ left: 'Invented', right: 'Heading' }, { left: 'Ana sale.', right: 'Heading 2' }] } ]) expect(readReadingQuestions({ questions: [q] }, source)).toEqual([]);
    expect(readReadingQuestions(null, source)).toEqual([]);
  });
});
