// 6-4's safety net: what Ludus and the grammar lessons plan today, for fixed seeds, written down before the engine
// touched them. The engine only adds kinds; with the new ones off or without a source, these plans must not move.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { planLesson, planLightning, seededRandom } from '@/core/srs/ludus';
import type { LudusItem } from '@/core/srs/ludus';
import { planTopicLesson } from '@/core/grammar/drills';
import type { DrillKind } from '@/core/grammar/drills';
import { topicsOf } from '@/core/grammar/types';
import type { Grammar } from '@/core/grammar/types';

const ITEMS: LudusItem[] = [
  { id: '1', term: 'perro', meaning: 'dog', pos: 'noun', gender: 'm', example: { text: 'El perro duerme en casa.', translation: 'The dog sleeps at home.', cloze: [3, 8] }, isNew: false },
  { id: '2', term: 'gato', meaning: 'cat', pos: 'noun', gender: 'm', example: { text: 'Mi gato come pescado hoy.', translation: 'My cat eats fish today.', cloze: [3, 7] }, isNew: true },
  { id: '3', term: 'casa', meaning: 'house', pos: 'noun', gender: 'f', isNew: false },
  { id: '4', term: 'comer', meaning: 'to eat', pos: 'verb', isNew: false },
  { id: '5', term: 'beber', meaning: 'to drink', pos: 'verb', isNew: true },
  { id: '6', term: 'grande', meaning: 'big', pos: 'adj', isNew: false },
];

/** A plan reduced to what a learner sees: the kind, its card, and the answer where there is one. */
const shown = (plan: ReturnType<typeof planLesson>) =>
  plan.map((e) => ({
    kind: e.kind,
    card: e.kind === 'match' ? e.items.map((i) => i.id) : e.item.id,
    options: 'options' in e ? e.options : undefined,
    answer: 'answer' in e ? e.answer : undefined,
  }));

describe('Ludus plans, as they were before the engine', () => {
  for (const seed of [1, 7, 42]) {
    it(`a lesson, seed ${seed}`, () => {
      expect(shown(planLesson(ITEMS, ITEMS, { random: seededRandom(seed), canHear: true, canSpell: true }))).toMatchSnapshot();
    });
  }
  it('a lesson with every extra off', () => {
    expect(shown(planLesson(ITEMS, ITEMS, { random: seededRandom(3), match: false, typing: false }))).toMatchSnapshot();
  });
  it('lightning', () => {
    expect(shown(planLightning(ITEMS, ITEMS, seededRandom(5), 12))).toMatchSnapshot();
  });
});

const TOPICS = join(process.cwd(), 'src', 'core', 'grammar', 'topics');
const es = ((await import(/* @vite-ignore */ pathToFileURL(join(TOPICS, readdirSync(TOPICS).find((f) => f.startsWith('es'))!)).href)) as { default: Grammar }).default;
const topic = topicsOf(es).find((t) => (t.tables ?? []).length && t.items.length >= 6)!;

// The engine's new kind is switched off: what is left must be exactly what was planned before it.
const drills = (step: 1 | 2 | 3 | 4 | 5 | 'mix', seed: number, off: ReadonlySet<DrillKind> = new Set()) =>
  planTopicLesson(topic, 'es', step, { random: seededRandom(seed), canHear: true, size: 8, off: new Set<DrillKind>([...off, 'transform']) }).map((d) => ({ kind: d.kind, topic: d.topic, answer: 'answer' in d ? d.answer : undefined }));

describe('grammar lessons, as they were before the engine', () => {
  for (const step of [1, 2, 3, 4, 5, 'mix'] as const) {
    it(`step ${step}`, () => {
      expect(drills(step, 11)).toMatchSnapshot();
    });
  }
  it('step 2 with the table exercise off', () => {
    expect(drills(2, 5, new Set<DrillKind>(['table']))).toMatchSnapshot();
  });
});

describe('with the engine on', () => {
  it('a lesson on forms asks for two transformations, and the other steps none', () => {
    const kinds = (step: 1 | 2 | 3 | 4 | 5 | 'mix') => planTopicLesson(topic, 'es', step, { random: seededRandom(11), canHear: true, size: 8 }).map((d) => d.kind);
    for (const step of [2, 'mix'] as const) expect(kinds(step).filter((k) => k === 'transform').length).toBeGreaterThan(0);
    for (const step of [1, 3, 4, 5] as const) expect(kinds(step)).not.toContain('transform');
  });
});
