// Good free courses, linked per language beside LibriVox's audiobooks. Every address was checked
// live on 2026-10-19; nothing is fetched from them, they open in the browser.
import { LANGUAGES } from '@/core/lang/languages';

export interface FreeCourse {
  name: string;
  /** Who made it. */
  by: string;
  url: string;
  /** One plain line on what it is like. */
  detail: string;
}

// Language Transfer's course pages, under their own names.
const LANGUAGE_TRANSFER: Record<string, { name: string; path: string }> = {
  es: { name: 'Complete Spanish', path: 'complete-spanish' },
  fr: { name: 'Introduction to French', path: 'french' },
  de: { name: 'Complete German', path: 'german' },
  it: { name: 'Introduction to Italian', path: 'italian' },
  el: { name: 'Complete Greek', path: 'greek' },
  tr: { name: 'Introduction to Turkish', path: 'turkish' },
  sw: { name: 'Complete Swahili', path: 'swahili' },
  ar: { name: 'Introduction to Arabic', path: 'arabic' },
};

// The FSI courses are the US government's, so free to share; yojik.eu keeps them with their audio.
// Spanish has several courses, on an index page of its own.
const FSI: Record<string, string> = {
  es: 'spanish-index',
  fr: 'french',
  de: 'german',
  it: 'italian',
  pt: 'portuguese',
  ru: 'russian',
  el: 'greek',
  sv: 'swedish',
  hu: 'hungarian',
  nb: 'norwegian',
  tr: 'turkish',
  sw: 'swahili',
  ar: 'arabic',
  zh: 'chinese-mandarin',
  yue: 'cantonese',
  ja: 'japanese',
  ko: 'korean',
  pl: 'polish',
  hi: 'hindi',
  tl: 'tagalog',
  th: 'thai',
  fa: 'persian',
  cs: 'czech',
  ro: 'romanian',
  sh: 'serbo-croatian',
  vi: 'vietnamese',
};

// LibriVox's catalogue page for each language (its own ids). Unlike the search in the app, it also
// lists short works inside multilingual collections. Serbian (56) has three books besides Croatian's
// six; Swahili, Vietnamese, Thai, Georgian, Uzbek and Mongolian have none yet.
const LIBRIVOX: Record<string, number> = {
  en: 1, es: 5, fr: 2, de: 3, it: 4, pt: 52, ru: 54, el: 26, sv: 58, hu: 28, nl: 19, nb: 49, tr: 61, id: 31, la: 39, ar: 9,
  zh: 14, ja: 35, ko: 38, hi: 72, pl: 51, tl: 59, fa: 21, yue: 78, cs: 16, ro: 53, sh: 68, ms: 69, ta: 60,
};

function coursesFor(lang: string, name: string): FreeCourse[] {
  const courses: FreeCourse[] = [];
  const transfer = LANGUAGE_TRANSFER[lang];
  if (transfer) {
    courses.push({
      name: transfer.name,
      by: 'Language Transfer',
      url: `https://www.languagetransfer.org/${transfer.path}`,
      detail: 'Audio-only, thinking method: no memorising, builds sentences from the first lesson.',
    });
  }
  if (FSI[lang]) {
    courses.push({
      name: `FSI ${name}`,
      by: 'Foreign Service Institute',
      url: `https://fsi-languages.yojik.eu/languages/FSI/fsi-${FSI[lang]}.html`,
      detail: 'The US diplomats’ courses: drills with tapes and books, free and old-fashioned, but thorough.',
    });
  }
  if (LIBRIVOX[lang]) {
    courses.push({
      name: `${name} audiobooks`,
      by: 'LibriVox',
      url: `https://librivox.org/search?primary_key=${LIBRIVOX[lang]}&search_category=language&search_page=1&search_form=get_results`,
      detail: 'Old books read aloud by volunteers: the whole catalogue in the language, short works too.',
    });
  }
  return courses;
}

/** The free courses for each language that has any. */
export const FREE_COURSES: Record<string, FreeCourse[]> = Object.fromEntries(
  LANGUAGES.map((l) => [l.code, coursesFor(l.code, l.name)] as const).filter(([, courses]) => courses.length),
);

export function freeCourses(lang: string): FreeCourse[] {
  return FREE_COURSES[lang] ?? [];
}
