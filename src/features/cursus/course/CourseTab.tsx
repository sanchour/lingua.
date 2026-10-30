import { UiText, useUi } from '@/design/i18n/UiText';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight, Check, Flag, Route } from 'lucide-react';
import { useApp } from '@/app/context';
import { getLanguage } from '@/core/lang/languages';
import { LESSONS, OUTLINE } from '@/core/course/outline';
import { nextLesson, useCourseProgress } from '@/data/course';
import type { NextLesson } from '@/data/course';
import type { CourseProgressRow } from '@/data/types';
import { buttonClasses, Card, EmptyState } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { AdventurePath } from './AdventurePath';
import { lessonPath, useCourse } from './parts';
import type { LoadedCourse } from './parts';

/** Cursus › Course: the course as a trail of lessons, where you are on it, and the next lesson a click away. */
export function CourseTab() {
  const translateUi = useUi();
  const { language } = useApp();
  const lang = language.id;
  const loaded = useCourse(lang);
  const progress = useCourseProgress(lang);

  if (loaded === undefined || !progress) return null;
  if (loaded === null) {
    return (
      <Card className="mt-8">
        <EmptyState icon={Route} title={translateUi('The {0} course is being written', [getLanguage(lang)?.name ?? lang])}><UiText source={'A path of units named by what you can do after them. Spanish is ready; the other core languages follow. Until then, Grammatica and the rest of Lingua work as always.'} /></EmptyState>
      </Card>
    );
  }
  const next = nextLesson(progress, loaded.lessonsOf);

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_330px]">
      <AdventurePath progress={progress} lessonsOf={loaded.lessonsOf} next={next} />
      <WhereYouAre next={next} progress={progress} loaded={loaded} />
    </div>
  );
}

function WhereYouAre({ next, progress, loaded }: { next: NextLesson | null; progress: Map<string, CourseProgressRow>; loaded: LoadedCourse }) {
  const translateUi = useUi();
  const doneUnits = OUTLINE.filter((u) => progress.get(u.id)?.doneAt);
  const canDo = doneUnits.reduce((n, u) => n + u.canDo.length, 0);
  const unit = next ? OUTLINE.find((u) => u.id === next.unit)! : null;
  return (
    <aside className="space-y-4 lg:sticky lg:top-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft}>
        <Card className="p-5">
          {unit && next ? (
            <>
              <p className="text-[12px] font-bold tracking-[0.12em] text-sage-text uppercase"><UiText source={'Unit {0} · {1}'} values={[OUTLINE.indexOf(unit) + 1, unit.level]} /></p>
              <h2 className="mt-1 font-serif text-xl leading-tight font-semibold">{unit.title}</h2>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
                  <div className="h-full origin-left rounded-full bg-accent" style={{ transform: `scaleX(${Math.max(0.03, next.done / next.of)})` }} />
                </div>
                <span className="text-xs font-semibold text-ink-faint tabular-nums">
                  {next.done}/{next.of}
                </span>
              </div>
              <Link to={lessonPath(next.unit, next.lesson)} className={cx(buttonClasses('primary', 'md', true), 'mt-4')}>
                {next.done === 0 && OUTLINE.indexOf(unit) === 0 ? translateUi('Start') : translateUi('Continue')}: {LESSONS[next.lesson].title} <ArrowRight size={16} aria-hidden />
              </Link>
              <p className="mt-2 text-center text-[12.5px] text-ink-faint">{LESSONS[next.lesson].aim}.</p>
              {next.lesson !== 'check' && (
                <Link to={lessonPath(next.unit, 'check')} className="mt-3 flex items-center justify-center gap-1.5 text-[13px] font-semibold text-ink-soft hover:text-ink"><UiText source={'{0} Know it already? Take the unit check'} values={[<Flag size={13} aria-hidden />]} /></Link>
              )}
            </>
          ) : (
            <>
              <p className="text-[12px] font-bold tracking-[0.12em] text-sage-text uppercase"><UiText source={'Course complete'} /></p>
              <h2 className="mt-1 font-serif text-xl leading-tight font-semibold"><UiText source={'All twelve units done'} /></h2>
              <p className="mt-2 text-sm text-ink-soft"><UiText source={'Keep going with books in Codex, Grammatica’s B1 and B2 topics, and Sermo’s conversations.'} /></p>
            </>
          )}
        </Card>
      </motion.div>
      <Card className="p-5">
        <p className="text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase"><UiText source={'What you can do'} /></p>
        {doneUnits.length ? (
          <>
            <p className="mt-1 font-serif text-2xl font-semibold tabular-nums">
              {canDo} <span className="font-sans text-sm font-semibold text-ink-faint"><UiText source={'things, in {0} {1}'} values={[doneUnits.length, doneUnits.length === 1 ? 'unit' : 'units']} /></span>
            </p>
            <ul className="mt-2 space-y-1 text-[13.5px] text-ink-soft">
              {doneUnits.slice(-4).map((u) => (
                <li key={u.id} className="flex items-start gap-2">
                  <Check size={14} className="mt-0.5 shrink-0 text-sage-text" aria-hidden /> {u.title}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-1 text-sm text-ink-soft"><UiText source={'Each unit you finish adds what you can do with {0}. The first takes about half an hour.'} values={[loaded.course.lang === 'zh' ? 'Mandarin' : getLanguage(loaded.course.lang)?.name]} /></p>
        )}
      </Card>
    </aside>
  );
}
