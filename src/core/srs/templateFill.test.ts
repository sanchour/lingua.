import { describe, expect, it } from 'vitest';
import type { FullDictRow } from '@/core/dictionary/format';
import { fillFromEntry } from './templateFill';

const row: FullDictRow = {
  lang: 'es',
  key: 'casa',
  fold: 'casa',
  word: 'casa',
  entries: [
    {
      pos: 'noun',
      gender: 'f',
      pair: [['plural', 'casas']],
      senses: [{ g: ['house'], syn: ['hogar', 'vivienda'], ant: ['calle'] }, { g: ['home'], tags: ['uncountable'] }, { g: ['household'] }],
      syn: ['domicilio', 'hogar'],
      phrases: [['casa de campo', 'country house'], ['en casa']],
      derived: ['casero', 'casita'],
      related: ['caserío'],
    },
  ],
  mono: [{ pos: 'noun', defs: ['Edificio para habitar.'] }],
};

describe('filling a card from the dictionary', () => {
  it('writes each field one line at a time, from what the entry has', () => {
    expect(fillFromEntry(row, 'definition')).toBe('Edificio para habitar.');
    expect(fillFromEntry(row, 'synonyms')).toBe('domicilio\nhogar\nvivienda');
    expect(fillFromEntry(row, 'antonyms')).toBe('calle');
    expect(fillFromEntry(row, 'collocations')).toBe('casa de campo: country house\nen casa');
    expect(fillFromEntry(row, 'grammar')).toBe('Kind of word: noun\nGender: feminine\nPlural: casas\nUse: uncountable');
    expect(fillFromEntry(row, 'meanings')).toBe('home\nhousehold');
    expect(fillFromEntry(row, 'related')).toBe('casero\ncasita\ncaserío');
  });

  it('falls back to the first meaning for a definition, and leaves what it has nothing for empty', () => {
    expect(fillFromEntry({ ...row, mono: undefined }, 'definition')).toBe('house');
    const bare: FullDictRow = { ...row, entries: [{ pos: 'adv', senses: [{ g: ['well'] }] }], mono: undefined };
    expect(fillFromEntry(bare, 'synonyms')).toBe('');
    expect(fillFromEntry(bare, 'collocations')).toBe('');
    expect(fillFromEntry(bare, 'meanings')).toBe('');
    expect(fillFromEntry(bare, 'grammar')).toBe('Kind of word: adv');
    expect(fillFromEntry(bare, 'paragraph')).toBe('');
  });
});
