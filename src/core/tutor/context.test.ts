import { describe, expect, it } from 'vitest';
import { suggestTutorActions } from './context';
import type { TutorContext } from './types';
import { TUTOR_PRESETS } from '@/data/settings';

describe('6-15: Tutor Context & Action Suggestions', () => {
  it('suggests word-focused prompt chips for word context', () => {
    const ctx: TutorContext = {
      kind: 'word',
      lang: 'es',
      word: 'ojalá',
      sentence: '¡Ojalá llueva pronto!',
    };
    const chips = suggestTutorActions(ctx);
    const actions = chips.map((c) => c.action);
    expect(actions).toContain('explain_nuance');
    expect(actions).toContain('more_examples');
    expect(actions).toContain('compare_words');
    expect(actions).toContain('idiom_slang');
    expect(actions).toContain('pronunciation');
  });

  it('suggests grammar-focused chips for grammar context', () => {
    const ctx: TutorContext = {
      kind: 'grammar',
      lang: 'fr',
      topicId: 'fr-subjonctif',
      topicTitle: 'Le Subjonctif Présent',
    };
    const chips = suggestTutorActions(ctx);
    const actions = chips.map((c) => c.action);
    expect(actions).toContain('grammar_simple');
    expect(actions).toContain('analogy');
    expect(actions).toContain('connections');
    expect(actions).toContain('simplify');
  });

  it('suggests hints and error breakdown for exercise and card contexts', () => {
    const ctx: TutorContext = {
      kind: 'exercise',
      lang: 'de',
      sentence: 'Er geht in ___ Schule.',
      userAnswer: 'der',
      correctAnswer: 'die',
    };
    const chips = suggestTutorActions(ctx);
    const actions = chips.map((c) => c.action);
    expect(actions).toContain('give_hint');
    expect(actions).toContain('why_incorrect');
    expect(actions).toContain('grammar_simple');
  });

  it('suggests correction explanation for diarium correction context', () => {
    const ctx: TutorContext = {
      kind: 'correction',
      lang: 'es',
      sentence: 'Ayer comí mucho.',
      userAnswer: 'Ayer he comido mucho.',
      correctAnswer: 'Ayer comí mucho.',
    };
    const chips = suggestTutorActions(ctx);
    const actions = chips.map((c) => c.action);
    expect(actions).toContain('why_incorrect');
    expect(actions).toContain('explain_nuance');
  });

  it('defines valid teacher, editor, and coach preset configurations', () => {
    expect(TUTOR_PRESETS.teacher.name).toBe('Patient Teacher');
    expect(TUTOR_PRESETS.teacher.settings.complexity).toBe('simple');
    expect(TUTOR_PRESETS.teacher.settings.targetExposure).toBe('bilingual');

    expect(TUTOR_PRESETS.editor.name).toBe('Writing Editor');
    expect(TUTOR_PRESETS.editor.settings.complexity).toBe('technical');
    expect(TUTOR_PRESETS.editor.settings.correctionFrequency).toBe('strict');

    expect(TUTOR_PRESETS.coach.name).toBe('Language Coach');
    expect(TUTOR_PRESETS.coach.settings.targetExposure).toBe('mostly');
    expect(TUTOR_PRESETS.coach.settings.correctionFrequency).toBe('gentle');
  });
});
