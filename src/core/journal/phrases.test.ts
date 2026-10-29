import { expect, it } from 'vitest';
import { PHRASE_FUNCTIONS, WRITING_PHRASES } from './phrases';
import { tokenAt } from './wordHelp';

it('has a phrase for every function in each core language', () => {
  expect(Object.keys(WRITING_PHRASES).sort()).toEqual(['ar', 'de', 'es', 'fr', 'ru', 'zh']);
  for (const phrases of Object.values(WRITING_PHRASES)) {
    expect(phrases).toHaveLength(PHRASE_FUNCTIONS.length);
    expect(phrases.every((p) => p.includes('…'))).toBe(true);
  }
});

it('finds a hovered word without including punctuation', () => {
  expect(tokenAt('¡Hola, Ana!', 2, 'es')).toBe('Hola');
  expect(tokenAt('¡Hola, Ana!', 5, 'es')).toBeUndefined();
  expect(tokenAt('¡Hola, Ana!', 8, 'es')).toBe('Ana');
});
