import { lazy } from 'react';

// Sections are separate chunks; they are preloaded in the background after start-up
// so switching tabs never waits on the network.
const loaders = {
  codex: () => import('@/features/codex/CodexPage'),
  reader: () => import('@/features/codex/reader/ReaderPage'),
  newText: () => import('@/features/codex/NewTextPage'),
  bookDetails: () => import('@/features/codex/BookDetailsPage'),
  journalEntry: () => import('@/features/codex/diarium/EntryPage'),
  thesaurus: () => import('@/features/thesaurus/ThesaurusPage'),
  deck: () => import('@/features/thesaurus/deck/DeckPage'),
  starter: () => import('@/features/thesaurus/StarterPage'),
  study: () => import('@/features/thesaurus/study/StudyPage'),
  practice: () => import('@/features/practice/PracticePage'),
  games: () => import('@/features/games/GamesPage'),
  wordsAloud: () => import('@/features/sonus/WordsAloud'),
  make: () => import('@/features/generate/MakePage'),
  sonus: () => import('@/features/sonus/SonusPage'),
  sonusPlayer: () => import('@/features/sonus/player/PlayerPage'),
  sonusFeed: () => import('@/features/sonus/FeedPage'),
  sonusBook: () => import('@/features/sonus/BookPage'),
  commute: () => import('@/features/sonus/CommutePage'),
  station: () => import('@/features/sonus/radio/StationPage'),
  cantus: () => import('@/features/cantus/room/CantusRoom'),
  spotifyCallback: () => import('@/features/cantus/SpotifyCallback'),
  cursus: () => import('@/features/cursus/CursusPage'),
  mentis: () => import('@/features/mentis/MentisPage'),
  grammarTopic: () => import('@/features/grammatica/TopicPage'),
  grammarLesson: () => import('@/features/grammatica/GrammarLessonPage'),
  courseLesson: () => import('@/features/cursus/course/CourseLessonPage'),
  lettersLesson: () => import('@/features/grammatica/letters/LettersLessonPage'),
  visio: () => import('@/features/visio/VisioPage'),
  watch: () => import('@/features/visio/player/WatchPage'),
  bibliotheca: () => import('@/features/bibliotheca/BibliothecaPage'),
  explora: () => import('@/features/explora/ExploraPage'),
  ratio: () => import('@/features/ratio/RatioPage'),
  ordo: () => import('@/features/ordo/OrdoPage'),
  lab: () => import('@/features/lab/LabPage'),
  translatePractice: () => import('@/features/translate/TranslatePracticePage'),
};

export const CodexPage = lazy(loaders.codex);
export const ReaderPage = lazy(loaders.reader);
export const NewTextPage = lazy(loaders.newText);
export const BookDetailsPage = lazy(loaders.bookDetails);
export const JournalEntryPage = lazy(loaders.journalEntry);
export const ThesaurusPage = lazy(loaders.thesaurus);
export const DeckPage = lazy(loaders.deck);
export const StarterPage = lazy(loaders.starter);
export const StudyPage = lazy(loaders.study);
export const PracticePage = lazy(loaders.practice);
export const GamesPage = lazy(loaders.games);
export const WordsAloudPage = lazy(loaders.wordsAloud);
export const MakePage = lazy(loaders.make);
export const SonusPage = lazy(loaders.sonus);
export const SonusPlayerPage = lazy(loaders.sonusPlayer);
export const SonusFeedPage = lazy(loaders.sonusFeed);
export const SonusBookPage = lazy(loaders.sonusBook);
export const CommutePage = lazy(loaders.commute);
export const StationPage = lazy(loaders.station);
export const CantusPage = lazy(loaders.cantus);
export const SpotifyCallbackPage = lazy(loaders.spotifyCallback);
export const CursusPage = lazy(loaders.cursus);
export const MentisPage = lazy(loaders.mentis);
export const GrammarTopicPage = lazy(loaders.grammarTopic);
export const GrammarLessonPage = lazy(loaders.grammarLesson);
export const CourseLessonPage = lazy(loaders.courseLesson);
export const LettersLessonPage = lazy(loaders.lettersLesson);
export const VisioPage = lazy(loaders.visio);
export const WatchPage = lazy(loaders.watch);
export const BibliothecaPage = lazy(loaders.bibliotheca);
export const ExploraPage = lazy(loaders.explora);
export const RatioPage = lazy(loaders.ratio);
export const OrdoPage = lazy(loaders.ordo);
export const LabPage = lazy(loaders.lab);
export const TranslatePracticePage = lazy(loaders.translatePractice);

/** Fetches every section chunk when the browser is idle. Returns a cancel function. */
export function preloadSections(): () => void {
  const run = () => Object.values(loaders).forEach((load) => void load());
  // Safari has no requestIdleCallback; fall back to a short delay.
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(run, { timeout: 3000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(run, 1200);
  return () => window.clearTimeout(id);
}
