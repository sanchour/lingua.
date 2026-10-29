import { describe, expect, it } from 'vitest';
import { checkPrerequisites, getPrerequisites } from './prerequisites';
import type { Grammar, Topic } from './types';

const tA1: Topic = {
  id: 't-a1',
  title: 'Present tense',
  level: 'A1',
  summary: '',
  rule: [],
  why: '',
  items: [],
};

const tA2: Topic = {
  id: 't-a2',
  title: 'Past tense',
  level: 'A2',
  summary: '',
  rule: [],
  why: '',
  items: [],
  prerequisites: ['t-a1'],
};

const mockGrammar: Grammar = {
  lang: 'es',
  sources: [],
  units: [{ title: 'Unit 1', topics: [tA1, tA2] }],
};

describe('prerequisites', () => {
  it('returns explicit prerequisites', () => {
    const prereqs = getPrerequisites(mockGrammar, tA2);
    expect(prereqs.map((t) => t.id)).toEqual(['t-a1']);
  });

  it('correctly reports met vs missing prerequisites', () => {
    const unlearned = checkPrerequisites(mockGrammar, tA2, new Set());
    expect(unlearned.ready).toBe(false);
    expect(unlearned.missing.map((t) => t.id)).toEqual(['t-a1']);
    expect(unlearned.met).toEqual([]);

    const learned = checkPrerequisites(mockGrammar, tA2, new Set(['t-a1']));
    expect(learned.ready).toBe(true);
    expect(learned.missing).toEqual([]);
    expect(learned.met.map((t) => t.id)).toEqual(['t-a1']);
  });
});
