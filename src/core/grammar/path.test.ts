import { describe, expect, it } from 'vitest';
import type { GrammarItemRow } from '@/data/types';
import { grammarLevel, ladder, levelPath, weakSpots, whyNext } from './path';
import type { TopicState } from './progress';
import type { Grammar, Topic } from './types';

const topic = (id: string, level: Topic['level']): Topic => ({ id, title: id.toUpperCase(), level, summary: '', rule: [], why: '', items: [] }) as unknown as Topic;
const grammar = {
  lang: 'fr',
  sources: [],
  units: [
    { title: 'One', topics: [topic('a', 'A1'), topic('b', 'A1'), topic('c', 'A2')] },
    { title: 'Two', topics: [topic('d', 'A2'), topic('e', 'B1')] },
  ],
} as unknown as Grammar;
const state = (over: Partial<TopicState>): TopicState => ({ step: 1, learned: false, mastered: false, ring: 0, seen: 0, due: 0, started: false, ...over });
const row = (topicId: string, over: Partial<GrammarItemRow>): GrammarItemRow => ({ id: `fr:${topicId}:${Math.random()}`, topic: topicId, state: 2, lapses: 0, due: 0, ...over }) as GrammarItemRow;

describe('the grammar path', () => {
  it('reads A0 as A1 and caps at the grammar’s last level', () => {
    expect(grammarLevel('A0')).toBe('A1');
    expect(grammarLevel('B1')).toBe('B1');
    expect(grammarLevel('C2')).toBe('C1');
  });

  it('says why a topic is next', () => {
    const none = new Set<string>();
    expect(whyNext(grammar, topic('a', 'A1'), state({ started: true, step: 3 }), 'A1', none)).toMatch(/step 3 of 5/);
    expect(whyNext(grammar, grammar.units[0].topics[1], state({}), 'A2', new Set(['a']))).toMatch(/learned A\. This is the next A1/);
    expect(whyNext(grammar, grammar.units[0].topics[0], state({}), 'A0', none)).toMatch(/first A1 topic/);
    expect(whyNext(grammar, grammar.units[1].topics[1], state({}), 'A2', new Set(['a', 'b', 'c', 'd']))).toMatch(/beyond/);
  });

  it('counts the ladder by level, leaving out levels the grammar lacks', () => {
    expect(ladder(grammar, new Set(['a', 'c']))).toEqual([
      { level: 'A1', total: 2, learned: 1 },
      { level: 'A2', total: 2, learned: 1 },
      { level: 'B1', total: 1, learned: 0 },
    ]);
  });

  it('lays a level out as done, current, next and later', () => {
    const stops = levelPath(grammar, 'A1', new Set(['a']), 'b');
    expect(stops.map((s) => [s.topic.id, s.status])).toEqual([['a', 'done'], ['b', 'current']]);
    const a2 = levelPath(grammar, 'A2', new Set(['a']), 'b');
    expect(a2.map((s) => s.status)).toEqual(['next', 'next']);
    expect(levelPath(grammar, 'B1', new Set(['a']), 'b').map((s) => s.status)).toEqual(['later']);
  });

  it('lists the topics forgotten most, worst first, and none when nothing was forgotten', () => {
    expect(weakSpots(grammar, [row('a', {}), row('b', {})], 10)).toEqual([]);
    const spots = weakSpots(grammar, [row('a', { lapses: 1 }), row('c', { lapses: 3, due: 5 }), row('c', { lapses: 1, due: 50 }), row('b', { state: 0, lapses: 9 })], 10);
    expect(spots.map((w) => [w.topic.id, w.lapses, w.due])).toEqual([['c', 4, 1], ['a', 1, 1]]);
  });
});
