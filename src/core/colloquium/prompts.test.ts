import { describe, expect, it } from 'vitest';
import { getLanguage } from '@/core/lang/languages';
import { asScene, buildPrompt, promptInLanguage, sceneOfTheDay, SCENES, scenesFor } from './prompts';
import type { PromptOptions } from './prompts';

/** The core twenty but English: each has its own wording. */
const CORE = ['es', 'fr', 'de', 'it', 'pt', 'ru', 'el', 'sv', 'hu', 'nl', 'nb', 'tr', 'id', 'sw', 'la', 'ar', 'zh', 'ja', 'ko'];

const all: PromptOptions = { scene: 'cafe', level: 'A2', correct: true, slow: true, voice: true, words: ['uno', 'dos'], topic: 'TOPIC-X' };
const bare: PromptOptions = { scene: 'cafe', level: 'B1', correct: false, slow: false, voice: false, words: [] };
const english = buildPrompt('en', all);

describe('buildPrompt', () => {
  it.each(CORE)('writes every scene in %s, with no placeholder left', (lang) => {
    expect(promptInLanguage(lang)).toBe(true);
    for (const scene of SCENES) {
      const p = buildPrompt(lang, { ...all, scene });
      expect(p).not.toMatch(/[{}]/);
      expect(p).toContain('uno');
      expect(p).toContain('dos');
      expect(p).toContain('TOPIC-X');
      expect(p).toContain('A2');
    }
    // Written in the language, not the English wording.
    expect(buildPrompt(lang, all).slice(0, 30)).not.toBe(english.slice(0, 30));
  });

  it('leaves out the wishes that are off', () => {
    for (const lang of ['en', ...CORE]) {
      const full = buildPrompt(lang, all);
      const short = buildPrompt(lang, { ...bare, level: 'A2' });
      expect(short.length).toBeLessThan(full.length);
      expect(short).not.toContain('TOPIC-X');
    }
  });

  it('asks a beginner for A1', () => {
    expect(buildPrompt('es', { ...bare, level: 'A0' })).toContain('A1');
  });

  it('writes beta languages in English, naming the language', () => {
    expect(promptInLanguage('fi')).toBe(false);
    expect(buildPrompt('fi', bare)).toContain(getLanguage('fi')?.name ?? 'fi');
  });

  it('joins Chinese and Japanese sentences without spaces, and lists words their way', () => {
    for (const lang of ['zh', 'ja']) {
      const p = buildPrompt(lang, all);
      expect(p).not.toMatch(/[。？！] /);
      expect(p).toContain('uno、dos');
    }
    expect(buildPrompt('ar', all)).toContain('uno، dos');
    expect(buildPrompt('es', all)).toContain('uno, dos');
  });
});

describe('scenes', () => {
  it('gives a beginner only the A1 scenes and a B2 learner all of them', () => {
    expect(scenesFor('A0')).toEqual(scenesFor('A1'));
    expect(scenesFor('A1')).not.toContain('doctor');
    expect(scenesFor('A2')).toContain('doctor');
    expect(scenesFor('A2')).not.toContain('debate');
    expect(scenesFor('B2')).toEqual([...SCENES]);
  });

  it('turns through the fitting scenes, one a day', () => {
    const week = Array.from({ length: 5 }, (_, d) => sceneOfTheDay('A1', d));
    expect(new Set(week).size).toBe(5);
    expect(sceneOfTheDay('A1', 5)).toBe(sceneOfTheDay('A1', 0));
    expect(scenesFor('A1')).toContain(sceneOfTheDay('A1', -3));
  });

  it('reads a scene from a link, and nothing else', () => {
    expect(asScene('market')).toBe('market');
    expect(asScene('nope')).toBeUndefined();
    expect(asScene(null)).toBeUndefined();
  });
});
