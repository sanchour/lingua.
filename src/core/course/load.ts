import type { CourseContent } from './types';

// Each language's course is a module of its own, loaded when Cursus opens in that language.
const MODULES = import.meta.glob<{ default: CourseContent }>('./content/*.ts');

const pathOf = (lang: string) => `./content/${lang}.ts`;

/** Languages with a course (the six core languages, as each is written). */
export const hasCourse = (lang: string) => pathOf(lang) in MODULES;

export const COURSE_LANGS = Object.keys(MODULES).map((p) => p.slice('./content/'.length, -'.ts'.length));

const cache = new Map<string, Promise<CourseContent | null>>();

export function loadCourse(lang: string): Promise<CourseContent | null> {
  let hit = cache.get(lang);
  if (!hit) {
    const load = MODULES[pathOf(lang)];
    hit = load ? load().then((m) => m.default) : Promise.resolve(null);
    cache.set(lang, hit);
  }
  return hit;
}
