import { describe, expect, it } from 'vitest';
import { easiestFirst, sentenceDifficulty } from './difficulty';

const ranks: Record<string, number> = { el: 1, perro: 500, come: 300, hipopótamo: 15000 };
const rankOf = (w: string) => ranks[w];
const wordsOf = (t: string) => t.toLowerCase().match(/\p{L}+/gu) ?? [];

describe('how hard a sentence is', () => {
  it('is the mean rank of its words, with the unknown ones counted as rare', () => {
    expect(sentenceDifficulty(['el', 'perro'], rankOf)).toBe(250.5);
    expect(sentenceDifficulty(['el', 'zzz'], rankOf)).toBe(10000.5);
    expect(sentenceDifficulty([], rankOf)).toBe(20000);
  });
  it('puts the sentence of common words first, and one with words nobody has ranked last, not the shortest first', () => {
    const list = ['El hipopótamo come', 'El perro come mucho zzz', 'El perro come'];
    expect(easiestFirst(list, (s) => s, wordsOf, rankOf)).toEqual(['El perro come', 'El hipopótamo come', 'El perro come mucho zzz']);
  });
  it('keeps the order given when they are equally hard', () => {
    expect(easiestFirst(['a el', 'b el'], (s) => s, () => ['el'], rankOf)).toEqual(['a el', 'b el']);
  });
});
