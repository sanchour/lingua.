// Facts the language map must get right (Lingua 5.1-2b), from CLDR and the hand-added places.
import { describe, expect, it } from 'vitest';
import { AVAILABLE_LANGUAGES, LANGUAGES } from '@/core/lang/languages';
import levelSentences from './levelSentences.json';
import { languagesIn, placesOf } from './territories';

const status = (lang: string, country: string) => placesOf(lang).find((p) => p.country === country)?.status;

describe('where languages are spoken', () => {
  it('knows official, regional and minority languages', () => {
    expect(status('ca', 'AD')).toBe('official');
    expect(status('ca', 'ES')).toBe('regional');
    expect(status('eu', 'ES')).toBe('regional');
    expect(status('fy', 'NL')).toBe('regional');
    expect(status('mi', 'NZ')).toBe('official');
    expect(status('haw', 'US')).toBe('regional');
    expect(status('sw', 'KE')).toBe('official');
    expect(status('sw', 'TZ')).toBe('official');
    expect(placesOf('ar').filter((p) => p.status === 'official').length).toBeGreaterThanOrEqual(20);
  });

  it('places dead and classical languages by hand, and Esperanto nowhere', () => {
    expect(status('la', 'VA')).toBe('official');
    expect(status('grc', 'GR')).toBe('historical');
    expect(status('non', 'IS')).toBe('historical');
    expect(placesOf('eo')).toEqual([]);
    for (const l of LANGUAGES) if (l.code !== 'eo') expect(placesOf(l.code).length, l.code).toBeGreaterThan(0);
  });

  it('lists a country’s languages official first: Spain is Spanish, then Catalan and Basque', () => {
    const spain = languagesIn('ES').map((l) => l.lang);
    expect(spain[0]).toBe('es');
    expect(spain.slice(1, 3).sort()).toEqual(['ca', 'eu']);
    expect(languagesIn('ES').slice(0, 3).every((l) => l.status !== 'widely')).toBe(true);
  });
});

describe('the level sentences', () => {
  it('has five, A1 to C1, for every language that can be chosen', () => {
    const table = levelSentences as Record<string, Array<{ level: string; text: string }>>;
    for (const { code } of AVAILABLE_LANGUAGES) {
      expect(table[code]?.map((s) => s.level), code).toEqual(['A1', 'A2', 'B1', 'B2', 'C1']);
      expect(new Set(table[code].map((s) => s.text)).size, code).toBe(5);
    }
  });
});
