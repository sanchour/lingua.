import { useLiveQuery } from 'dexie-react-hooks';
import { localDateKey } from '@/lib/format';
import { db } from './db';
import type { DailyStat } from './types';

const DAY = 86_400_000;

/**
 * Consecutive days (ending today, or yesterday if today isn't done yet) with the daily goal met,
 * plus which of the last 7 days were met.
 */
export function useStreak(lang: string): { days: number; week: boolean[] } | undefined {
  return useLiveQuery(async () => {
    const since = localDateKey(Date.now() - 60 * DAY);
    const rows = await db.dailyStats.where('[lang+date]').between([lang, since], [lang, '￿']).toArray();
    const met = new Set(rows.filter((r) => r.goalMet).map((r) => r.date));

    const week = Array.from({ length: 7 }, (_, i) => met.has(localDateKey(Date.now() - (6 - i) * DAY)));
    let days = 0;
    let cursor = met.has(localDateKey()) ? Date.now() : Date.now() - DAY;
    while (met.has(localDateKey(cursor))) {
      days++;
      cursor -= DAY;
    }
    return { days, week };
  }, [lang]);
}

/** Today's activity for a language (null when nothing happened yet). */
export function useToday(lang: string): DailyStat | null | undefined {
  return useLiveQuery(async () => (await db.dailyStats.get(`${lang}:${localDateKey()}`)) ?? null, [lang]);
}
