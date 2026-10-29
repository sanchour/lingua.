import { describe, expect, it } from 'vitest';
import { topicCategory, topicPos } from './categories';
import type { Topic } from './types';

function mockTopic(partial: Partial<Topic>): Topic {
  return {
    id: 'test',
    title: 'Test topic',
    level: 'A1',
    summary: 'A summary',
    rule: ['Rule text'],
    why: 'Explanation',
    items: [],
    ...partial,
  };
}

describe('topicCategory and topicPos', () => {
  it('respects explicit category and pos if provided', () => {
    const t = mockTopic({ category: 'Verbs & Tenses', pos: 'verb' });
    expect(topicCategory(t)).toBe('Verbs & Tenses');
    expect(topicPos(t)).toBe('verb');
  });

  it('infers verbs from title and summary', () => {
    const t = mockTopic({ title: 'Present tense of regular verbs', summary: 'How verbs conjugate in present' });
    expect(topicCategory(t)).toBe('Verbs & Tenses');
    expect(topicPos(t)).toBe('verb');
  });

  it('infers nouns and articles', () => {
    const t = mockTopic({ title: 'Definite and indefinite articles', summary: 'Gender and articles with nouns' });
    expect(topicCategory(t)).toBe('Nouns & Articles');
    expect(topicPos(t)).toBe('noun');
  });

  it('infers pronouns', () => {
    const t = mockTopic({ title: 'Direct object pronouns', summary: 'Replacing nouns with pronouns' });
    expect(topicCategory(t)).toBe('Pronouns & Determiners');
    expect(topicPos(t)).toBe('pronoun');
  });

  it('infers prepositions', () => {
    const t = mockTopic({ title: 'Por vs Para', summary: 'Choosing the right preposition for purpose or cause' });
    expect(topicCategory(t)).toBe('Prepositions & Particles');
    expect(topicPos(t)).toBe('preposition');
  });

  it('infers questions and negation', () => {
    const t = mockTopic({ title: 'Forming questions', summary: 'Word order in interrogative sentences' });
    expect(topicCategory(t)).toBe('Questions & Negation');
  });
});
