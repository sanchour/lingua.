import { BookOpen, Briefcase, Check, Clapperboard, Heart, MessageCircle, Plane, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { LearningReason } from '@/data/settings';
import { cx } from '@/lib/cx';
import { StepTitle } from './StepTitle';

export const REASONS: Array<{ id: LearningReason; name: string; icon: LucideIcon }> = [
  { id: 'travel', name: 'Travel', icon: Plane },
  { id: 'books', name: 'Reading books', icon: BookOpen },
  { id: 'talk', name: 'Talking with people', icon: MessageCircle },
  { id: 'family', name: 'Family & roots', icon: Heart },
  { id: 'work', name: 'Work or study', icon: Briefcase },
  { id: 'culture', name: 'Films, music & culture', icon: Clapperboard },
  { id: 'fun', name: 'Just for fun', icon: Sparkles },
];

export const DAILY_MINUTES: Array<{ minutes: number; name: string; blurb: string }> = [
  { minutes: 5, name: 'A sip', blurb: 'A few cards with your coffee' },
  { minutes: 10, name: 'Steady', blurb: 'A page and a review' },
  { minutes: 15, name: 'Regular', blurb: 'A chapter, cards and a little listening' },
  { minutes: 30, name: 'Serious', blurb: 'Real progress every week' },
  { minutes: 45, name: 'Immersed', blurb: 'Living in the language' },
];

interface GoalStepProps {
  reasons: LearningReason[];
  minutes: number;
  onReasons: (reasons: LearningReason[]) => void;
  onMinutes: (minutes: number) => void;
}

/** Why you're learning (any number) and how long a day feels right, which becomes the daily goal. */
export function GoalStep({ reasons, minutes, onReasons, onMinutes }: GoalStepProps) {
  const toggle = (id: LearningReason) => onReasons(reasons.includes(id) ? reasons.filter((r) => r !== id) : [...reasons, id]);
  return (
    <div>
      <StepTitle title="What brings you here?" body="Pick as many as you like, then how much time a day feels right." />

      <div role="group" aria-label="Why you're learning" className="flex flex-wrap gap-2">
        {REASONS.map((r) => {
          const on = reasons.includes(r.id);
          return (
            <button
              key={r.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(r.id)}
              className={cx(
                'no-callout inline-flex h-11 items-center gap-2 rounded-full border px-4 text-[14.5px] font-semibold transition-[transform,background-color,border-color] duration-150 active:scale-[0.97]',
                on ? 'border-accent bg-accent-soft text-accent-text' : 'border-line bg-raised text-ink hover:border-line-strong',
              )}
            >
              {on ? <Check size={16} strokeWidth={3} aria-hidden /> : <r.icon size={16} aria-hidden />}
              {r.name}
            </button>
          );
        })}
      </div>

      <h2 className="mt-8 mb-3 text-[13px] font-bold tracking-wide text-ink-soft uppercase">Time a day</h2>
      <div role="radiogroup" aria-label="Time a day" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {DAILY_MINUTES.map((d) => {
          const selected = d.minutes === minutes;
          return (
            <button
              key={d.minutes}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onMinutes(d.minutes)}
              className={cx(
                'no-callout flex flex-col items-start rounded-2xl border p-3.5 text-left transition-[transform,background-color,border-color] duration-150 active:scale-[0.98] sm:items-center sm:text-center',
                selected ? 'border-accent bg-accent-soft' : 'border-line bg-raised hover:border-line-strong',
              )}
            >
              <span className={cx('font-serif text-[24px] leading-none font-semibold tabular-nums', selected && 'text-accent-text')}>
                {d.minutes}
                <span className="ml-0.5 text-[14px] font-medium">min</span>
              </span>
              <span className="mt-1.5 text-[14px] font-semibold">{d.name}</span>
              <span className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">{d.blurb}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[13px] text-ink-faint">Your daily goal. Change it any time in Ordo.</p>
    </div>
  );
}
