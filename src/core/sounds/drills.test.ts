import { describe, expect, it } from 'vitest';
import { drillsOf, randomTest } from './drills';

describe('drills', () => {
  it('every core language has drills, and no text is empty or repeated within a language', () => {
    for (const lang of ['es', 'fr', 'de', 'ru', 'ar', 'zh']) {
      const texts = drillsOf(lang).flatMap((g) => g.items.map((i) => i.text));
      expect(texts.length, lang).toBeGreaterThan(10);
      expect(texts.every((t) => t.trim().length > 0), lang).toBe(true);
      expect(new Set(texts).size, lang).toBe(texts.length);
    }
  });

  it('the tonal, nasal, soft and heavy drills exist where the audit asks for them', () => {
    expect(drillsOf('zh').map((g) => g.id)).toEqual(expect.arrayContaining(['tones', 'contrasts']));
    expect(drillsOf('fr').map((g) => g.id)).toContain('nasal');
    expect(drillsOf('ru').map((g) => g.id)).toContain('soft');
    expect(drillsOf('ar').map((g) => g.id)).toContain('emphatic');
  });

  it('a random test gives n different items', () => {
    const t = randomTest('es', 5, () => 0.3);
    expect(t).toHaveLength(5);
    expect(new Set(t).size).toBe(5);
    expect(randomTest('xx', 5)).toEqual([]);
  });
});
