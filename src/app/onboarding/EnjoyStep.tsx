import { motion } from 'motion/react';
import { BookOpen, Clapperboard, Headphones, Layers, PenLine } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Enjoyment, LearningReason } from '@/data/settings';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { StepTitle } from './StepTitle';

export const ENJOYMENTS: Array<{ id: Enjoyment; name: string; place: string; blurb: string; icon: LucideIcon }> = [
  { id: 'reading', name: 'Reading', place: 'Codex', blurb: 'Books, stories and articles, a tap from every meaning', icon: BookOpen },
  { id: 'listening', name: 'Listening', place: 'Sonus', blurb: 'Podcasts and audio with a transcript that follows along', icon: Headphones },
  { id: 'watching', name: 'Watching', place: 'Visio', blurb: 'Films and shows with subtitles in both languages', icon: Clapperboard },
  { id: 'writing', name: 'Writing', place: 'Diarium', blurb: 'A few lines a day in your own journal', icon: PenLine },
  { id: 'cards', name: 'Flashcards & games', place: 'Thesaurus', blurb: 'Decks that come back at the right time, and Ludus lessons', icon: Layers },
];

/** A first guess from why someone is learning, so the step rarely starts empty. */
export function enjoymentsFor(reasons: LearningReason[]): Enjoyment[] {
  const out: Enjoyment[] = [];
  const add = (e: Enjoyment) => !out.includes(e) && out.push(e);
  for (const r of reasons) {
    if (r === 'books') add('reading');
    if (r === 'culture') add('watching');
    if (r === 'talk' || r === 'travel') add('listening');
    if (r === 'work') add('cards');
  }
  return out;
}

interface EnjoyStepProps {
  enjoys: Enjoyment[];
  onEnjoys: (enjoys: Enjoyment[]) => void;
}

/** What you enjoy most, in the order you pick it: Home puts those first. */
export function EnjoyStep({ enjoys, onEnjoys }: EnjoyStepProps) {
  const toggle = (id: Enjoyment) => onEnjoys(enjoys.includes(id) ? enjoys.filter((e) => e !== id) : [...enjoys, id]);
  return (
    <div>
      <StepTitle title="What do you enjoy most?" body="Home suggests these first, in the order you pick them. Everything else stays a tap away." />
      <div role="group" aria-label="What you enjoy" className="grid gap-2 sm:grid-cols-2">
        {ENJOYMENTS.map((e) => {
          const rank = enjoys.indexOf(e.id);
          const on = rank >= 0;
          return (
            <button
              key={e.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(e.id)}
              className={cx(
                'no-callout flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-[transform,background-color,border-color] duration-150 active:scale-[0.98]',
                on ? 'border-accent bg-accent-soft' : 'border-line bg-raised hover:border-line-strong',
              )}
            >
              <span className={cx('relative grid size-11 shrink-0 place-items-center rounded-xl', on ? 'bg-accent-fill text-on-accent' : 'bg-sunken text-ink-soft')}>
                <e.icon size={20} aria-hidden />
                {on && (
                  <motion.span
                    key={rank}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={spring.snappy}
                    className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-raised text-[11px] font-bold text-accent-text shadow-elev-1 tabular-nums"
                    aria-label={`Choice ${rank + 1}`}
                  >
                    {rank + 1}
                  </motion.span>
                )}
              </span>
              <span className="min-w-0">
                <span className="flex items-baseline gap-2">
                  <span className="text-[15px] font-semibold">{e.name}</span>
                  <span className="text-[12px] font-semibold text-ink-faint">{e.place}</span>
                </span>
                <span className="block text-[13px] leading-snug text-ink-soft">{e.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
