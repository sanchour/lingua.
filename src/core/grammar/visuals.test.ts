import { describe, expect, it } from 'vitest';
import { loadGrammar } from './load';
import { findTopic } from './types';

describe('Grammar Visuals and Rich Data (Slice G3)', () => {
  it('Spanish grammar contains timelines, decision trees, word order, morphology and agreement tables', async () => {
    const es = await loadGrammar('es');
    expect(es).toBeDefined();
    if (!es) return;

    // Timeline and decision tree on preterite-imperfect
    const past = findTopic(es, 'preterite-imperfect');
    expect(past).toBeDefined();
    expect(past?.timeline).toBeDefined();
    expect(past?.timeline?.points.length).toBeGreaterThan(1);
    expect(past?.decisionTree).toBeDefined();
    expect(past?.decisionTree?.question).toContain('completed');

    // Ser vs estar decision tree
    const serEstar = findTopic(es, 'ser-estar');
    expect(serEstar?.decisionTree).toBeDefined();
    expect(serEstar?.decisionTree?.yes.result).toContain('Ser');

    // Word order and morphology on present
    const present = findTopic(es, 'present');
    expect(present?.wordOrder).toBeDefined();
    expect(present?.wordOrder?.slots.some((s) => s.highlight)).toBe(true);
    expect(present?.morphology).toBeDefined();
    expect(present?.morphology?.length).toBeGreaterThan(0);
    expect(present?.morphology?.[0].parts.some((p) => p.type === 'ending')).toBe(true);

    // Adjective agreement table on articles
    const articles = findTopic(es, 'articles');
    expect(articles?.tables?.some((t) => t.title?.includes('Adjective agreement'))).toBe(true);

    // Pronouns table on direct-objects
    const directObj = findTopic(es, 'direct-objects');
    expect(directObj?.tables?.some((t) => t.title?.includes('Personal pronouns'))).toBe(true);
  });

  it('French grammar contains timelines, decision trees, agreement tables and morphology', async () => {
    const fr = await loadGrammar('fr');
    expect(fr).toBeDefined();
    if (!fr) return;

    // Passé composé timeline & decision tree
    const pc = findTopic(fr, 'passe-compose');
    expect(pc?.timeline).toBeDefined();
    expect(pc?.decisionTree).toBeDefined();
    expect(pc?.decisionTree?.yes.result).toContain('ÊTRE');

    // Adjectives agreement and morphology
    const adj = findTopic(fr, 'adjectives');
    expect(adj?.tables?.[0].rows.some((r) => r.some((cell) => cell.includes('**')))).toBe(true);
    expect(adj?.morphology?.length).toBeGreaterThan(0);

    // Pronouns summary table
    const pron = findTopic(fr, 'pronouns');
    expect(pron?.tables?.some((t) => t.title?.includes('pronouns summary'))).toBe(true);
  });

  it('German grammar contains V2 word order visualizer, cases decision tree and adjective tables', async () => {
    const de = await loadGrammar('de');
    expect(de).toBeDefined();
    if (!de) return;

    // Word order V2
    const wo = findTopic(de, 'word-order');
    expect(wo?.wordOrder).toBeDefined();
    expect(wo?.wordOrder?.slots.some((s) => s.role.includes('Pos 2'))).toBe(true);

    // Cases decision tree
    const acc = findTopic(de, 'accusative');
    expect(acc?.decisionTree).toBeDefined();
    expect(acc?.decisionTree?.yes.result).toContain('Nominativ');

    // Adjective endings with morphology and bold cells
    const adjEnd = findTopic(de, 'adjective-endings');
    expect(adjEnd?.tables?.[0].rows[0][1]).toContain('**-e**');
    expect(adjEnd?.morphology?.length).toBeGreaterThan(0);
  });

  it('Italian grammar contains passato prossimo timeline, essere/avere decision tree and adjective agreement', async () => {
    const itGrammar = await loadGrammar('it');
    expect(itGrammar).toBeDefined();
    if (!itGrammar) return;

    const pp = findTopic(itGrammar, 'passato-prossimo');
    expect(pp?.timeline).toBeDefined();
    expect(pp?.decisionTree?.yes.result).toContain('ESSERE');

    const art = findTopic(itGrammar, 'articles');
    expect(art?.tables?.some((t) => t.title?.includes('Adjective agreement'))).toBe(true);

    const pron = findTopic(itGrammar, 'object-pronouns');
    expect(pron?.tables?.some((t) => t.title?.includes('pronomi personali'))).toBe(true);
  });

  it('Russian grammar contains aspect timeline, aspect decision tree and declension tables', async () => {
    const ru = await loadGrammar('ru');
    expect(ru).toBeDefined();
    if (!ru) return;

    const aspect = findTopic(ru, 'aspect');
    expect(aspect?.timeline).toBeDefined();
    expect(aspect?.decisionTree?.yes.result).toContain('СВ');

    const gender = findTopic(ru, 'gender');
    expect(gender?.tables?.some((t) => t.title?.includes('Adjective agreement'))).toBe(true);
    expect(gender?.tables?.some((t) => t.title?.includes('Личные местоимения'))).toBe(true);
  });

  it('Chinese grammar contains S+T+P+V+O word order visualizer and aspectual le timeline', async () => {
    const zh = await loadGrammar('zh');
    expect(zh).toBeDefined();
    if (!zh) return;

    const wo = findTopic(zh, 'word-order');
    expect(wo?.wordOrder).toBeDefined();
    expect(wo?.wordOrder?.slots.some((s) => s.role.includes('Time'))).toBe(true);

    const le = findTopic(zh, 'le');
    expect(le?.timeline).toBeDefined();
    expect(le?.decisionTree?.yes.result).toContain('Verbal 了');

    const shi = findTopic(zh, 'shi-hen');
    expect(shi?.tables?.some((t) => t.title?.includes('人称代词'))).toBe(true);
  });
});
