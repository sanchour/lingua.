// What the memory does around the schedule (6-3): cards that keep slipping, a card hidden until tomorrow, the memory said in
// plain words, and a catch-up plan after a long absence. Pure: no database, no DOM.
import type { Card } from '@/data/types';
import { dayEnd, DAY, State } from './scheduler';

/** A card forgotten this many times is a leech: it costs more time than it gives, and needs another way in. */
export const LEECH_LAPSES = 8;

export const isLeech = (card: Pick<Card, 'lapses'>, threshold = LEECH_LAPSES) => card.lapses >= threshold;

/** A card put away until tomorrow's first lesson (the sibling direction of one just answered, or one the learner buried). */
export const buriedUntilTomorrow = (now: number) => dayEnd(now);

export const isBuried = (card: Pick<Card, 'buriedUntil'>, now: number) => Boolean(card.buriedUntil && card.buriedUntil > now);

/** How likely a card is remembered today, in a word and a number ("about 92 %"). */
export function describeRetrievability(r: number | null): { percent: number; label: string; words: string } | null {
  if (r === null || Number.isNaN(r)) return null;
  const percent = Math.round(r * 100);
  const label = r >= 0.9 ? 'Fresh' : r >= 0.75 ? 'Fading' : r >= 0.5 ? 'Slipping' : 'Probably forgotten';
  return { percent, label, words: `about ${percent} %` };
}

/** How long a card has been waiting, in whole days (0 when it is due today or later). */
export const daysOverdue = (card: Pick<Card, 'due'>, now: number) => Math.max(0, Math.ceil((dayEnd(now) - DAY - card.due) / DAY));

/**
 * After a long absence, a wall of overdue cards is spread over some days instead: the most overdue first, an even number each
 * day, none later than the last day. Returns the new due time of each card that moves (the first day's cards keep theirs, as
 * they are due today); cards due today or later are left alone.
 */
export function catchUpPlan(cards: ReadonlyArray<Pick<Card, 'id' | 'due' | 'state' | 'suspended'>>, days: number, now: number): Map<string, number> {
  const todayStart = dayEnd(now) - DAY;
  const overdue = cards.filter((c) => c.state !== State.New && !c.suspended && c.due < todayStart).sort((a, b) => a.due - b.due);
  const span = Math.max(1, Math.floor(days));
  const moved = new Map<string, number>();
  const perDay = Math.ceil(overdue.length / span);
  overdue.forEach((card, i) => {
    const day = Math.min(span - 1, Math.floor(i / perDay));
    // Today's batch is due now; the others, at the start of their day.
    if (day > 0) moved.set(card.id, todayStart + day * DAY);
    else if (card.due < todayStart) moved.set(card.id, todayStart);
  });
  return moved;
}
