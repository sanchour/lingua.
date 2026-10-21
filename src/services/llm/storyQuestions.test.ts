import { describe, expect, it } from 'vitest';
import { readStoryQuestions } from './storyQuestions';

describe('story questions', () => {
  it('keeps two good questions, with the answer among the options', () => {
    const raw = {
      questions: [
        { question: '¿Dónde trabaja su hermana?', en: 'Where does her sister work?', answer: 'En una ciudad grande', wrong: ['En el campo', 'En casa', 'En una tienda'] },
        { question: '¿Qué compra?', en: 'What does she buy?', answer: 'Un paraguas', wrong: ['Un libro', 'Un paraguas', ''] },
        { question: '¿Por qué camina despacio?', answer: 'Porque tiene tiempo', wrong: ['Porque llueve', 'Porque está cansada', 'Porque es tarde'] },
      ],
    };
    const items = readStoryQuestions(raw, () => 0.5);
    // The second has one usable wrong answer left (a repeat of the answer and an empty one are dropped).
    expect(items.map((q) => q.question)).toEqual(['¿Dónde trabaja su hermana?', '¿Por qué camina despacio?']);
    for (const q of items) expect(q.options).toContain(q.answer);
    expect(items[0].en).toBe('Where does her sister work?');
    expect(items[1].en).toBeUndefined();
  });

  it('reads nothing from an answer of the wrong shape', () => {
    expect(readStoryQuestions(null)).toEqual([]);
    expect(readStoryQuestions({ questions: 'none' })).toEqual([]);
    expect(readStoryQuestions({ questions: [{ question: 'Q', answer: 'A' }] })).toEqual([]);
  });
});
