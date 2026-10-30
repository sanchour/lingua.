import { describe, expect, it } from 'vitest';
import { SOUND_SYSTEMS, soundSystemOf } from './index';

describe('the sound systems', () => {
  it('cover the six core languages, each with sounds, words with meanings and rules', () => {
    expect(Object.keys(SOUND_SYSTEMS).sort()).toEqual(['ar', 'de', 'es', 'fr', 'ru', 'zh']);
    for (const [lang, system] of Object.entries(SOUND_SYSTEMS)) {
      expect(system.lang).toBe(lang);
      expect(system.sounds.length).toBeGreaterThan(10);
      expect(system.rules.length).toBeGreaterThanOrEqual(3);
      for (const s of system.sounds) {
        expect(s.ipa).toBeTruthy();
        expect(s.words.length).toBeGreaterThan(0);
        expect(s.note.length).toBeGreaterThan(10);
        for (const [word, meaning] of s.words) expect(word && meaning).toBeTruthy();
      }
    }
  });
  it('place each sound on its chart: a vowel by position, a consonant by place and manner, a tone by contour', () => {
    for (const system of Object.values(SOUND_SYSTEMS)) {
      for (const s of system.sounds) {
        if (s.kind === 'vowel') expect([s.frontness, s.height].every((n) => Number.isInteger(n) && n >= 0 && n <= 3)).toBe(true);
        if (s.kind === 'consonant') expect(s.place && s.manner && typeof s.voiced === 'boolean').toBeTruthy();
        if (s.kind === 'tone') expect(s.contour.length).toBeGreaterThanOrEqual(2);
      }
    }
  });
  it('write each sound once', () => {
    for (const system of Object.values(SOUND_SYSTEMS)) {
      const ipas = system.sounds.map((s) => s.ipa);
      expect(new Set(ipas).size).toBe(ipas.length);
    }
    expect(soundSystemOf('en')).toBeUndefined();
  });
});

describe('minimal pairs', () => {
  it('are there for each language, two different words with meanings and the contrast said', async () => {
    const { MINIMAL_PAIRS, pairsOf } = await import('./pairs');
    expect(Object.keys(MINIMAL_PAIRS).sort()).toEqual(Object.keys(SOUND_SYSTEMS).sort());
    for (const pairs of Object.values(MINIMAL_PAIRS)) {
      expect(pairs.length).toBeGreaterThanOrEqual(6);
      for (const p of pairs) {
        expect(p.a).not.toBe(p.b);
        expect(p.gloss[0] && p.gloss[1] && p.contrast).toBeTruthy();
      }
    }
    expect(pairsOf('en')).toEqual([]);
  });
});
