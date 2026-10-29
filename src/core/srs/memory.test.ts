import { describe, expect, it } from 'vitest';
import type { Card } from '@/data/types';
import { buriedUntilTomorrow, catchUpPlan, daysOverdue, describeRetrievability, isBuried, isLeech, LEECH_LAPSES } from './memory';
import { DAY, dayEnd } from './scheduler';

const NOW = new Date(2026, 9, 29, 12).getTime();
const TODAY = dayEnd(NOW) - DAY;

const overdue = (id: string, daysAgo: number, patch: Partial<Card> = {}): Pick<Card, 'id' | 'due' | 'state' | 'suspended'> => ({ id, due: TODAY - daysAgo * DAY, state: 2, suspended: 0, ...patch });

describe('leeches and buried cards', () => {
  it('a card forgotten eight times is a leech', () => {
    expect(LEECH_LAPSES).toBe(8);
    expect(isLeech({ lapses: 7 })).toBe(false);
    expect(isLeech({ lapses: 8 })).toBe(true);
    expect(isLeech({ lapses: 3 }, 3)).toBe(true);
  });

  it('is buried until the next day starts, and not after', () => {
    const until = buriedUntilTomorrow(NOW);
    expect(until).toBe(dayEnd(NOW));
    expect(isBuried({ buriedUntil: until }, NOW)).toBe(true);
    expect(isBuried({ buriedUntil: until }, until)).toBe(false);
    expect(isBuried({}, NOW)).toBe(false);
  });
});

describe('the memory in plain words', () => {
  it('says how likely a card is remembered today', () => {
    expect(describeRetrievability(null)).toBeNull();
    expect(describeRetrievability(0.924)).toEqual({ percent: 92, label: 'Fresh', words: 'about 92 %' });
    expect(describeRetrievability(0.8)?.label).toBe('Fading');
    expect(describeRetrievability(0.6)?.label).toBe('Slipping');
    expect(describeRetrievability(0.2)?.label).toBe('Probably forgotten');
  });

  it('counts the days a card has waited', () => {
    expect(daysOverdue({ due: TODAY + 1000 }, NOW)).toBe(0);
    expect(daysOverdue({ due: TODAY - 1 }, NOW)).toBe(1);
    expect(daysOverdue({ due: TODAY - 10 * DAY }, NOW)).toBe(10);
  });
});

describe('the catch-up plan', () => {
  const cards = Array.from({ length: 300 }, (_, i) => overdue(`c${i}`, 1 + (i % 60), { due: TODAY - (1 + (i % 60)) * DAY - i }));

  it('spreads 300 overdue cards over a week, the most overdue first', () => {
    const plan = catchUpPlan(cards, 7, NOW);
    expect(plan.size).toBe(300);
    const perDay = new Map<number, number>();
    for (const due of plan.values()) {
      const day = Math.round((due - TODAY) / DAY);
      perDay.set(day, (perDay.get(day) ?? 0) + 1);
    }
    expect([...perDay.keys()].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(Math.max(...perDay.values())).toBeLessThanOrEqual(43);
    expect(Math.min(...perDay.values())).toBeGreaterThanOrEqual(42);
    // The card that has waited longest is among the first day's.
    const oldest = [...cards].sort((a, b) => a.due - b.due)[0];
    expect(plan.get(oldest.id)).toBe(TODAY);
    const newest = [...cards].sort((a, b) => b.due - a.due)[0];
    expect(plan.get(newest.id)).toBe(TODAY + 6 * DAY);
  });

  it('leaves alone what is not overdue: new, suspended, due today or later', () => {
    const rest = [overdue('new', 5, { state: 0 }), overdue('away', 5, { suspended: 1 }), { id: 'today', due: TODAY + 1000, state: 2 as const, suspended: 0 as const }, overdue('ok', 5)];
    expect([...catchUpPlan(rest, 3, NOW).keys()]).toEqual(['ok']);
  });

  it('is one day when asked for one, and never invents a day', () => {
    expect([...catchUpPlan(cards, 1, NOW).values()].every((d) => d === TODAY)).toBe(true);
    expect(catchUpPlan(cards, 0, NOW).size).toBe(300);
    expect(catchUpPlan([], 7, NOW).size).toBe(0);
  });
});
