import { describe, expect, it } from 'vitest';
import type { GrammarProgressRow, ReviewLog } from '@/data/types';
import { planPlacement, PLACEMENT_TOPICS, seededRandom } from './drills';
import { grammarLevel, grammarStats } from './stats';
import type { Grammar, Item, Topic } from './types';

const item = (n: number): Item => ({ s: `Ella [habla${n}] mucho.`, en: 'x', wrong: ['a', 'b', 'c'] });
const topic = (id: string, level: Topic['level']): Topic => ({ id, title: id, level, summary: '', rule: [], why: '', items: [item(1), item(2), item(3)] });
const grammar: Grammar = {
  lang: 'es',
  sources: [{ name: 'test' }],
  units: [{ title: 'U', topics: [topic('a', 'A1'), topic('b', 'A1'), topic('c', 'A2'), topic('d', 'B1'), topic('e', 'B2')] }],
};
const row = (t: string, step: number, learnedAt?: number): GrammarProgressRow => ({ id: `es:${t}`, lang: 'es', topic: t, step, lessons: 1, learnedAt, createdAt: 0, updatedAt: 0 });
const log = (t: string, rating: 1 | 3, at: number): ReviewLog => ({
  id: `${t}${at}`,
  cardId: `es:${t}:k${at}`,
  deckId: 'grammar:es',
  reviewedAt: at,
  durationMs: 1000,
  rating,
  mode: 'grammar',
  affectedSchedule: 1,
  stateBefore: 0,
  stabilityAfter: 1,
  difficultyAfter: 5,
  elapsedDays: 0,
  scheduledDays: 1,
});

describe('grammar in the numbers', () => {
  it('reaches a level only when every topic at it and below is learned', () => {
    expect(grammarLevel(grammar, new Map())).toBeNull();
    expect(grammarLevel(grammar, new Map([['a', row('a', 6)]]))).toBeNull();
    expect(grammarLevel(grammar, new Map([['a', row('a', 6)], ['b', row('b', 6)]]))).toBe('A1');
    // B1 learned but A2 not: still A1.
    expect(grammarLevel(grammar, new Map([['a', row('a', 6)], ['b', row('b', 6)], ['d', row('d', 6)]]))).toBe('A1');
  });

  it('counts accuracy per topic, the weakest with five answers, and topics learned per month', () => {
    const now = new Date(2026, 9, 20).getTime();
    const logs = [...[3, 3, 3, 3, 1].map((r, i) => log('a', r as 1 | 3, i)), ...[1, 1, 3, 1, 3].map((r, i) => log('c', r as 1 | 3, 10 + i)), log('b', 1, 20)];
    const progress = new Map([
      ['a', row('a', 6, new Date(2026, 9, 2).getTime())],
      ['b', row('b', 6, new Date(2026, 7, 9).getTime())],
    ]);
    const s = grammarStats(grammar, progress, [], logs, now);
    expect(s).toMatchObject({ total: 5, learned: 2, level: 'A1' });
    expect(s.topics.map((t) => [t.topic.id, t.accuracy])).toEqual([
      ['a', 0.8],
      ['b', 0],
      ['c', 0.4],
    ]);
    expect(s.weakest.map((t) => t.topic.id)).toEqual(['c', 'a']);
    expect(s.perMonth).toHaveLength(6);
    expect(s.perMonth.at(-1)).toEqual({ month: '2026-10', learned: 1 });
    expect(s.perMonth.find((m) => m.month === '2026-08')?.learned).toBe(1);
  });
});

describe('placement', () => {
  it('asks two gaps per topic not yet learned, up to one level above the learner’s', () => {
    const drills = planPlacement(grammar, 'es', new Map([['a', { step: 6 }]]), 'A1', seededRandom(3));
    const topics = drills.map((d) => d.topic);
    expect([...new Set(topics)]).toEqual(['b', 'c']);
    expect(topics.filter((t) => t === 'b')).toHaveLength(2);
    expect(drills.every((d) => d.kind === 'pick')).toBe(true);
    expect(new Set(drills.map((d) => d.key)).size).toBe(drills.length);
    expect([...new Set(planPlacement(grammar, 'es', new Map(), 'B1', seededRandom(3)).map((d) => d.topic))]).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('stops at a dozen topics', () => {
    const many: Grammar = { ...grammar, units: [{ title: 'U', topics: Array.from({ length: 20 }, (_, i) => topic(`t${i}`, 'A1')) }] };
    expect(new Set(planPlacement(many, 'es', new Map(), 'A1', seededRandom(1)).map((d) => d.topic)).size).toBe(PLACEMENT_TOPICS);
  });
});
