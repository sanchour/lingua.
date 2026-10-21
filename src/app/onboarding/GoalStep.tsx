import { Flag } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Level } from '@/core/lang/levels';
import type { CefrLevel } from '@/data/types';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { StepTitle } from './StepTitle';

/** The daily times the slider snaps to, each with its name. */
export const DAILY_MINUTES: Array<{ minutes: number; name: string }> = [
  { minutes: 5, name: 'A sip' },
  { minutes: 10, name: 'Steady' },
  { minutes: 15, name: 'Regular' },
  { minutes: 20, name: 'Keen' },
  { minutes: 30, name: 'Serious' },
  { minutes: 45, name: 'Deep' },
  { minutes: 60, name: 'Immersed' },
];

const ORDER: CefrLevel[] = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
/** Each level as a milestone worth aiming for. */
const MILESTONE: Record<CefrLevel, string> = {
  A0: 'Starting out',
  A1: 'First words',
  A2: 'Get by',
  B1: 'Hold a conversation',
  B2: 'Talk with ease',
  C1: 'Read anything',
  C2: 'Like a native',
};
/**
 * Roughly how many hours of study reach each level from zero: the middle of the guided learning hours
 * usually given for the CEFR levels (Cambridge's estimates). Only for a rough "how long".
 */
const HOURS: Record<CefrLevel, number> = { A0: 0, A1: 95, A2: 190, B1: 375, B2: 550, C1: 750, C2: 1100 };

/** The goal a level starts with: two steps up from zero, one step up after that. */
export function defaultGoal(level: Level): CefrLevel {
  return level === 'A0' ? 'A2' : ORDER[Math.min(ORDER.length - 1, ORDER.indexOf(level) + 1)];
}

/** About how long the goal takes at so many minutes a day, said plainly. */
function howLong(from: Level, to: CefrLevel, minutes: number): string {
  const days = ((HOURS[to] - HOURS[from]) * 60) / minutes;
  const months = days / 30.4;
  if (months < 1.5) return 'a few weeks';
  if (months < 24) return `${Math.round(months)} months`;
  return `${Math.round(months / 12)} years`;
}

interface GoalStepProps {
  level: Level;
  goal: CefrLevel;
  minutes: number;
  onGoal: (goal: CefrLevel) => void;
  onMinutes: (minutes: number) => void;
}

/** Set your own goal (5.1-2b): the level to reach, as milestones on a path, and minutes a day on a slider; then about how long. */
export function GoalStep({ level, goal, minutes, onGoal, onMinutes }: GoalStepProps) {
  const ahead = ORDER.slice(ORDER.indexOf(level) + 1);
  const index = Math.max(0, DAILY_MINUTES.findIndex((d) => d.minutes === minutes));
  const last = DAILY_MINUTES.length - 1;
  const step = (to: number) => onMinutes(DAILY_MINUTES[Math.min(last, Math.max(0, to))].minutes);
  const onKey = (e: KeyboardEvent) => {
    const to = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? index + 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? index - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? last : null;
    if (to === null) return;
    e.preventDefault();
    step(to);
  };
  const reach = ahead.indexOf(goal);
  const verdict = minutes >= 45 ? 'Ambitious. We like it.' : minutes <= 5 ? 'Small sips add up.' : 'A pace that lasts.';
  const time = howLong(level, goal, minutes);

  return (
    <div>
      <StepTitle title="Set your own goal" body="Aim high, start small. Both can change any time in Settings." />

      {/* The path: where you are, then each level ahead as a milestone; the goal carries the flag. */}
      <h2 className="mb-3 text-[12px] font-bold tracking-[0.08em] text-ink-faint uppercase">Where do you want to get?</h2>
      <div role="radiogroup" aria-label="The level to reach" className="flex items-stretch gap-2">
        <div className="flex w-24 shrink-0 flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong px-2 py-3 text-center">
          <span className="text-[11px] font-bold tracking-wide text-ink-faint uppercase">You</span>
          <span className="font-serif text-[20px] font-semibold text-ink-soft">{level}</span>
        </div>
        {ahead.map((l, i) => {
          const on = l === goal;
          const passed = i < reach;
          return (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onGoal(l)}
              className={cx(
                'no-callout relative flex min-w-0 flex-1 flex-col items-center rounded-2xl border px-2 py-3 text-center transition-[transform,background-color,border-color] duration-200 active:scale-[0.97]',
                on ? '-translate-y-1 border-accent bg-accent-soft shadow-elev-2' : passed ? 'border-accent/30 bg-raised' : 'border-line bg-raised hover:-translate-y-0.5 hover:border-line-strong',
              )}
            >
              {on && (
                <motion.span layoutId="goal-flag" transition={spring.snappy} className="absolute -top-3 grid size-6 place-items-center rounded-full bg-accent-fill text-on-accent shadow-elev-1">
                  <Flag size={12} strokeWidth={2.6} aria-hidden />
                </motion.span>
              )}
              <span className={cx('font-serif text-[20px] font-semibold', on || passed ? 'text-accent-text' : 'text-ink')}>{l}</span>
              <span className="mt-0.5 text-[12px] leading-tight text-ink-soft">{MILESTONE[l]}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex items-baseline justify-between">
        <h2 className="text-[12px] font-bold tracking-[0.08em] text-ink-faint uppercase">Time a day</h2>
        <p className="font-serif text-[22px] font-semibold text-accent-text tabular-nums">{minutes} min</p>
      </div>
      {/* A slider that snaps to the checkpoints; the track is drawn by hand so the marks line up with the names. */}
      <div className="mt-2 px-3">
        <div
          role="slider"
          tabIndex={0}
          aria-label="Time a day"
          aria-valuemin={DAILY_MINUTES[0].minutes}
          aria-valuemax={DAILY_MINUTES[last].minutes}
          aria-valuenow={minutes}
          aria-valuetext={`${minutes} minutes, ${DAILY_MINUTES[index].name}`}
          onKeyDown={onKey}
          onPointerDown={(e) => {
            const box = e.currentTarget.getBoundingClientRect();
            const pick = (x: number) => step(Math.round(((x - box.left) / box.width) * last));
            pick(e.clientX);
            e.currentTarget.setPointerCapture(e.pointerId);
            e.currentTarget.onpointermove = (m) => pick(m.clientX);
            e.currentTarget.onpointerup = (u) => {
              (u.currentTarget as HTMLElement).onpointermove = null;
            };
          }}
          className="relative h-8 cursor-pointer rounded-full outline-offset-4"
        >
          <span className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-line-strong/70" />
          <span className="absolute top-1/2 left-0 h-1.5 w-full origin-left -translate-y-1/2 rounded-full bg-accent transition-transform duration-200" style={{ transform: `translateY(-50%) scaleX(${index / last})` }} />
          {DAILY_MINUTES.map((d, i) => (
            <span key={d.minutes} className={cx('absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full', i <= index ? 'bg-accent' : 'bg-line-strong')} style={{ left: `${(i / last) * 100}%` }} />
          ))}
          {/* The thumb rides a full-width layer moved by transform, so a percentage is of the track. */}
          <span className="pointer-events-none absolute inset-0 transition-transform duration-200" style={{ transform: `translateX(${(index / last) * 100}%)` }}>
            <span className="absolute top-1/2 left-0 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-accent bg-raised shadow-elev-2" />
          </span>
        </div>
        <div className="relative mt-2 h-10">
          {DAILY_MINUTES.map((d, i) => (
            <button
              key={d.minutes}
              type="button"
              tabIndex={-1}
              onClick={() => onMinutes(d.minutes)}
              className={cx('absolute -translate-x-1/2 text-center leading-tight', i === index ? 'text-accent-text' : 'text-ink-faint hover:text-ink-soft')}
              style={{ left: `${(i / last) * 100}%` }}
            >
              <span className="block text-[12.5px] font-semibold tabular-nums">{d.minutes}</span>
              <span className="block text-[11.5px] whitespace-nowrap">{d.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* The sum: about how long, at this pace. */}
      <div className="mt-6 flex items-center gap-4 rounded-3xl border border-line bg-raised px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-snug">
            At {minutes} minutes a day, {goal} in about{' '}
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={time} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={spring.snappy} className="inline-block font-serif text-[20px] font-semibold text-accent-text">
                {time}
              </motion.span>
            </AnimatePresence>
            .
          </p>
          <p className="mt-0.5 text-[12px] text-ink-faint">A rough guide from the usual hours of study per level. Reading and listening every day count.</p>
        </div>
        <p className="shrink-0 font-serif text-[15px] text-ink-soft italic">{verdict}</p>
      </div>
    </div>
  );
}
