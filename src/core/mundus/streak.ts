// The streak of challenges done: days in a row with at least one, counted back from today (or from
// yesterday, so a streak isn't lost before the day is over).

const DAY = 86_400_000;

/** YYYY-MM-DD → a day number (noon local time, so daylight saving never shifts it). */
function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(new Date(y, m - 1, d, 12).getTime() / DAY);
}

export interface Streak {
  /** Days in a row ending today or yesterday. */
  days: number;
  doneToday: boolean;
  /** Days with at least one challenge done. */
  activeDays: number;
}

export function streakOf(dates: Iterable<string>, today: string): Streak {
  const days = new Set<number>();
  for (const d of dates) days.add(dayNumber(d));
  const now = dayNumber(today);
  const doneToday = days.has(now);
  let cursor = doneToday ? now : now - 1;
  let run = 0;
  while (days.has(cursor)) {
    run++;
    cursor--;
  }
  return { days: run, doneToday, activeDays: days.size };
}
