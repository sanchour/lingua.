import { describe, expect, it } from 'vitest';
import { contextFor, contextsOf } from './contexts';

const note = { term: 'perro', example: { text: 'Mi perro come.', translation: 'My dog eats.' } };

describe('a word in different sentences', () => {
  it('starts with the card’s own sentence and adds the dictionary’s, without doubles or long ones', () => {
    const pool = contextsOf(note, [['Mi perro come.', 'x'], ['El perro ladra.', 'The dog barks.'], ['x'.repeat(200)], ['Un perro azul.']]);
    expect(pool.map((c) => c.text)).toEqual(['Mi perro come.', 'El perro ladra.', 'Un perro azul.']);
  });
  it('takes them in turn as the card is reviewed', () => {
    const pool = contextsOf(note, [['El perro ladra.'], ['Un perro azul.']]);
    expect([0, 1, 2, 3, 4].map((n) => contextFor(pool, n)?.text)).toEqual(['Mi perro come.', 'El perro ladra.', 'Un perro azul.', 'Mi perro come.', 'El perro ladra.']);
  });
  it('gives nothing for a card with no sentence of its own, and the context a word was met in counts', () => {
    expect(contextsOf({ term: 'gato' }, [['El gato.']])).toEqual([]);
    expect(contextsOf({ term: 'gato', context: { sentence: 'Vi un gato.' } }, [])[0].text).toBe('Vi un gato.');
    expect(contextFor([], 3)).toBeUndefined();
  });
});
