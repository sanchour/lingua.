import { describe, expect, it } from 'vitest';
import { tipsFor } from './tips';
import { dealOne, doneThisWeek, isOpen, MINUTES, tipMinutes, tipWhere, visibleTips } from './try';
import type { DoneDates, TryFilter } from './try';

const tips = tipsFor('es');
const today = '2026-10-28';
const all: TryFilter = { show: 'all', minutes: 'any', where: 'any' };
const done = (entries: Array<[string, string[]]>): DoneDates => new Map(entries);

describe('things to try', () => {
  it('gives every challenge a time and a place', () => {
    for (const t of tips) {
      expect(MINUTES).toContain(tipMinutes(t));
      expect(tipWhere(t), t.id).toBeDefined();
    }
    expect(new Set(tips.map(tipMinutes)).size).toBe(3);
  });

  it('puts what is done at the back, and a habit done earlier still counts as open', () => {
    const habit = tips.find((t) => t.habit)!;
    const once = tips.find((t) => !t.habit)!;
    const d = done([[once.id, ['2026-10-27']], [habit.id, ['2026-10-27']]]);
    expect(isOpen(once, d, today)).toBe(false);
    expect(isOpen(habit, d, today)).toBe(true);
    const list = visibleTips(tips, d, today, all);
    expect(list.at(-1)!.id).toBe(once.id);
    expect(list.indexOf(habit)).toBeLessThan(list.indexOf(once));
    expect(list).toHaveLength(tips.length);
  });

  it('filters by show, time and place', () => {
    const d = done([['phone', ['2026-10-28']]]);
    expect(visibleTips(tips, d, today, { ...all, show: 'done' }).map((t) => t.id)).toEqual(['phone']);
    expect(visibleTips(tips, d, today, { ...all, show: 'open' }).some((t) => t.id === 'phone')).toBe(false);
    expect(visibleTips(tips, d, today, { ...all, minutes: 2 }).every((t) => tipMinutes(t) === 2)).toBe(true);
    expect(visibleTips(tips, d, today, { ...all, where: 'listen' }).every((t) => tipWhere(t) === 'listen')).toBe(true);
  });

  it('deals an open one, never the one just dealt', () => {
    const d = done([]);
    const first = dealOne(tips, d, today, all, undefined, () => 0)!;
    const second = dealOne(tips, d, today, all, first.id, () => 0)!;
    expect(second.id).not.toBe(first.id);
  });

  it('deals nothing when nothing is left', () => {
    const filter: TryFilter = { ...all, minutes: 15, where: 'play' };
    expect(visibleTips(tips, done([]), today, filter).map((t) => t.id)).toEqual(['game']);
    expect(dealOne(tips, done([['game', [today]]]), today, filter, undefined)).toBeUndefined();
  });

  it('counts what was done in the last seven days, a habit once for each day', () => {
    const d = done([
      ['a', ['2026-10-28', '2026-10-27', '2026-10-22']],
      ['b', ['2026-10-21', '2026-10-01']],
    ]);
    expect(doneThisWeek(d, today)).toBe(3);
  });
});
