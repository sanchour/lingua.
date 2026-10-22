import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate, useLocation, useParams } from 'react-router';
import HomePage from '@/features/home/HomePage';
import { BookDetailsPage, CantusPage, CodexPage, JournalEntryPage, CommutePage, CursusPage, DeckPage, LabPage, MentisPage, NewTextPage, OrdoPage, RatioPage, ReaderPage, SonusBookPage, SonusFeedPage, SonusPage, SonusPlayerPage, SpotifyCallbackPage, StarterPage, StationPage, StudyPage, ThesaurusPage, WatchPage, ChatPage, GrammarTopicPage, GrammarLessonPage, LettersLessonPage, CourseLessonPage } from './pages';
import { PlanRoute } from '@/features/plans/PlanRoute';
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
        { path: 'codex', element: <CodexPage /> },
        { path: 'codex/discover', element: <CodexPage /> },
        { path: 'codex/goodreads', element: <CodexPage /> },
        { path: 'codex/read/:textId', element: <ReaderPage /> },
        { path: 'codex/new', element: <NewTextPage /> },
        { path: 'codex/book/:textId', element: <BookDetailsPage /> },
        { path: 'thesaurus', element: <ThesaurusPage /> },
        { path: 'thesaurus/deck/:deckId', element: <DeckPage /> },
        { path: 'thesaurus/ready/:key', element: <StarterPage /> },
        { path: 'thesaurus/study/:deckId', element: <StudyPage /> },
        // Sonus et Visio: one library for listening and watching; the players keep their addresses.
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
        { path: 'visio/watch/:mediaId', element: <WatchPage /> },
        // Mentis: Mundus (with its own tabs), Sermo and Diarium; a chat and an entry are pages of their own.
        { path: 'mentis/*', element: <MentisPage /> },
        {
          path: 'mentis/sermo/chat/:chatId',
          element: (
            <PlanRoute feature="sermo" fallback="/mentis/sermo">
              <ChatPage />
            </PlanRoute>
          ),
        },
        { path: 'mentis/diarium/:entryId', element: <JournalEntryPage /> },
        { path: 'ratio', element: <RatioPage /> },
        { path: 'settings', element: <OrdoPage /> },
        { path: 'settings/lab', element: <LabPage /> },
        { path: 'settings/:group', element: <OrdoPage /> },
        // Addresses from before Lingua 5.
        ...['grammatica/*', 'visio', 'mundus/*', 'colloquium/*', 'codex/diarium/:entryId', 'ordo/*'].map((path) => ({ path, element: <Moved /> })),
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ],
  { basename },
);
