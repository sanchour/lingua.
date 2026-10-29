import { describe, expect, it } from 'vitest';
import { parseWordList, wordsFromCounts, wordsFromText } from './deckFrom';

describe('a deck from a list', () => {
  it('splits a line at the first separator, drops blanks and doubles', () => {
    expect(parseWordList('casa = house\nperro\tdog\n\ngato - cat; feline\nCasa = again\nel mar')).toEqual([
      { term: 'casa', meaning: 'house' },
      { term: 'perro', meaning: 'dog' },
      { term: 'gato', meaning: 'cat; feline' },
      { term: 'el mar', meaning: '' },
    ]);
  });
});

describe('a deck from a text', () => {
  it('takes the unknown words, the most used first, and leaves out known words, numbers and single letters', () => {
    const drafts = wordsFromText('El perro y el gato. El perro corre 2 veces. Y a casa.', 'es', new Set(['el', 'y']));
    expect(drafts.map((d) => d.term)).toEqual(['perro', 'gato', 'corre', 'veces', 'casa']);
  });
  it('stops at the limit', () => {
    expect(wordsFromText('uno dos tres cuatro', 'es', new Set(), 2)).toHaveLength(2);
  });
});

describe('a deck from a text already in the library', () => {
  it('takes the counted words that are unknown, the most used first', () => {
    expect(wordsFromCounts(['el', 'gato', 'perro', 'a', '2024', 'sol'], [9, 2, 5, 4, 7, 2], new Set(['el'])).map((d) => d.term)).toEqual(['perro', 'gato', 'sol']);
  });
});
