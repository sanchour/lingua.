import { useUi } from '@/design/i18n/UiText';
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Brain, Briefcase, Check, Clapperboard, GraduationCap, Heart, Plane } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { LearningReason } from '@/data/settings';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { StepTitle } from './StepTitle';

export const REASONS: Array<{ id: LearningReason; name: string; blurb: string; quip: string; icon: LucideIcon }> = [
  { id: 'travel', name: 'Travel', blurb: 'Find your way, order, chat with locals', quip: 'Pack light; bring words.', icon: Plane },
  { id: 'family', name: 'Family & friends', blurb: 'Talk with the people you love', quip: 'The best reason there is.', icon: Heart },
  { id: 'work', name: 'Work', blurb: 'Meetings, mail and colleagues', quip: 'Your next meeting just got more interesting.', icon: Briefcase },
  { id: 'culture', name: 'Culture', blurb: 'Books, films and music in the original', quip: 'Subtitles off, sooner than you think.', icon: Clapperboard },
  { id: 'study', name: 'Study', blurb: 'A course, an exam or a stay abroad', quip: 'Top of the class, here we come.', icon: GraduationCap },
  { id: 'sharp', name: 'Keeping sharp', blurb: 'A good habit for a curious mind', quip: 'Crosswords, step aside.', icon: Brain },
];

interface WhyStepProps {
  /** The language's English name, for the title. */
  language: string;
  reasons: LearningReason[];
  onReasons: (reasons: LearningReason[]) => void;
}

/** Why, why are you here, huh? (5.1-2b): six tiles, any number, and a line that answers each pick. */
export function WhyStep({ language, reasons, onReasons }: WhyStepProps) {
  const translateUi = useUi();
  const [last, setLast] = useState<LearningReason | null>(null);
  const toggle = (id: LearningReason) => {
    const on = !reasons.includes(id);
    onReasons(on ? [...reasons, id] : reasons.filter((r) => r !== id));
    setLast(on ? id : null);
  };
  const reply = last && reasons.includes(last) ? REASONS.find((r) => r.id === last)!.quip : reasons.length >= 3 ? 'Now that’s what we call motivation.' : reasons.length ? 'Good reasons. Any more?' : 'No wrong answers. Well, mostly.';

  return (
    <div>
      <StepTitle title={translateUi('Why do you want to learn {0}?', [language])} body="Be honest, we won’t tell. Pick as many as you like." />

      <div role="group" aria-label={translateUi('Why you\'re learning')} className="grid grid-cols-3 gap-3">
        {REASONS.map((r) => {
          const on = reasons.includes(r.id);
          return (
            <button
              key={r.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(r.id)}
              className={cx(
                'no-callout relative flex flex-col items-center rounded-3xl border px-4 pt-5 pb-4 text-center transition-[transform,border-color,box-shadow,background-color] duration-200 active:scale-[0.97]',
                on ? '-translate-y-1 border-accent bg-accent-soft shadow-elev-2' : 'border-line bg-raised hover:-translate-y-0.5 hover:border-line-strong',
              )}
            >
              <motion.span
                animate={on ? { rotate: [0, -12, 8, 0], scale: [1, 1.15, 1] } : { rotate: 0, scale: 1 }}
                transition={{ duration: 0.45 }}
                className={cx('grid size-12 place-items-center rounded-2xl', on ? 'bg-accent-fill text-on-accent' : 'bg-surface text-ink-soft')}
              >
                <r.icon size={22} strokeWidth={1.6} aria-hidden />
              </motion.span>
              <span className="mt-3 font-serif text-[18px] font-semibold">{r.name}</span>
              <span className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">{r.blurb}</span>
              {on && (
                <span className="absolute top-3 right-3 grid size-5 place-items-center rounded-full bg-accent-fill text-on-accent">
                  <Check size={12} strokeWidth={3.2} aria-hidden />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-7 h-8 text-center" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={reply} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={spring.snappy} className="font-serif text-[19px] text-accent-text italic">
            {reply}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
