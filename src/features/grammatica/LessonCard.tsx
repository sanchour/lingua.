import { useState } from 'react';
import { Link } from 'react-router';
import { Play, Repeat, Settings2, Zap } from 'lucide-react';
import { STEPS } from '@/core/grammar/progress';
import type { TopicState } from '@/core/grammar/progress';
import type { Topic } from '@/core/grammar/types';
import { DRILL_KINDS, DRILL_NAME } from '@/core/grammar/drills';
import { buttonClasses, IconButton } from '@/design/primitives';
import { LessonSetup } from '@/features/lesson/kit';
import { cx } from '@/lib/cx';
import { eyebrow, TopicRing } from './parts';

const SETUP_KINDS = DRILL_KINDS.map((id) => ({ id, label: DRILL_NAME[id] }));

/**
 * A topic's lessons: the five steps as dots, the one to do next, and ways in: the step's lesson,
 * a mixed practice once learned, a Lightning round, and the setup sheet.
 */
export function LessonCard({ topic, state }: { topic: Topic; state?: TopicState }) {
  const [setup, setSetup] = useState(false);
  const step = state?.step ?? 1;
  const learned = step >= 6;
  const current = STEPS[Math.min(step, 5) - 1];
  return (
    <div className="mt-6 rounded-3xl border border-line/70 bg-surface p-4 sm:p-5">
      <div className="flex items-center gap-4">
        <TopicRing state={state} size={56} />
        <div className="min-w-0 flex-1">
          <p className={cx(eyebrow, 'text-sage-text')}>{learned ? (state?.mastered ? 'Mastered' : 'Learned') : `Step ${step} of 5`}</p>
          <p className="mt-0.5 font-serif text-[19px] leading-tight font-semibold">{learned ? 'Keep it fresh' : `${current.name}: ${current.hint.toLowerCase()}`}</p>
          <ol className="mt-2 flex gap-1.5" aria-label="Steps">
            {STEPS.map((s) => (
              <li
                key={s.n}
                title={`${s.n}. ${s.name}`}
                className={cx('h-1.5 flex-1 rounded-full', s.n < step ? 'bg-sage' : s.n === step ? 'bg-sage/40' : 'bg-sunken')}
              />
            ))}
          </ol>
        </div>
        <IconButton icon={Settings2} label="Lesson settings" size="sm" variant="soft" onClick={() => setSetup(true)} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to={`/grammatica/${topic.id}/lesson${learned ? '?mode=practice' : ''}`} className={cx(buttonClasses('primary', 'md'), 'flex-1 sm:flex-none')}>
          {learned ? <Repeat size={17} aria-hidden /> : <Play size={17} aria-hidden />}
          {learned ? 'Practise' : state?.started ? `Continue: step ${step}` : 'Start'}
        </Link>
        {!learned && step > 1 && (
          <Link to={`/grammatica/${topic.id}/lesson?mode=practice`} className={buttonClasses('secondary', 'md')}>
            <Repeat size={17} aria-hidden />
            Mixed
          </Link>
        )}
        <Link to={`/grammatica/${topic.id}/lesson?mode=lightning`} className={buttonClasses('secondary', 'md')}>
          <Zap size={17} aria-hidden />
          Lightning
        </Link>
        {state && state.due > 0 && <span className="self-center text-[13.5px] font-semibold text-accent-text">{state.due} due for review</span>}
      </div>
      <LessonSetup open={setup} onClose={() => setSetup(false)} kinds={SETUP_KINDS} offKey="grammarOff" />
    </div>
  );
}
