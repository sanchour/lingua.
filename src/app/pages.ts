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
  sonus: () => import('@/features/sonus/SonusPage'),
  sonusPlayer: () => import('@/features/sonus/player/PlayerPage'),
  sonusFeed: () => import('@/features/sonus/FeedPage'),
  sonusBook: () => import('@/features/sonus/BookPage'),
  commute: () => import('@/features/sonus/CommutePage'),
  station: () => import('@/features/sonus/radio/StationPage'),
  cantus: () => import('@/features/cantus/room/CantusRoom'),
  spotifyCallback: () => import('@/features/cantus/SpotifyCallback'),
  visio: () => import('@/features/visio/VisioPage'),
  mundus: () => import('@/features/mundus/MundusPage'),
  grammatica: () => import('@/features/grammatica/GrammaticaPage'),
  grammarTopic: () => import('@/features/grammatica/TopicPage'),
  watch: () => import('@/features/visio/player/WatchPage'),
  ratio: () => import('@/features/ratio/RatioPage'),
  ordo: () => import('@/features/ordo/OrdoPage'),
  lab: () => import('@/features/lab/LabPage'),
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
export const SonusPage = lazy(loaders.sonus);
export const SonusPlayerPage = lazy(loaders.sonusPlayer);
export const SonusFeedPage = lazy(loaders.sonusFeed);
export const SonusBookPage = lazy(loaders.sonusBook);
export const CommutePage = lazy(loaders.commute);
export const StationPage = lazy(loaders.station);
export const CantusPage = lazy(loaders.cantus);
export const SpotifyCallbackPage = lazy(loaders.spotifyCallback);
export const VisioPage = lazy(loaders.visio);
export const MundusPage = lazy(loaders.mundus);
export const GrammaticaPage = lazy(loaders.grammatica);
export const GrammarTopicPage = lazy(loaders.grammarTopic);
export const WatchPage = lazy(loaders.watch);
export const RatioPage = lazy(loaders.ratio);
export const OrdoPage = lazy(loaders.ordo);
export const LabPage = lazy(loaders.lab);

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
