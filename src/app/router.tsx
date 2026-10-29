import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate, useLocation, useParams } from 'react-router';
import HomePage from '@/features/home/HomePage';
import {
  BibliothecaPage,
  BookDetailsPage,
  CantusPage,
  CodexPage,
  CommutePage,
  CourseLessonPage,
  CursusPage,
  DeckPage,
  ExploraPage,
  GrammarLessonPage,
  GrammarTopicPage,
  JournalEntryPage,
  LabPage,
  LettersLessonPage,
  MentisPage,
  NewTextPage,
  OrdoPage,
  MakePage,
  PracticePage,
  RatioPage,
  ReaderPage,
  SonusBookPage,
  SonusFeedPage,
  SonusPage,
  SonusPlayerPage,
  SpotifyCallbackPage,
  StarterPage,
  StationPage,
  StudyPage,
  ThesaurusPage,
  VisioPage,
  WatchPage,
} from './pages';
import { PlanRoute } from '@/features/plans/PlanRoute';
import { AppError } from './AppError';
import { movedPath } from './redirects';
import { Root } from './Root';

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

function SongMoved({ games = false }: { games?: boolean }) {
  const { songId = '' } = useParams();
  return <Navigate to={`/cantus/song/${encodeURIComponent(songId)}${games ? '/games' : ''}`} replace />;
}

/** Grammatica's pages come with Lingua+ (5.1-2a); without it, back to Cursus › Grammatica and the plans. */
const grammar = (page: ReactNode) => (
  <PlanRoute feature="grammatica" fallback="/cursus/grammatica">
    {page}
  </PlanRoute>
);

/** The course's lessons come with Lingua+ too; without it, back to Cursus › Course and the plans. */
const course = (page: ReactNode) => (
  <PlanRoute feature="course" fallback="/cursus/course">
    {page}
  </PlanRoute>
);

/** An address from before Lingua 5's rooms (app/redirects.ts says where it went). */
function Moved() {
  const { pathname, search, hash } = useLocation();
  return <Navigate to={`${movedPath(pathname, search) ?? '/'}${hash}`} replace />;
}

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Root />,
      errorElement: <AppError />,
      children: [
        { index: true, element: <HomePage /> },
        // Cursus: the course, Grammatica, alphabets and typing as tabs; lessons and topics as pages of their own.
        { path: 'cursus', element: <CursusPage /> },
        { path: 'cursus/:tab', element: <CursusPage /> },
        { path: 'cursus/course/:unit/:lesson', element: course(<CourseLessonPage />) },
        { path: 'cursus/grammatica/review', element: grammar(<GrammarLessonPage review />) },
        { path: 'cursus/grammatica/placement', element: grammar(<GrammarLessonPage placement />) },
        { path: 'cursus/grammatica/:topicId', element: grammar(<GrammarTopicPage />) },
        { path: 'cursus/grammatica/:topicId/lesson', element: grammar(<GrammarLessonPage />) },
        { path: 'cursus/alphabets/review', element: <LettersLessonPage review /> },
        { path: 'cursus/alphabets/:groupId/lesson', element: <LettersLessonPage /> },
        // Explora & Bibliotheca: discovery and unified library across every tool.
        { path: 'explora', element: <ExploraPage /> },
        { path: 'bibliotheca', element: <BibliothecaPage /> },
        { path: 'codex', element: <CodexPage /> },
        { path: 'codex/graded', element: <CodexPage /> },
        { path: 'codex/discover', element: <CodexPage /> },
        { path: 'codex/goodreads', element: <CodexPage /> },
        { path: 'codex/read/:textId', element: <ReaderPage /> },
        { path: 'codex/new', element: <NewTextPage /> },
        { path: 'codex/book/:textId', element: <BookDetailsPage /> },
        { path: 'thesaurus', element: <ThesaurusPage /> },
        { path: 'thesaurus/deck/:deckId', element: <DeckPage /> },
        { path: 'thesaurus/ready/:key', element: <StarterPage /> },
        { path: 'thesaurus/study/:deckId', element: <StudyPage /> },
        // What Max makes: a story, sentences, a dialogue or a word list, checked and labelled (6-6b).
        { path: 'thesaurus/make', element: <MakePage /> },
        // Practice sets in every kind of exercise (6-4b): Lingua+, like Ludus.
        {
          path: 'thesaurus/practice/:set?',
          element: (
            <PlanRoute feature="ludus" fallback="/thesaurus">
              <PracticePage />
            </PlanRoute>
          ),
        },
        // Sonus & Visio: separate rooms for listening and watching.
        { path: 'sonus', element: <SonusPage /> },
        { path: 'sonus/play/:mediaId', element: <SonusPlayerPage /> },
        { path: 'sonus/podcast/:feedId', element: <SonusFeedPage /> },
        { path: 'sonus/book/:bookId', element: <SonusBookPage /> },
        { path: 'sonus/audiobooks', element: <Navigate to="/sonus?tab=books" replace /> },
        { path: 'sonus/commute', element: <CommutePage /> },
        { path: 'sonus/station/:stationId', element: <StationPage /> },
        { path: 'sonus/song/:songId', element: <SongMoved /> },
        { path: 'sonus/song/:songId/games', element: <SongMoved games /> },
        // Cantus, the music room: one page that shows its tabs, player and games by the address.
        {
          path: 'cantus/*',
          element: (
            <PlanRoute feature="sonusPlus" fallback="/sonus">
              <CantusPage />
            </PlanRoute>
          ),
        },
        // Kept as it is: learners entered this address in their own Spotify app.
        { path: 'cantus/spotify', element: <SpotifyCallbackPage /> },
        { path: 'visio', element: <VisioPage /> },
        { path: 'visio/watch/:mediaId', element: <WatchPage /> },
        // Mentis: Mundus (with its own tabs), Sermo and Diarium; an entry is a page of its own.
        // Mundus's Explore and Every pick are Explore in Explora now: the old addresses move there.
        ...['mentis/explore', 'mentis/picks'].map((path) => ({ path, element: <Moved /> })),
        { path: 'mentis/*', element: <MentisPage /> },
        // The chat inside Lingua went in 5.2-6: old chat links open Sermo (the chats stay in the database).
        { path: 'mentis/sermo/chat/:chatId', element: <Navigate to="/mentis/sermo" replace /> },
        { path: 'mentis/diarium/:entryId', element: <JournalEntryPage /> },
        { path: 'ratio', element: <RatioPage /> },
        { path: 'settings', element: <OrdoPage /> },
        { path: 'settings/lab', element: <LabPage /> },
        { path: 'settings/:group', element: <OrdoPage /> },
        // Addresses from before Lingua 5.
        ...['grammatica/*', 'mundus/*', 'colloquium/*', 'codex/diarium/:entryId', 'ordo/*'].map((path) => ({ path, element: <Moved /> })),
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ],
  { basename },
);
