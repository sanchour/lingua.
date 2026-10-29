import { describe, expect, it } from 'vitest';
import {
  buildPersonalizedChallenge,
  CATEGORY_LABELS,
  getSoloChallenges,
  SOLO_CHALLENGES,
  type SoloCategory,
} from './soloChallenges';

describe('soloChallenges', () => {
  it('has predefined challenges for all required speaking types', () => {
    const categories = new Set(SOLO_CHALLENGES.map((c) => c.category));
    expect(categories.has('prompt30')).toBe(true);
    expect(categories.has('monologue60')).toBe(true);
    expect(categories.has('storytelling')).toBe(true);
    expect(categories.has('picture')).toBe(true);
    expect(categories.has('explain')).toBe(true);
    expect(categories.has('debate')).toBe(true);
    expect(categories.has('repeat')).toBe(true);
  });

  it('provides descriptions for each category in CATEGORY_LABELS', () => {
    const keys: SoloCategory[] = ['prompt30', 'monologue60', 'storytelling', 'picture', 'explain', 'debate', 'repeat', 'personalized'];
    for (const k of keys) {
      expect(CATEGORY_LABELS[k].label).toBeTruthy();
      expect(CATEGORY_LABELS[k].detail).toBeTruthy();
    }
  });

  it('filters challenges by category and level', () => {
    const prompts30 = getSoloChallenges('en', 'prompt30');
    expect(prompts30.length).toBeGreaterThanOrEqual(3);
    for (const p of prompts30) {
      expect(p.category).toBe('prompt30');
      expect(p.targetSeconds).toBe(30);
    }

    const b2Debates = getSoloChallenges('en', 'debate', 'B2');
    expect(b2Debates.length).toBeGreaterThan(0);
    for (const d of b2Debates) {
      expect(d.category).toBe('debate');
    }
  });

  it('creates personalized challenges containing learner words and topics (F0607)', () => {
    const words = ['desafío', 'lograr', 'costumbre'];
    const p = buildPersonalizedChallenge('es', 'B1', words, 'Subjunctive mood');
    expect(p.category).toBe('personalized');
    expect(p.prompt).toContain('Subjunctive mood');
    expect(p.prompt).toContain('desafío');
    expect(p.targetSeconds).toBe(60);
    expect(p.hints.length).toBeGreaterThanOrEqual(3);
  });

  it('has valid durations and hints on all challenges', () => {
    for (const c of SOLO_CHALLENGES) {
      expect(c.targetSeconds).toBeGreaterThan(0);
      expect(c.prepSeconds).toBeGreaterThan(0);
      expect(c.hints.length).toBeGreaterThanOrEqual(2);
      expect(c.title).toBeTruthy();
      expect(c.prompt).toBeTruthy();
    }
  });
});
