import { describe, expect, it } from 'vitest';
import { getLanguage, LANGUAGES } from '@/core/lang/languages';
import { SCENE_ICONS } from '@/features/colloquium/sceneArt';
import { AIS } from './ais';
import { asScene, buildPrompt, getScene, promptInLanguage, sceneOfTheDay, SCENES, scenesFor } from './prompts';
import type { PromptOptions } from './prompts';
import { GROUPS, searchScenes } from './scenes';

/** The core twenty but English: each has its own wording. */
const CORE = ['es', 'fr', 'de', 'it', 'pt', 'ru', 'el', 'sv', 'hu', 'nl', 'nb', 'tr', 'id', 'sw', 'la', 'ar', 'zh', 'ja', 'ko'];
/** Tier 1 and 2: every scene's prompt is built in each of them. */
const TIERED = LANGUAGES.filter((l) => l.tier === 1 || l.tier === 2).map((l) => l.code);

const all: PromptOptions = { scene: 'cafe', level: 'A2', correct: true, slow: true, voice: true, help: true, minutes: 10, words: ['uno', 'dos'], topic: 'TOPIC-X' };
const bare: PromptOptions = { scene: 'cafe', level: 'B1', correct: false, slow: false, voice: false, words: [] };
const english = buildPrompt('en', all);

describe('the scenes', () => {
  it('has about eighty, each with a group, a level range, roles, three to five goals and a picture', () => {
    expect(SCENES.length).toBeGreaterThanOrEqual(75);
    expect(new Set(SCENES.map((s) => s.id)).size).toBe(SCENES.length);
    const groups = new Set(GROUPS.map((g) => g.id));
    for (const s of SCENES) {
      expect(groups.has(s.group), s.id).toBe(true);
      expect(s.goals.length, s.id).toBeGreaterThanOrEqual(3);
      expect(s.goals.length, s.id).toBeLessThanOrEqual(5);
      expect(s.ai && s.you && s.setting, s.id).toBeTruthy();
      expect(SCENE_ICONS[s.icon], `${s.id}: ${s.icon}`).toBeDefined();
      expect(['A1', 'A2', 'B1', 'B2', 'C1'].indexOf(s.from), s.id).toBeLessThanOrEqual(['A1', 'A2', 'B1', 'B2', 'C1'].indexOf(s.to));
    }
  });

  it.each(TIERED)('builds every scene’s prompt in %s, with nothing left to fill in', (lang) => {
    for (const s of SCENES) {
      for (const correct of [true, 'end', false] as const) {
        const p = buildPrompt(lang, { ...all, scene: s.id, correct });
        expect(p, `${lang} ${s.id}`).not.toMatch(/[{}]/);
        expect(p).toContain('A2');
        expect(p).toContain(s.goals[0]);
      }
    }
  });

  it('gives a beginner A1 scenes and leaves the hardest to the advanced', () => {
    expect(scenesFor('A0')).toEqual(scenesFor('A1'));
    expect(scenesFor('A1').map((s) => s.id)).not.toContain('doctor');
    expect(scenesFor('A2').map((s) => s.id)).toContain('doctor');
    expect(scenesFor('C1').map((s) => s.id)).toContain('debate');
    expect(scenesFor('C1').map((s) => s.id)).not.toContain('bakery');
  });

  it('turns through the fitting scenes, one a day', () => {
    const week = Array.from({ length: 5 }, (_, d) => sceneOfTheDay('A1', d).id);
    expect(new Set(week).size).toBe(5);
    expect(scenesFor('A1')).toContain(sceneOfTheDay('A1', -3));
  });

  it('finds scenes by their words, accent-blind', () => {
    expect(searchScenes(SCENES, 'cafe').map((s) => s.id)).toContain('cafe');
    expect(searchScenes(SCENES, 'PLUMBER').map((s) => s.id)).toEqual(['repair']);
  });

  it('reads a scene from a link, and nothing else', () => {
    expect(asScene('market')).toBe('market');
    expect(asScene('airport')).toBe('airport');
    expect(asScene('nope')).toBeUndefined();
    expect(asScene(null)).toBeUndefined();
  });
});

describe('buildPrompt', () => {
  it.each(CORE)('writes the frame in %s', (lang) => {
    expect(promptInLanguage(lang)).toBe(true);
    const p = buildPrompt(lang, all);
    expect(p).toContain('uno');
    expect(p).toContain('TOPIC-X');
    expect(p.slice(0, 30)).not.toBe(english.slice(0, 30));
  });

  it('puts a scene without its own sentence in English, inside the language’s frame', () => {
    const p = buildPrompt('es', { ...bare, scene: 'airport' });
    expect(p).toMatch(/^Practiquemos español/);
    expect(p).toContain('escrita en inglés');
    expect(p).toContain(getScene('airport')!.setting);
    expect(p).toContain('You play an airline check-in agent');
  });

  it('asks for corrections as I go, at the end, or not at all', () => {
    expect(buildPrompt('en', { ...bare, correct: true })).toContain('After each of my answers');
    expect(buildPrompt('en', { ...bare, correct: 'end' })).toContain('when we finish, list my mistakes');
    const off = buildPrompt('en', bare);
    expect(off).not.toContain('After each of my answers');
    expect(off).not.toContain('list my mistakes');
  });

  it('adds help and a length only when asked', () => {
    expect(english).toContain('If I get stuck');
    expect(english).toContain('about 10 minutes');
    expect(buildPrompt('en', bare)).not.toContain('minutes');
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

describe('the AIs', () => {
  it('carry only the prompt in their links', () => {
    for (const ai of AIS) {
      const url = new URL(ai.link('Hola & adiós'));
      expect(url.protocol).toBe('https:');
      if (ai.fills) expect([...url.searchParams.entries()]).toEqual([['q', 'Hola & adiós']]);
      else expect(url.search).toBe('');
    }
  });
});
