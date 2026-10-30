import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/data/settings';
import type { LearnerContextSnapshot, TutorContext } from '@/core/tutor/types';
import {
  askTutor,
  buildTutorSystemPrompt,
  buildTutorUserPrompt,
  findMatchingGrammarTopics,
} from './tutor';

const MOCK_SNAPSHOT: LearnerContextSnapshot = {
  knownWordsCount: 240,
  studiedTopicTitles: ['present-tense', 'gender-articles'],
  recentMistakeCategories: ['agreement', 'word_order'],
  interests: ['cooking', 'travel'],
};

describe('6-15: Tutor Prompt Builder & Engine', () => {
  it('builds system prompt with teacher preset, bilingual exposure, and learner memory', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      tutor: {
        ...DEFAULT_SETTINGS.tutor,
        preset: 'teacher' as const,
        complexity: 'simple' as const,
        targetExposure: 'bilingual' as const,
      },
    };
    const sys = buildTutorSystemPrompt('es', settings, MOCK_SNAPSHOT);
    expect(sys).toContain('patient, encouraging language teacher');
    expect(sys).toContain('bilingual explanations');
    expect(sys).toContain('approx 240 words');
    expect(sys).toContain('cooking, travel');
    expect(sys).toContain('agreement, word_order');
  });

  it('builds system prompt with editor preset and technical complexity', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      tutor: {
        ...DEFAULT_SETTINGS.tutor,
        preset: 'editor' as const,
        complexity: 'technical' as const,
        targetExposure: 'mostly' as const,
      },
    };
    const sys = buildTutorSystemPrompt('fr', settings, MOCK_SNAPSHOT);
    expect(sys).toContain('meticulous writing and style editor');
    expect(sys).toContain('syntactic, and etymological precision');
    expect(sys).toContain('70% target language exposure');
  });

  it('builds system prompt with coach preset and immersion exposure', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      tutor: {
        ...DEFAULT_SETTINGS.tutor,
        preset: 'coach' as const,
        targetExposure: 'immersion' as const,
      },
    };
    const sys = buildTutorSystemPrompt('de', settings, MOCK_SNAPSHOT);
    expect(sys).toContain('energetic, pragmatic language coach');
    expect(sys).toContain('90%+ target language exposure');
  });

  it('builds hint user prompt that forbids giving away the answer (F0984)', () => {
    const ctx: TutorContext = {
      kind: 'exercise',
      lang: 'es',
      sentence: 'Yo ___ a la escuela.',
      correctAnswer: 'voy',
    };
    const prompt = buildTutorUserPrompt(ctx, 'give_hint');
    expect(prompt).toContain('Instruction: The learner needs a hint without giving away the exact answer!');
    expect(prompt).toContain('Do NOT reveal the exact solution');
  });

  it('builds why_incorrect user prompt contrasting submitted vs expected (F0967)', () => {
    const ctx: TutorContext = {
      kind: 'exercise',
      lang: 'es',
      sentence: 'Yo ___ a la escuela.',
      userAnswer: 'va',
      correctAnswer: 'voy',
    };
    const prompt = buildTutorUserPrompt(ctx, 'why_incorrect');
    expect(prompt).toContain('Learner\'s Submitted Answer: "va"');
    expect(prompt).toContain('Expected Correct Answer: "voy"');
    expect(prompt).toContain('explain specifically why their answer was incorrect');
  });

  it('builds compare_words user prompt for confusable words (F0962)', () => {
    const ctx: TutorContext = {
      kind: 'word',
      lang: 'es',
      word: 'por',
      sentence: 'Gracias por la ayuda.',
    };
    const prompt = buildTutorUserPrompt(ctx, 'compare_words');
    expect(prompt).toContain('Compare this word or concept with its closest confusable counterpart');
    expect(prompt).toContain('comparison table');
  });

  it('finds matching grammar topics for natural language queries (F0222)', async () => {
    const matched = await findMatchingGrammarTopics('es', 'subjunctive');
    expect(Array.isArray(matched)).toBe(true);
    // Spanish grammar should match subjunctive topics if present
    if (matched.length > 0) {
      expect(matched[0]).toContain('subjunctive');
    }
  });

  it('executes askTutor with mock dependency and returns structured response', async () => {
    const mockResponse = {
      title: 'Nuances of "por" vs "para"',
      summary: '"Por" marks reason, cause, or exchange, while "para" marks purpose, destination, or recipient.',
      explanation: 'In this context, "gracias por" indicates the reason you are grateful.',
      analogy: 'Think of "por" as looking back at the cause that pushed you forward, and "para" as an arrow pointing to a goal.',
      examples: [
        { target: 'Gracias por tu tiempo.', translation: 'Thanks for your time.' },
        { target: 'Este regalo es para ti.', translation: 'This gift is for you.' },
      ],
      comparison: {
        itemA: 'por',
        itemB: 'para',
        difference: 'Cause vs. Goal',
        table: [
          { feature: 'Core meaning', a: 'Reason / Exchange', b: 'Purpose / Destination' },
        ],
      },
      encouragement: 'These two trip up many learners, but remembering cause vs goal clears up 90% of cases.',
    };

    const ctx: TutorContext = {
      kind: 'word',
      lang: 'es',
      word: 'por',
      sentence: 'Gracias por tu ayuda.',
    };

    const result = await askTutor('es', ctx, 'compare_words', undefined, {
      ask: async () => mockResponse,
      snapshot: MOCK_SNAPSHOT,
    });

    expect(result.title).toBe('Nuances of "por" vs "para"');
    expect(result.explanation).toContain('indicates the reason');
    expect(result.analogy).toContain('arrow pointing to a goal');
    expect(result.examples).toHaveLength(2);
    expect(result.comparison?.itemA).toBe('por');
    expect(result.encouragement).toContain('cause vs goal');
  });
});
