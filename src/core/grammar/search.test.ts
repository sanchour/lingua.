import { describe, expect, it } from 'vitest';
import { searchTopics } from './search';
import type { Grammar } from './types';

const mockGrammar: Grammar = {
  lang: 'es',
  sources: [],
  units: [
    {
      title: 'Basics',
      topics: [
        {
          id: 'articles',
          title: 'Gender and articles',
          level: 'A1',
          summary: 'Every noun is masculine or feminine, and the article shows which.',
          rule: ['Spanish nouns are masculine or feminine.'],
          why: 'El and la are articles.',
          tags: ['noun', 'gender', 'article'],
          items: [{ s: '[El] sol brilla.', en: 'The sun shines.', wrong: ['La', 'Los', 'Las'] }],
        },
        {
          id: 'present',
          title: 'Present tense of regular verbs',
          level: 'A1',
          summary: 'How verbs conjugate in the present for -ar, -er, -ir.',
          rule: ['Verbs change endings based on person.'],
          why: 'Verbs match the subject.',
          tags: ['verb', 'present', 'indicative'],
          items: [{ s: 'Yo [hablo] español.', en: 'I speak Spanish.', wrong: ['habla', 'hablas', 'hablamos'] }],
        },
        {
          id: 'preterite',
          title: 'Preterite tense',
          level: 'A2',
          summary: 'Completed actions in the past.',
          rule: ['Use preterite for single finished events.'],
          why: 'Completed past actions take preterite.',
          tags: ['verb', 'past', 'preterite'],
          items: [{ s: 'Ayer [comí] paella.', en: 'Yesterday I ate paella.', wrong: ['como', 'comía', 'comeré'] }],
        },
        {
          id: 'subjunctive',
          title: 'Present subjunctive',
          level: 'B1',
          summary: 'Wishes, doubts, and uncertainty.',
          rule: ['Use subjunctive when expressing feelings, uncertainty or hope.'],
          why: 'Subjunctive expresses non-facts.',
          tags: ['verb', 'subjunctive', 'mood'],
          items: [{ s: 'Espero que [vengas].', en: 'I hope you come.', wrong: ['vienes', 'venir', 'venga'] }],
        },
      ],
    },
  ],
};

describe('searchTopics', () => {
  it('returns empty array on empty query', () => {
    expect(searchTopics(mockGrammar, '')).toEqual([]);
    expect(searchTopics(mockGrammar, '   ')).toEqual([]);
  });

  it('ranks subjunctive highest for "when do I use the subjunctive?"', () => {
    const results = searchTopics(mockGrammar, 'when do I use the subjunctive?');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].topic.id).toBe('subjunctive');
  });

  it('ranks preterite for "past tense" query via synonym expansion', () => {
    const results = searchTopics(mockGrammar, 'past tense');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].topic.id).toBe('preterite');
  });

  it('ranks articles for "gender" query', () => {
    const results = searchTopics(mockGrammar, 'gender');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].topic.id).toBe('articles');
  });

  it('finds topic by example bracketed word', () => {
    const results = searchTopics(mockGrammar, 'hablo');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].topic.id).toBe('present');
  });
});
