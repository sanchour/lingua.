import { describe, expect, it } from 'vitest';
import {
  analyzeSentenceOffline,
  extractEnding,
  tokenizeSentence,
} from './sentenceExplainer';
import { analyzeSentenceGrammar } from '@/services/llm/grammarExplainer';
import type { DictForm } from '@/data/types';

describe('Sentence Explainer (Slice G5)', () => {
  it('tokenizes sentence and extracts inflections against lemmas', () => {
    const tokens = tokenizeSentence('Quiero que vengas pronto a la fiesta.');
    expect(tokens).toEqual(['Quiero', 'que', 'vengas', 'pronto', 'a', 'la', 'fiesta']);

    // Ending extraction
    expect(extractEnding('hablamos', 'hablar')).toBe('-mos');
    expect(extractEnding('vengas', 'venir')).toBeDefined();
    expect(extractEnding('libro', 'libro')).toBeUndefined();
  });

  it('performs offline sentence analysis with dictionary forms and clauses', () => {
    const mockDict = new Map<string, DictForm>([
      ['quiero', { pack: 'es-en', form: 'quiero', lemmas: ['querer'], g: 'I want', d: '1st sing present' }],
      ['fiesta', { pack: 'es-en', form: 'fiesta', lemmas: ['fiesta'], g: 'party', d: 'noun f sing' }],
    ]);

    const result = analyzeSentenceOffline('Quiero que vengas a la fiesta.', 'es', mockDict);
    expect(result.words.length).toBe(6);
    expect(result.words[0].lemma).toBe('querer');
    expect(result.words[0].gloss).toBe('I want');
    expect(result.hasAiAnalysis).toBe(false);
    expect(result.requiresMaxNotice).toContain('Needs Max');

    // Subordinate clause split after "que"
    expect(result.clauses.length).toBeGreaterThanOrEqual(2);
    expect(result.clauses[0].type).toBe('main');
    expect(result.clauses[1].type).toBe('subordinate');
  });

  it('analyzes sentence with an injected fake AI model for roles, dependency arcs, and ambiguities', async () => {
    const fakeModel = async (_system: string, _user: string) => {
      return JSON.stringify({
        words: [
          { index: 0, role: 'Subject', partOfSpeech: 'NOUN', headIndex: 1, depRelation: 'nsubj' },
          { index: 1, role: 'Predicate Verb', partOfSpeech: 'VERB', depRelation: 'root' },
          { index: 2, role: 'Direct Object', partOfSpeech: 'NOUN', headIndex: 1, depRelation: 'obj' },
        ],
        clauses: [
          { id: 1, type: 'main', wordIndices: [0, 1, 2], explanation: 'Simple transitive declarative clause' },
        ],
        alternatives: [
          { reading: 'Literal reading', explanation: 'The subject directly performs the verbal action.' },
        ],
      });
    };

    const analysis = await analyzeSentenceGrammar('Maria lee libros.', 'es', fakeModel);
    expect(analysis.hasAiAnalysis).toBe(true);
    expect(analysis.requiresMaxNotice).toBeUndefined();

    // Check merged roles
    expect(analysis.words[0].role).toBe('Subject');
    expect(analysis.words[1].role).toBe('Predicate Verb');
    expect(analysis.words[2].role).toBe('Direct Object');

    // Check dependency arcs
    expect(analysis.arcs.length).toBe(2);
    expect(analysis.arcs).toContainEqual({ fromIndex: 1, toIndex: 0, relation: 'nsubj' });
    expect(analysis.arcs).toContainEqual({ fromIndex: 1, toIndex: 2, relation: 'obj' });

    // Check alternative interpretations
    expect(analysis.alternatives?.length).toBe(1);
    expect(analysis.alternatives?.[0].reading).toBe('Literal reading');
  });
});
