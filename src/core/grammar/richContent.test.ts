import { describe, expect, it } from 'vitest';
import type { Topic } from './types';

describe('Topic richer content structures', () => {
  it('supports exceptions, formality pairs, right/wrong pairs and regional notes', () => {
    const topic: Topic = {
      id: 'test-topic',
      title: 'Gender and articles',
      level: 'A1',
      summary: 'Articles and gender',
      rule: ['Rule in English'],
      targetLangRule: ['Regla en español'],
      why: 'Why rule',
      items: [],
      exceptions: ['el día (masculine despite -a)', 'la mano (feminine despite -o)'],
      formalityPairs: [
        {
          formal: { s: '¿Cómo está usted?', en: 'How are you? (formal)' },
          informal: { s: '¿Cómo estás tú?', en: 'How are you? (informal)' },
          note: 'Usted uses 3rd person singular.',
        },
      ],
      rightWrongPairs: [
        {
          right: 'Voy al cine.',
          wrong: 'Voy a el cine.',
          reason: 'A + el contracts to al.',
        },
      ],
      regionalNotes: [
        {
          region: 'Spain vs Latin America',
          note: 'In Latin America, carro/auto are preferred over coche.',
        },
      ],
      crossReferences: [
        {
          topicId: 'adjectives',
          note: 'Adjectives must agree in gender with the article and noun.',
        },
      ],
    };

    expect(topic.exceptions).toHaveLength(2);
    expect(topic.formalityPairs?.[0].formal.s).toBe('¿Cómo está usted?');
    expect(topic.rightWrongPairs?.[0].wrong).toBe('Voy a el cine.');
    expect(topic.regionalNotes?.[0].region).toBe('Spain vs Latin America');
    expect(topic.crossReferences?.[0].topicId).toBe('adjectives');
    expect(topic.targetLangRule).toHaveLength(1);
  });
});
