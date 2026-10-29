import { describe, expect, it } from 'vitest';
import {
  TRANSLATION_PAIRS,
  buildTranslationExercise,
  getTranslationTasks,
  validateRequirements,
} from './translate';
import { judge } from './judge';

describe('Translation Exercise Engine (Step 6-13, Slice T1)', () => {
  it('bundles authentic tasks across English and all six core languages', () => {
    const langs = ['es', 'fr', 'de', 'it', 'ru', 'zh'];
    for (const lang of langs) {
      const tasks = getTranslationTasks(lang);
      expect(tasks.length).toBeGreaterThanOrEqual(4);
      expect(tasks.some((t) => t.category === 'sentence')).toBe(true);
      expect(tasks.some((t) => t.category === 'idiom')).toBe(true);
      expect(tasks.some((t) => t.category === 'dialogue')).toBe(true);
      expect(tasks.some((t) => t.category === 'paragraph')).toBe(true);
    }
  });

  it('filters tasks by category when requested', () => {
    const idioms = getTranslationTasks('es', 'idiom');
    expect(idioms.length).toBeGreaterThan(0);
    expect(idioms.every((t) => t.category === 'idiom')).toBe(true);

    const dialogues = getTranslationTasks('de', 'dialogue');
    expect(dialogues.length).toBeGreaterThan(0);
    expect(dialogues[0].dialogue).toBeDefined();
    expect(dialogues[0].dialogue?.length).toBeGreaterThan(0);
  });

  it('builds an accepted-rule ExerciseSpec correctly', () => {
    const task = TRANSLATION_PAIRS.find((t) => t.id === 'es-1')!;
    const spec = buildTranslationExercise(task, 'accepted');

    expect(spec.kind).toBe('translate');
    expect(spec.key).toBe('translate:es-1');
    expect(spec.check.rule).toBe('accepted');
    if (spec.check.rule === 'accepted') {
      expect(spec.check.accepted).toContain('Quiero que vengas temprano.');
      expect(spec.check.accepted).toContain('Quiero que vengas pronto.');
    }
    expect(spec.body.sourceText).toBe('I want you to come early.');
    expect(spec.body.requiredWord).toBe('vengas');
    expect(spec.hints).toBeDefined();
  });

  it('judges exact matches as exact', () => {
    const task = TRANSLATION_PAIRS.find((t) => t.id === 'es-1')!;
    const spec = buildTranslationExercise(task, 'accepted');
    const result = judge(spec.check, 'Quiero que vengas temprano.', 'es');

    expect(result.verdict).toBe('exact');
    expect(result.outcome).toBe('right');
  });

  it('judges valid alternate translations as exact', () => {
    const task = TRANSLATION_PAIRS.find((t) => t.id === 'es-1')!;
    const spec = buildTranslationExercise(task, 'accepted');
    const result = judge(spec.check, 'Quiero que vengas pronto.', 'es');

    expect(result.verdict).toBe('exact');
    expect(result.outcome).toBe('right');
  });

  it('judges minor accent slip as close or exact depending on normalizer', () => {
    const task = TRANSLATION_PAIRS.find((t) => t.id === 'de-1')!;
    const spec = buildTranslationExercise(task, 'accepted');
    const result = judge(spec.check, 'Morgen gehe ich zur Schule', 'de');

    expect(result.verdict).toBe('exact');
  });

  it('judges completely incorrect translations as wrong', () => {
    const task = TRANSLATION_PAIRS.find((t) => t.id === 'es-1')!;
    const spec = buildTranslationExercise(task, 'accepted');
    const result = judge(spec.check, 'No me gusta nada esto.', 'es');

    expect(result.verdict).toBe('wrong');
    expect(result.outcome).toBe('wrong');
  });

  it('validates required vocabulary words in answers', () => {
    const valid = validateRequirements('Quiero que vengas temprano.', 'vengas');
    expect(valid.valid).toBe(true);

    const missing = validateRequirements('Quiero que llegues temprano.', 'vengas');
    expect(missing.valid).toBe(false);
    expect(missing.missingRequirement).toContain('vengas');
  });
});
