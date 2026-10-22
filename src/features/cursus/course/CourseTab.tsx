import { Link } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight, Check, Flag, Route } from 'lucide-react';
import { useApp } from '@/app/context';
import { getLanguage } from '@/core/lang/languages';
import { LESSONS, OUTLINE } from '@/core/course/outline';
import type { CourseLevel, LessonId, UnitOutline } from '@/core/course/outline';
import { nextLesson, useCourseProgress } from '@/data/course';
import type { NextLesson } from '@/data/course';
import type { CourseProgressRow } from '@/data/types';
import { buttonClasses, Card, EmptyState } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { LESSON_ICON, lessonPath, useCourse } from './parts';
import type { LoadedCourse } from './parts';

const LEVEL_NAME: Record<CourseLevel, string> = { A1: 'Beginner', A2: 'Elementary', B1: 'Intermediate' };
const LEVELS: CourseLevel[] = ['A1', 'A2', 'B1'];

/** Cursus › Course: the path of units, where you are on it, and the next lesson a click away. */
export function CourseTab() {
  const { language } = useApp();
  const lang = language.id;
  const loaded = useCourse(lang);
  const progress = useCourseProgress(lang);

  if (loaded === undefined || !progress) return null;
  if (loaded === null) {
    return (
      <Card className="mt-8">
        <EmptyState icon={Route} title={`The ${getLanguage(lang)?.name ?? lang} course is being written`}>
          A path of units named by what you can do after them. Spanish is ready; the other core languages follow. Until then, Grammatica and the rest of Lingua work as always.
        </EmptyState>
      </Card>
    );
  }
  const next = nextLesson(progress, loaded.lessonsOf);

  return (
    <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_330px]">
      <div className="space-y-10">
        {LEVELS.map((level) => (
          <section key={level} aria-label={`${level}, ${LEVEL_NAME[level]}`}>
            <header className="mb-4 flex items-baseline gap-2.5 border-b border-line pb-2">
              <h2 className="font-serif text-xl font-semibold">{level}</h2>
              <span className="text-sm font-semibold text-ink-faint">{LEVEL_NAME[level]}</span>
            </header>
            <ol className="relative space-y-3">
              {OUTLINE.filter((u) => u.level === level).map((u) => (
                <UnitRow key={u.id} unit={u} number={OUTLINE.indexOf(u) + 1} row={progress.get(u.id)} lessons={loaded.lessonsOf(u.id)} current={next?.unit === u.id ? next.lesson : undefined} />
              ))}
            </ol>
          </section>
        ))}
      </div>
      <WhereYouAre next={next} progress={progress} loaded={loaded} />
    </div>
  );
}

function UnitRow({ unit, number, row, lessons, current }: { unit: UnitOutline; number: number; row?: CourseProgressRow; lessons: LessonId[]; current?: LessonId }) {
  const done = Boolean(row?.doneAt);
  const count = lessons.filter((l) => row?.lessons[l]).length;
  return (
    <li className={cx('relative flex gap-4 rounded-2xl p-3 transition-colors', current ? 'bg-surface shadow-elev-1' : 'hover:bg-surface/60')}>
      <span
        className={cx(
          'grid size-10 shrink-0 place-items-center rounded-full font-serif text-[17px] font-semibold tabular-nums',
          done ? 'bg-sage text-bg' : current ? 'bg-accent text-on-accent' : 'border border-line-strong text-ink-soft',
        )}
        aria-hidden
      >
        {done ? <Check size={19} strokeWidth={3} /> : number}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-3">
          <h3 className="min-w-0 flex-1 font-serif text-[18px] leading-snug font-semibold">{unit.title}</h3>
          <span className="shrink-0 text-[12px] font-semibold text-ink-faint tabular-nums">{done ? 'Done' : `${count} of ${lessons.length}`}</span>
        </div>
        {current && (
          <ul className="mt-1.5 space-y-0.5 text-[13.5px] text-ink-soft">
            {unit.canDo.map((c) => (
              <li key={c}>· {c}</li>
            ))}
          </ul>
        )}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {lessons.map((l) => {
            const Icon = LESSON_ICON[l];
            const finished = Boolean(row?.lessons[l]);
            const isNext = current === l;
            return (
              <Link
                key={l}
                to={lessonPath(unit.id, l)}
                title={`${LESSONS[l].title}: ${LESSONS[l].aim}`}
                className={cx(
                  'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold transition-colors',
                  isNext ? 'bg-accent text-on-accent hover:brightness-105' : finished ? 'bg-sage-soft text-sage-text hover:brightness-95' : 'bg-sunken text-ink-soft hover:bg-surface hover:text-ink',
                )}
              >
                {finished && !isNext ? <Check size={13} strokeWidth={3} aria-hidden /> : <Icon size={13} aria-hidden />}
                {LESSONS[l].title}
              </Link>
            );
          })}
        </div>
      </div>
    </li>
  );
}

function WhereYouAre({ next, progress, loaded }: { next: NextLesson | null; progress: Map<string, CourseProgressRow>; loaded: LoadedCourse }) {
  const doneUnits = OUTLINE.filter((u) => progress.get(u.id)?.doneAt);
  const canDo = doneUnits.reduce((n, u) => n + u.canDo.length, 0);
  const unit = next ? OUTLINE.find((u) => u.id === next.unit)! : null;
  return (
    <aside className="space-y-4 lg:sticky lg:top-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft}>
        <Card className="p-5">
          {unit && next ? (
            <>
              <p className="text-[12px] font-bold tracking-[0.12em] text-sage-text uppercase">
                Unit {OUTLINE.indexOf(unit) + 1} · {unit.level}
              </p>
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
                {next.done === 0 && OUTLINE.indexOf(unit) === 0 ? 'Start' : 'Continue'}: {LESSONS[next.lesson].title} <ArrowRight size={16} aria-hidden />
              </Link>
              <p className="mt-2 text-center text-[12.5px] text-ink-faint">{LESSONS[next.lesson].aim}.</p>
              {next.lesson !== 'check' && (
                <Link to={lessonPath(next.unit, 'check')} className="mt-3 flex items-center justify-center gap-1.5 text-[13px] font-semibold text-ink-soft hover:text-ink">
                  <Flag size={13} aria-hidden /> Know it already? Take the unit check
                </Link>
              )}
            </>
          ) : (
            <>
              <p className="text-[12px] font-bold tracking-[0.12em] text-sage-text uppercase">Course complete</p>
              <h2 className="mt-1 font-serif text-xl leading-tight font-semibold">All twelve units done</h2>
              <p className="mt-2 text-sm text-ink-soft">Keep going with books in Codex, Grammatica’s B1 and B2 topics, and Sermo’s conversations.</p>
            </>
          )}
        </Card>
      </motion.div>
      <Card className="p-5">
        <p className="text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">What you can do</p>
        {doneUnits.length ? (
          <>
            <p className="mt-1 font-serif text-2xl font-semibold tabular-nums">
              {canDo} <span className="font-sans text-sm font-semibold text-ink-faint">things, in {doneUnits.length} {doneUnits.length === 1 ? 'unit' : 'units'}</span>
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
          <p className="mt-1 text-sm text-ink-soft">Each unit you finish adds what you can do with {loaded.course.lang === 'zh' ? 'Mandarin' : getLanguage(loaded.course.lang)?.name}. The first takes about half an hour.</p>
        )}
      </Card>
    </aside>
  );
}
