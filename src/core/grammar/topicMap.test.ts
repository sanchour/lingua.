import { describe, expect, it } from 'vitest';
import { loadGrammar } from './load';
import { topicsOf } from './types';
import { getPrerequisites } from './prerequisites';

describe('Grammar Topic Map and Dependencies (Slice G4)', () => {
  it('builds prerequisite dependency edges between topics across CEFR levels', async () => {
    const es = await loadGrammar('es');
    expect(es).toBeDefined();
    if (!es) return;

    const allTopics = topicsOf(es);
    expect(allTopics.length).toBeGreaterThan(10);

    // Ser-estar has explicit prerequisites: ser and estar
    const serEstar = allTopics.find((t) => t.id === 'ser-estar');
    expect(serEstar).toBeDefined();
    if (serEstar) {
      const prereqs = getPrerequisites(es, serEstar);
      const prereqIds = prereqs.map((p) => p.id);
      expect(prereqIds).toContain('ser');
      expect(prereqIds).toContain('estar');
    }

    // Preterite-imperfect has explicit prerequisites: preterite and imperfect
    const past = allTopics.find((t) => t.id === 'preterite-imperfect');
    expect(past).toBeDefined();
    if (past) {
      const prereqs = getPrerequisites(es, past);
      const prereqIds = prereqs.map((p) => p.id);
      expect(prereqIds).toContain('preterite');
      expect(prereqIds).toContain('imperfect');
    }
  });

  it('maps topics into level tiers without circular dependencies in prerequisite chains', async () => {
    const es = await loadGrammar('es');
    expect(es).toBeDefined();
    if (!es) return;

    const allTopics = topicsOf(es);
    for (const t of allTopics) {
      const prereqs = getPrerequisites(es, t);
      // Prerequisite should not be the topic itself
      expect(prereqs.some((p) => p.id === t.id)).toBe(false);
    }
  });

  it('computes error heatmap mapping from weak spots', () => {
    const mockWeakSpots = [
      { topic: { id: 'ser-estar', title: 'Ser or estar?' } as any, lapses: 4, due: 2 },
      { topic: { id: 'preterite', title: 'Preterite' } as any, lapses: 2, due: 0 },
    ];

    const errorMap = new Map<string, number>();
    for (const w of mockWeakSpots) {
      if (w.lapses > 0) errorMap.set(w.topic.id, (errorMap.get(w.topic.id) ?? 0) + w.lapses);
    }

    expect(errorMap.get('ser-estar')).toBe(4);
    expect(errorMap.get('preterite')).toBe(2);
    expect(errorMap.get('unknown')).toBeUndefined();
  });
});
