import { useEffect, useState } from 'react';
import { BookA, Blocks, Flag, MessageSquareText, Mic, PenLine } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { loadGrammar } from '@/core/grammar/load';
import type { Grammar } from '@/core/grammar/types';
import { loadCourse } from '@/core/course/load';
import { unitLessons } from '@/core/course/lessons';
import type { LessonId, UnitId } from '@/core/course/outline';
import type { CourseContent } from '@/core/course/types';

export const LESSON_ICON: Record<LessonId, LucideIcon> = { words: Blocks, phrases: MessageSquareText, grammar: BookA, speak: Mic, write: PenLine, check: Flag };

export const lessonPath = (unit: UnitId, lesson: LessonId) => `/cursus/course/${unit}/${lesson}`;

export interface LoadedCourse {
  course: CourseContent;
  grammar: Grammar | null;
  /** The lessons each unit has in this language. */
  lessonsOf: (unit: UnitId) => LessonId[];
}

/** The language's course and grammar; null when the language has no course (yet). */
export function useCourse(lang: string): LoadedCourse | null | undefined {
  const [state, setState] = useState<{ lang: string; loaded: LoadedCourse | null }>();
  useEffect(() => {
    let alive = true;
    void Promise.all([loadCourse(lang), loadGrammar(lang)]).then(([course, grammar]) => {
      if (!alive) return;
      setState({ lang, loaded: course ? { course, grammar, lessonsOf: (unit) => unitLessons(course.units[unit], grammar) } : null });
    });
    return () => {
      alive = false;
    };
  }, [lang]);
  return state?.lang === lang ? state.loaded : undefined;
}
