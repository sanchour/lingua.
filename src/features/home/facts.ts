// What Home needs in one live query: the last seven days, and which first steps are done.
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/data/db';
import type { DailyStat } from '@/data/types';
import { localDateKey } from '@/lib/format';

const DAY = 86_400_000;

export const studyMinutes = (d: Pick<DailyStat, 'readMs' | 'listenMs' | 'watchMs' | 'writeMs'> | null | undefined) =>
  d ? (d.readMs + d.listenMs + d.watchMs + (d.writeMs ?? 0)) / 60_000 : 0;

export interface HomeFacts {
  week: Array<{ date: string; minutes: number; reviews: number; met: boolean }>;
  firstSteps: { read: boolean; marked: boolean; reviewed: boolean; listened: boolean; wrote: boolean };
}

export function useHomeFacts(lang: string): HomeFacts | undefined {
  return useLiveQuery(async () => {
    const [stats, texts, learning, journal] = await Promise.all([
      db.dailyStats.where('[lang+date]').between([lang, ''], [lang, '￿']).toArray(),
      db.texts.where('lang').equals(lang).filter((t) => !t.deletedAt && t.kind !== 'shelfItem').count(),
      db.words.where('[lang+state]').equals([lang, 2]).count(),
      db.journalEntries.where('lang').equals(lang).filter((e) => !e.deletedAt && e.words > 0).count(),
    ]);
    const byDate = new Map(stats.map((s) => [s.date, s]));
    const week = Array.from({ length: 7 }, (_, i) => {
      const date = localDateKey(Date.now() - (6 - i) * DAY);
      const d = byDate.get(date);
      return { date, minutes: studyMinutes(d), reviews: d?.reviews ?? 0, met: Boolean(d?.goalMet) };
    });
    const sum = (f: (d: DailyStat) => number) => stats.reduce((n, d) => n + f(d), 0);
    return {
      week,
      firstSteps: {
        read: texts > 0 && sum((d) => d.readMs) > 0,
        marked: learning > 0 || sum((d) => d.newLearning) > 0,
        reviewed: sum((d) => d.reviews) > 0,
        listened: sum((d) => d.listenMs + d.watchMs) > 0,
        wrote: journal > 0,
      },
    };
  }, [lang]);
}
