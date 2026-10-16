import { describe, expect, it } from 'vitest';
import { planMerge } from './merge';

type Row = { id: string; v: string; updatedAt?: number };
const keyOf = (r: Row) => r.id;
const local = new Map<string, Row>([
  ['a', { id: 'a', v: 'local-a', updatedAt: 200 }],
  ['b', { id: 'b', v: 'local-b', updatedAt: 200 }],
]);

describe('planMerge', () => {
  it('lww: newer incoming wins, older loses, missing is added', () => {
    const plan = planMerge(local, [
      { id: 'a', v: 'new-a', updatedAt: 300 },
      { id: 'b', v: 'old-b', updatedAt: 100 },
      { id: 'c', v: 'new-c', updatedAt: 50 },
    ], keyOf, 'lww');
    expect(plan.put.map((r) => r.v).sort()).toEqual(['new-a', 'new-c']);
    expect([plan.added, plan.updated, plan.unchanged]).toEqual([1, 1, 1]);
  });

  it('lww: equal timestamps keep the local row', () => {
    const plan = planMerge(local, [{ id: 'a', v: 'same-time', updatedAt: 200 }], keyOf, 'lww');
    expect(plan.put).toEqual([]);
  });

  it('union / insertOnly never overwrite existing rows', () => {
    for (const policy of ['union', 'insertOnly'] as const) {
      const plan = planMerge(local, [
        { id: 'a', v: 'newer-a', updatedAt: 999 },
        { id: 'z', v: 'z' },
      ], keyOf, policy);
      expect(plan.put).toEqual([{ id: 'z', v: 'z' }]);
    }
  });

  it('collapses duplicates inside the backup, newest first', () => {
    const plan = planMerge(new Map(), [
      { id: 'd', v: 'first', updatedAt: 1 },
      { id: 'd', v: 'second', updatedAt: 2 },
    ], keyOf, 'lww');
    expect(plan.put).toEqual([{ id: 'd', v: 'second', updatedAt: 2 }]);
  });
});
