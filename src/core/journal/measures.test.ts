import { expect, it } from 'vitest';
import { writingMeasures } from './measures';

it('measures plain words and sentences without counting Markdown or punctuation', () => {
  expect(writingMeasures('**Casa**, casa. Una casa grande!', 'es')).toEqual({ words: 5, unique: 3, diversity: 0.6, sentences: 2, averageLength: 2.5, longest: 3, longSentences: 0 });
  expect(writingMeasures('...', 'es')).toEqual({ words: 0, unique: 0, diversity: 0, sentences: 0, averageLength: 0, longest: 0, longSentences: 0 });
});

it('counts long sentences and handles scripts without spaces', () => {
  expect(writingMeasures(Array(21).fill('casa').join(' ') + '.', 'es').longSentences).toBe(1);
  const chinese = writingMeasures('我喜欢读书。你呢？', 'zh');
  expect(chinese.words).toBeGreaterThan(0);
  expect(chinese.sentences).toBe(2);
});
