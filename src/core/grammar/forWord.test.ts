import { describe, expect, it } from 'vitest';
import { topicsForWord } from './forWord';
import type { Grammar, Topic } from './types';

const t = (id: string, title: string) => ({ id, title, level: 'A1', summary: '', items: [], rule: [] }) as unknown as Topic;
const grammar: Grammar = {
  lang: 'es',
  sources: [],
  units: [{ title: 'u', topics: [t('g', 'Gender and articles'), t('p', 'The present tense'), t('r', 'Reflexive verbs'), t('pr', 'The preterite'), t('i', 'The imperfect'), t('pp', 'He comido: the present perfect')] }],
};

describe('grammar topics for a word', () => {
  it('a noun leads to gender, a verb to its tenses (three at most, earliest first)', () => {
    expect(topicsForWord(grammar, 'noun').map((x) => x.id)).toEqual(['g']);
    expect(topicsForWord(grammar, 'verb').map((x) => x.id)).toEqual(['p', 'r', 'pr']);
  });
  it('a reflexive verb gets the reflexive topic first; a word of an unknown kind gets none', () => {
    expect(topicsForWord(grammar, 'verb', true).map((x) => x.id)[0]).toBe('r');
    expect(topicsForWord(grammar, 'intj')).toEqual([]);
    expect(topicsForWord(grammar, undefined)).toEqual([]);
  });
});
