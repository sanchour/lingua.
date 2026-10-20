import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/data/db';
import type { LanguageProfile } from '@/data/types';
import { cx } from '@/lib/cx';
import { localDateKey } from '@/lib/format';

export const CODEX_GOALS = [5, 10, 15, 20, 30, 45, 60];

/** Codex's own daily goal, in minutes of reading (Home's goal counts every kind of study). Set in Ordo › Languages. */
export const codexGoal = (language: Pick<LanguageProfile, 'dailyGoal'>) => language.dailyGoal.codexMinutes ?? 15;

/** Time read in Codex today, as recorded (an open reader adds what it hasn't recorded yet). */
export function useReadToday(lang: string): number | undefined {
  return useLiveQuery(async () => (await db.dailyStats.get(`${lang}:${localDateKey()}`))?.readMs ?? 0, [lang]);
}

/** A thin ring that fills towards a goal; sage once it's reached. */
export function GoalRing({ value, size = 32, stroke = 3.5 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;
  const done = value >= 1;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-line" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={length}
        strokeDashoffset={length * (1 - Math.min(1, value))}
        className={cx('transition-[stroke-dashoffset] duration-700', done ? 'stroke-sage' : 'stroke-accent')}
      />
    </svg>
  );
}
