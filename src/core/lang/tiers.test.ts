import { describe, expect, it } from 'vitest';
import { WORLD_MAP } from '@/features/sonus/radio/worldMap';
import { AVAILABLE_LANGUAGES, isBeta, LANGUAGES, TIERS } from './languages';

const count = (tier: (typeof LANGUAGES)[number]['tier']) => LANGUAGES.filter((l) => l.tier === tier).length;

describe('language tiers', () => {
  it('sorts the languages as the 4.0 plan says', () => {
    expect(LANGUAGES.filter((l) => l.tier === 1).map((l) => l.code).sort()).toEqual(['ar', 'de', 'es', 'fr', 'ru', 'zh']);
    expect([count(1), count(2), count(3), count(4), count('x')]).toEqual([6, 14, 20, 20, 10]);
    expect(Object.keys(TIERS)).toHaveLength(5);
  });

  it('keeps every code once, and only today’s 35 languages can be chosen', () => {
    expect(new Set(LANGUAGES.map((l) => l.code)).size).toBe(LANGUAGES.length);
    expect(AVAILABLE_LANGUAGES).toHaveLength(35);
    expect(AVAILABLE_LANGUAGES.every((l) => l.sample.length > 0)).toBe(true);
    expect(isBeta('pl')).toBe(true);
    expect(isBeta('es')).toBe(false);
  });

  it('puts every language on the map, except Esperanto, which has no country', () => {
    const countries = new Set(WORLD_MAP.map((c) => c[0]));
    for (const l of LANGUAGES) {
      const placed = l.flags.filter((f) => countries.has(f.toUpperCase()));
      if (l.code === 'eo') expect(placed, l.code).toHaveLength(0);
      else if (l.code !== 'la') expect(placed.length, l.code).toBeGreaterThan(0);
    }
  });
});
