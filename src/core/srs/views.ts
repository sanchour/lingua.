// The memory shown honestly (6-3b): when reviews fall due, how long today will take, how a memory fades. Pure.
import type { Card } from '@/data/types';
import { DAY, dayEnd, retrievability, State } from './scheduler';

/** The local day of a time, as 'YYYY-MM-DD'; a card due before 4 am is still the day before's (the learner's day, as dayEnd has it). */
export function studyDayKey(ms: number): string {
  const d = new Date(ms - 4 * 3_600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** How many reviews fall due on each of the next `days` days; what is overdue counts today. */
export function dueCounts(cards: ReadonlyArray<Pick<Card, 'due' | 'state' | 'suspended'>>, now: number, days = 35): Array<{ day: string; at: number; count: number }> {
  const todayEnd = dayEnd(now);
  const rows = Array.from({ length: days }, (_, i) => ({ day: studyDayKey(todayEnd - DAY / 2 + i * DAY), at: todayEnd - DAY + i * DAY, count: 0 }));
  const index = new Map(rows.map((r, i) => [r.day, i]));
  for (const c of cards) {
    if (c.suspended || c.state === State.New) continue;
    const i = c.due < todayEnd ? 0 : index.get(studyDayKey(c.due));
    if (i !== undefined) rows[i].count++;
  }
  return rows;
}

/** Minutes a number of cards will take, from how long the learner has been taking per card (8 s when nothing is known yet). */
export function estimateMinutes(count: number, averageMs?: number): number {
  const per = averageMs && averageMs > 0 ? Math.min(60_000, Math.max(2_000, averageMs)) : 8_000;
  return Math.max(count ? 1 : 0, Math.round((count * per) / 60_000));
}

/** Plain words for how long a memory lasts: stability is the days until it is down to 90 %. */
export function describeStability(days: number): string {
  if (!(days > 0)) return 'not yet formed';
  if (days < 1) return 'a few hours';
  if (days < 14) return `about ${Math.round(days)} ${Math.round(days) === 1 ? 'day' : 'days'}`;
  if (days < 60) return `about ${Math.round(days / 7)} weeks`;
  if (days < 700) return `about ${Math.round(days / 30)} months`;
  return `about ${(days / 365).toFixed(1)} years`;
}

/** The chance of remembering a card on each of the next days if it is not reviewed: the curve of how it fades. */
export function fadingCurve(card: Card, now: number, days = 60, retention = 0.9): Array<{ day: number; r: number }> {
  const out: Array<{ day: number; r: number }> = [];
  for (let d = 0; d <= days; d += Math.max(1, Math.round(days / 30))) {
    const r = retrievability(card, now + d * DAY, retention);
    if (r !== null) out.push({ day: d, r });
  }
  return out;
}

/** A card the learner finds hard: it has been forgotten three times, or is marked a leech, or is only just remembered. */
export function isDifficult(card: Pick<Card, 'lapses' | 'leech' | 'state' | 'stability'>, remembered: number | null): boolean {
  return card.state !== State.New && (Boolean(card.leech) || card.lapses >= 3 || (remembered !== null && remembered < 0.7));
}

/** A card not seen for a long while (and not new). */
export function isRusty(card: Pick<Card, 'lastReview' | 'state'>, now: number, days = 45): boolean {
  return card.state !== State.New && Boolean(card.lastReview) && now - card.lastReview! > days * DAY;
}
