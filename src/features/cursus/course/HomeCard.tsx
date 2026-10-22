import { Link } from 'react-router';
import { ArrowRight, Route } from 'lucide-react';
import { LESSONS, OUTLINE } from '@/core/course/outline';
import { nextLesson, useCourseProgress } from '@/data/course';
import { Card } from '@/design/primitives';
import { useCan } from '@/features/plans/usePlan';
import { LESSON_ICON, lessonPath, useCourse } from './parts';

/** Home's card for the course: the next lesson, and how far through its unit you are. */
export function CourseHomeCard({ lang }: { lang: string }) {
  const allowed = useCan('course');
  const loaded = useCourse(lang);
  const progress = useCourseProgress(lang);
  if (!allowed || !loaded || !progress) return null;
  const next = nextLesson(progress, loaded.lessonsOf);
  if (!next) return null;
  const unit = OUTLINE.find((u) => u.id === next.unit)!;
  const Icon = LESSON_ICON[next.lesson];
  const doneUnits = OUTLINE.filter((u) => progress.get(u.id)?.doneAt).length;
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-1.5 text-[12px] font-bold tracking-[0.12em] text-sage-text uppercase">
          <Route size={14} aria-hidden /> Course
        </p>
        <Link to="/cursus/course" className="hit inline-flex items-center gap-1 text-[13px] font-semibold text-accent-text hover:underline">
          {doneUnits} of {OUTLINE.length} units <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
      <Link to={lessonPath(next.unit, next.lesson)} className="group -m-2 flex items-center gap-3.5 rounded-2xl p-2 transition-colors hover:bg-surface">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-text">
          <Icon size={21} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] font-semibold text-ink-faint">
            Unit {OUTLINE.indexOf(unit) + 1} · {LESSONS[next.lesson].title} · {next.done} of {next.of} done
          </span>
          <span className="block font-serif text-[17px] leading-snug font-semibold">{unit.title}</span>
          <span className="mt-0.5 line-clamp-2 block text-[13.5px] leading-snug text-ink-soft">{LESSONS[next.lesson].aim}.</span>
        </span>
      </Link>
    </Card>
  );
}
