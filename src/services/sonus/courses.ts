// Good free courses per language, as a catalogue (Lingua 5.2-3) of three kinds:
//  - feed: a course published as a podcast, added to your shelf and played in Sonus;
//  - files: the FSI courses' audio on archive.org (public domain), added as a course; the textbook
//    stays on the page that keeps it;
//  - link: a course that plays only on its own site (Language Transfer), or a catalogue.
// Every address was checked live (links 2026-10-19; feeds and archive.org items 2026-10-25).
import { LANGUAGES } from '@/core/lang/languages';

export type CourseKind = 'feed' | 'files' | 'link';
export type CourseLevel = 'Beginner' | 'Beginner to intermediate' | 'Intermediate' | 'All levels';

export interface FreeCourse {
  name: string;
  /** Who made it. */
  by: string;
  url: string;
  /** One plain line on what it is like. */
  detail: string;
  kind: CourseKind;
  level: CourseLevel;
  cover?: string;
  /** The podcast feed (kind feed). */
  feed?: string;
  /** The archive.org item with its audio (kind files). */
  archive?: string;
  /** How much there is ("340 episodes", "18 lessons"). */
  size?: string;
}

const art = (path: string) => `https://is1-ssl.mzstatic.com/image/thumb/${path}/600x600bb.jpg`;

// Courses published as podcasts, for the six core languages: only feeds whose hosts let web apps
// read them (CORS), since Lingua has no server; Acast's (Coffee Break) and some others don't, so
// they aren't here. Found in iTunes' directory and checked on 2026-10-25.
const FEEDS: Record<string, FreeCourse[]> = {
  es: [
    { name: 'Beginner Spanish', by: 'Spanish Obsessed', kind: 'feed', level: 'Beginner', size: 'About 50 lessons', feed: 'https://feeds.transistor.fm/beginner-spanish-with-spanish-obsessed', url: 'https://spanishobsessed.com', cover: art('Podcasts221/v4/18/63/b8/1863b89d-ed73-a48a-970f-b940ad3b8af6/mza_17187934987166706228.jpg'), detail: 'A Colombian and an English learner talk through everyday Spanish, step by step.' },
    { name: 'Duolingo Spanish Podcast', by: 'Duolingo', kind: 'feed', level: 'Intermediate', size: 'About 170 episodes', feed: 'https://anchor.fm/s/fc714074/podcast/rss', url: 'https://podcast.duolingo.com/spanish', cover: art('Podcasts115/v4/aa/a0/f5/aaa0f562-64a8-401f-bfe8-7b6a49ec5943/mza_2619062143639023486.png'), detail: 'True stories told in slow, clear Spanish, with a little English to keep you on track.' },
  ],
  fr: [
    { name: 'InnerFrench', by: 'Hugo Cotton', kind: 'feed', level: 'Intermediate', size: 'About 200 episodes', feed: 'https://podcast.innerfrench.com/feed.xml', url: 'https://innerfrench.com', cover: art('Podcasts126/v4/5f/4b/51/5f4b5121-b307-4b0c-4ba9-3fba7aba161d/mza_1141892237621262066.jpg'), detail: 'Interesting topics in clear, natural French, all in French, at a pace you can follow.' },
    { name: 'Duolingo French Podcast', by: 'Duolingo', kind: 'feed', level: 'Intermediate', size: 'About 125 episodes', feed: 'https://anchor.fm/s/fb438900/podcast/rss', url: 'https://podcast.duolingo.com/french', cover: art('Podcasts125/v4/82/43/08/824308a8-b30b-539a-6fc1-18d5ac787aec/mza_15493622278625165449.png'), detail: 'True stories told in slow, clear French, with a little English to keep you on track.' },
  ],
  de: [
    { name: 'DeutschFluss', by: 'DeutschFluss', kind: 'feed', level: 'Beginner', size: 'About 140 episodes', feed: 'https://anchor.fm/s/1043b6a50/podcast/rss', url: 'https://anchor.fm/s/1043b6a50/podcast/rss', cover: art('Podcasts211/v4/35/eb/4d/35eb4dc4-8bc6-b529-67ed-82996cdf2b52/mza_17046509025535191426.jpg'), detail: 'Short, slow German for beginners, about everyday things.' },
    { name: 'News in Easy German', by: 'Lingopie', kind: 'feed', level: 'Intermediate', size: 'About 100 episodes', feed: 'https://feeds.castos.com/x4pwm', url: 'https://lingopie.com', cover: art('Podcasts211/v4/f6/14/83/f6148377-4862-c7e8-8a79-b91ad3e8bd87/mza_15430024480617241542.jpg'), detail: 'The news in simple German, read slowly and clearly.' },
  ],
  ru: [
    { name: 'Learn Russian with Max', by: 'Russian With Max', kind: 'feed', level: 'Beginner to intermediate', size: 'About 400 episodes', feed: 'https://anchor.fm/s/6f65684/podcast/rss', url: 'https://anchor.fm/s/6f65684/podcast/rss', cover: art('Podcasts113/v4/92/83/30/92833010-bfdd-2edb-782f-10eb473248bc/mza_6399438820546287062.jpg'), detail: 'Comprehensible Russian: stories and everyday topics in Russian you can follow, from early on.' },
    { name: 'Slow Russian', by: 'Daria Molchanova', kind: 'feed', level: 'Intermediate', size: 'About 120 episodes', feed: 'https://rss.libsyn.com/shows/75566/destinations/334707.xml', url: 'https://slowrussianpodcast.com', cover: art('Podcasts125/v4/b2/7f/74/b27f74bf-b17c-e924-bc3b-dab85b078e85/mza_6710792209895146159.png'), detail: 'Russian life and culture told slowly, all in Russian, with the text to read along.' },
  ],
  ar: [
    { name: 'Learn Arabic', by: 'ArabicPod101', kind: 'feed', level: 'Beginner', size: 'The latest 60 lessons', feed: 'https://www.arabicpod101.com/wp-feed-audio-video.php', url: 'https://www.arabicpod101.com', cover: art('Podcasts123/v4/1c/60/fd/1c60fd7a-c729-f6e2-0569-4676d5136f36/mza_3147114486335533066.jpg'), detail: 'Short lessons on a dialogue, explained in English; the free feed carries the newest ones.' },
  ],
  zh: [
    { name: 'ChinesePod Beginner', by: 'ChinesePod', kind: 'feed', level: 'Beginner', size: 'About 1,000 lessons', feed: 'https://anchor.fm/s/109bf914/podcast/rss', url: 'https://chinesepod.com', cover: art('Podcasts221/v4/51/52/af/5152affe-7fd1-4937-6a8b-5fdc9861f116/mza_5926757141302167004.jpg'), detail: 'Short dialogues from daily life, each one explained, then said again slowly.' },
    { name: 'Chinese Beginner Stories', by: 'maayot', kind: 'feed', level: 'Beginner', size: 'About 650 stories', feed: 'https://anchor.fm/s/10b37f6ac/podcast/rss', url: 'https://maayot.com', cover: art('Podcasts211/v4/10/df/77/10df77af-cb17-8fd0-0c70-620666bbc66a/mza_10316156257758281511.jpg'), detail: 'A short story a day in simple Mandarin, read slowly.' },
  ],
};

// FSI courses whose audio archive.org keeps as one item, ordered by unit (public domain).
const FSI_ARCHIVE: Record<string, { id: string; name: string; size: string }> = {
  es: { id: 'Fsi-SpanishBasicCourse-Volume1', name: 'Spanish Basic Course, volume 1', size: '10 lessons, about 4 hours' },
  fr: { id: 'Fsi-FrenchBasicCourserevised-Volume1', name: 'French Basic Course, volume 1', size: '18 lessons, about 7 hours' },
  de: { id: 'FSIGermanBasicCourseVolume1Unit022.2', name: 'German Basic Course, volume 1', size: '43 lessons, about 16 hours' },
  ru: { id: 'FSIRussianFAST', name: 'Russian FAST', size: '9 lessons, about 5 hours' },
};

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
  const courses: FreeCourse[] = [...(FEEDS[lang] ?? [])];
  const transfer = LANGUAGE_TRANSFER[lang];
  if (transfer) {
    courses.push({
      name: transfer.name,
      by: 'Language Transfer',
      url: `https://www.languagetransfer.org/${transfer.path}`,
      detail: 'Audio-only, thinking method: no memorising, builds sentences from the first lesson.',
      kind: 'link',
      level: 'Beginner to intermediate',
    });
  }
  if (FSI[lang]) {
    const files = FSI_ARCHIVE[lang];
    courses.push({
      name: files ? `FSI ${files.name}` : `FSI ${name}`,
      by: 'Foreign Service Institute',
      url: `https://fsi-languages.yojik.eu/languages/FSI/fsi-${FSI[lang]}.html`,
      detail: files ? 'The US diplomats’ course: drills on tape, old-fashioned but thorough. The audio comes into Sonus; the textbook is on the course’s page.' : 'The US diplomats’ courses: drills with tapes and books, free and old-fashioned, but thorough.',
      kind: files ? 'files' : 'link',
      level: 'Beginner to intermediate',
      ...(files ? { archive: files.id, size: files.size } : {}),
    });
  }
  if (LIBRIVOX[lang]) {
    courses.push({
      name: `${name} audiobooks`,
      by: 'LibriVox',
      url: `https://librivox.org/search?primary_key=${LIBRIVOX[lang]}&search_category=language&search_page=1&search_form=get_results`,
      detail: 'Old books read aloud by volunteers: the whole catalogue in the language, short works too.',
      kind: 'link',
      level: 'All levels',
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
