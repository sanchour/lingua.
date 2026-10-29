import { describe, expect, it } from 'vitest';
import {
  CONTRAST_PAIRS,
  getContrastPair,
  listAvailablePairs,
} from './contrastData';

describe('Language Contrast Engine (Step 6-13, Slice T3)', () => {
  it('covers English with all six core languages and Romance cross-pair', () => {
    const pairs = listAvailablePairs();
    expect(pairs.length).toBeGreaterThanOrEqual(7);
    const core = ['es', 'fr', 'de', 'it', 'ru', 'zh'];

    for (const lang of core) {
      const found = getContrastPair('en', lang);
      expect(found).toBeDefined();
      expect(found?.items.length).toBeGreaterThanOrEqual(3);
    }

    // Romance cross-pair (F1341)
    const romance = getContrastPair('es', 'fr');
    expect(romance).toBeDefined();
    expect(romance?.items.some((i) => i.dimension === 'false-friends')).toBe(true);
  });

  it('provides structural contrast dimensions', () => {
    const dimensions = new Set(
      CONTRAST_PAIRS.flatMap((p) => p.items.map((i) => i.dimension)),
    );

    expect(dimensions.has('word-order')).toBe(true);
    expect(dimensions.has('gender')).toBe(true);
    expect(dimensions.has('cases')).toBe(true);
    expect(dimensions.has('tense-aspect')).toBe(true);
    expect(dimensions.has('articles')).toBe(true);
    expect(dimensions.has('prepositions')).toBe(true);
    expect(dimensions.has('politeness')).toBe(true);
    expect(dimensions.has('false-friends')).toBe(true);
    expect(dimensions.has('culture-semantics')).toBe(true);
  });

  it('includes high-risk false friends with deceptive lookalikes', () => {
    const es = getContrastPair('en', 'es')!;
    const ffItem = es.items.find((i) => i.dimension === 'false-friends')!;
    expect(ffItem.falseFriends).toBeDefined();
    expect(ffItem.falseFriends?.length).toBeGreaterThan(0);

    const embar = ffItem.falseFriends?.find((f) => f.term.includes('embarazada'));
    expect(embar).toBeDefined();
    expect(embar?.actualMeaning).toBe('pregnant');

    const de = getContrastPair('en', 'de')!;
    const deFf = de.items.find((i) => i.dimension === 'false-friends')!;
    const gift = deFf.falseFriends?.find((f) => f.term.includes('Gift'));
    expect(gift).toBeDefined();
    expect(gift?.actualMeaning).toContain('poison');
  });

  it('supports reverse pair lookups', () => {
    const direct = getContrastPair('en', 'de');
    const reverse = getContrastPair('de', 'en');
    expect(direct).toEqual(reverse);
  });
});
