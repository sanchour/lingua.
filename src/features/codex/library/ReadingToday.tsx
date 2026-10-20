import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/data/db';
import { updateLanguage } from '@/data/languages';
import type { LanguageProfile } from '@/data/types';
import { Popover } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { localDateKey } from '@/lib/format';

export const CODEX_GOALS = [5, 10, 15, 20, 30, 45, 60];

/** Codex's own daily goal, in minutes of reading (Home's goal counts every kind of study). */
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

/** Codex's header: today's reading against the goal, which opens to choose another goal. */
export function ReadingToday({ language }: { language: LanguageProfile }) {
  const ms = useReadToday(language.id) ?? 0;
  const goal = codexGoal(language);
  const minutes = Math.floor(ms / 60_000);
  return (
    <Popover
      label="Daily reading goal"
      placement="bottom-end"
      trigger={(props) => (
        <button type="button" {...props} className="flex h-11 shrink-0 items-center gap-2.5 rounded-xl pr-3 pl-2 transition-colors hover:bg-surface" title="Your daily reading goal">
          <GoalRing value={ms / (goal * 60_000)} />
          <span className="text-left leading-tight">
            <span className="block text-[14px] font-semibold tabular-nums">
              {minutes} of {goal} min
            </span>
            <span className="block text-[11.5px] text-ink-faint">{minutes >= goal ? 'goal reached today' : 'read today'}</span>
          </span>
        </button>
      )}
    >
      {(close) => (
        <div className="w-64 p-3.5">
          <p className="text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">Daily reading goal</p>
          <p className="mt-1 text-[13px] leading-snug text-ink-soft">Time with a book or a text in Codex. A quiet note says when it’s reached, at the end of a page.</p>
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {CODEX_GOALS.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={m === goal}
                onClick={() => {
                  void updateLanguage(language.id, { dailyGoal: { ...language.dailyGoal, codexMinutes: m } });
                  close();
                }}
                className={cx('h-9 rounded-lg text-[13.5px] font-semibold tabular-nums transition-colors', m === goal ? 'bg-ink text-bg' : 'bg-surface hover:bg-sunken')}
              >
                {m}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-ink-faint">minutes a day</p>
        </div>
      )}
    </Popover>
  );
}
