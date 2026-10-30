import { UiText, useUi } from '@/design/i18n/UiText';
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { FEATURE_NAME, FEATURE_PLAN } from '@/data/plan';
import type { Feature } from '@/data/plan';
import { buttonClasses, Card } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { useUI } from '@/state/ui';
import { MaxMark } from './PlanMarks';
import { useCan } from './usePlan';

/** A small "+" (or MAX) chip on something locked; it opens the plans with that plan lifted. Never more than this. */
export function PlusChip({ feature, className }: { feature: Feature; className?: string }) {
  const translateUi = useUi();
  const openPlans = useUI((s) => s.openPlans);
  const max = FEATURE_PLAN[feature] === 'max';
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openPlans(feature);
      }}
      title={translateUi('{0} comes with {1}', [FEATURE_NAME[feature], max ? 'Lingua+ Max' : 'Lingua+'])}
      aria-label={translateUi('{0}: see {1}', [FEATURE_NAME[feature], max ? 'Lingua+ Max' : 'Lingua+'])}
      className={cx('inline-flex shrink-0 items-center', max ? '' : 'h-5 rounded-full bg-accent-soft px-1.5 text-[12px] leading-none font-bold text-accent-text', className)}
    >
      {max ? <MaxMark /> : '+'}
    </button>
  );
}

const WHAT: Record<Feature, string> = {
  ludus: 'Games for your decks: choices, pairs, gaps, building sentences, saying words aloud, Lightning.',
  sonusPlus: 'Songs to sing and learn with lyrics that follow, podcasts to find, and song games.',
  streaming: 'The shows on your streaming services in this language, with subtitles to study beside them.',
  course: 'A path of units named by what you can do after them, lesson by lesson.',
  grammatica: 'The grammar as short topics with real sentences, drills and reviews.',
  typing: 'The language’s letters and accents on your keyboard, with short drills.',
  sermo: 'Scenes at your level to talk through in the AI you use, by voice or text.',
  ai: 'AI translation, diary checking, automatic dictation and natural voices, with your own free key.',
};

/** In place of a locked room or tab: what it is, and the way to it. Calm, one button. */
export function LockedCard({ feature, title }: { feature: Feature; title?: string }) {
  const translateUi = useUi();
  const openPlans = useUI((s) => s.openPlans);
  const max = FEATURE_PLAN[feature] === 'max';
  return (
    <Card className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4">{max ? <MaxMark className="text-[13px]" /> : <span className="font-serif text-[40px] leading-none text-accent-text">+</span>}</span>
      <h2 className="font-serif text-2xl font-semibold">{title ?? translateUi('{0} comes with {1}', [FEATURE_NAME[feature], max ? 'Lingua+ Max' : 'Lingua+'])}</h2>
      <p className="mt-2 max-w-md text-[15px] leading-relaxed text-ink-soft">{WHAT[feature]}</p>
      <button type="button" onClick={() => openPlans(feature)} className={cx(buttonClasses('primary', 'md'), 'mt-6')}><UiText source={'See the plans {0}'} values={[<ArrowRight size={16} aria-hidden />]} /></button>
    </Card>
  );
}

/** "See Lingua+ Max" where AI would answer: opens the plans on Max. */
export function MaxLink({ children = 'See Lingua+ Max', className }: { children?: ReactNode; className?: string }) {
  const openPlans = useUI((s) => s.openPlans);
  return (
    <button type="button" onClick={() => openPlans('ai')} className={cx('font-semibold underline-offset-2 hover:underline', className)}>
      {children}
    </button>
  );
}

/** Shows its children when the plan opens the feature, the locked card otherwise. */
export function RequirePlan({ feature, children }: { feature: Feature; children: ReactNode }) {
  return useCan(feature) ? <>{children}</> : <LockedCard feature={feature} />;
}
