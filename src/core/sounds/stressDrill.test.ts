import { describe, expect, it } from 'vitest';
import type { FullDictRow } from '@/core/dictionary/format';
import { stressQuestion } from './stressDrill';

const row = (word: string, entry: { syl?: string[]; stress?: number }) => ({ word, entries: [{ pos: 'noun', senses: [], ...entry }] }) as unknown as FullDictRow;

describe('which syllable is stressed', () => {
  it('Spanish: from the spelling', () => {
    expect(stressQuestion('es', row('hablar', { syl: ['ha', 'blar'] }))).toEqual({ word: 'hablar', syllables: ['ha', 'blar'], answer: 1 });
    expect(stressQuestion('es', row('árbol', { syl: ['ár', 'bol'] }))?.answer).toBe(0);
  });
  it('Russian: from the dictionary’s mark, shown without it', () => {
    expect(stressQuestion('ru', row('вода', { syl: ['во́', 'да'], stress: 1 }))?.answer).toBe(1);
    expect(stressQuestion('ru', row('вода', { syl: ['во́', 'да'], stress: 1 }))?.syllables[0]).toBe('во');
  });
  it('is not asked where it cannot be known', () => {
    expect(stressQuestion('fr', row('maison', { syl: ['mai', 'son'] }))).toBeNull();
    expect(stressQuestion('ru', row('вода', { syl: ['во', 'да'] }))).toBeNull();
    expect(stressQuestion('es', row('sol', { syl: ['sol'] }))).toBeNull();
  });
});
