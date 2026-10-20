import { createBrowserRouter, Navigate, useParams } from 'react-router';
import HomePage from '@/features/home/HomePage';
import { BookDetailsPage, CantusPage, CodexPage, JournalEntryPage, CommutePage, DeckPage, LabPage, NewTextPage, OrdoPage, RatioPage, ReaderPage, SonusBookPage, SonusFeedPage, SonusPage, SonusPlayerPage, SpotifyCallbackPage, StarterPage, StationPage, StudyPage, ThesaurusPage, VisioPage, WatchPage, MundusPage, ColloquiumPage, ChatPage, GrammaticaPage, GrammarTopicPage, GrammarLessonPage } from './pages';
import { Root } from './Root';

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

function SongMoved({ games = false }: { games?: boolean }) {
  const { songId = '' } = useParams();
  return <Navigate to={`/cantus/song/${encodeURIComponent(songId)}${games ? '/games' : ''}`} replace />;
}

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Root />,
      children: [
        { index: true, element: <HomePage /> },
        { path: 'codex', element: <CodexPage /> },
        { path: 'codex/read/:textId', element: <ReaderPage /> },
        { path: 'codex/new', element: <NewTextPage /> },
        { path: 'codex/book/:textId', element: <BookDetailsPage /> },
        { path: 'codex/diarium/:entryId', element: <JournalEntryPage /> },
        { path: 'thesaurus', element: <ThesaurusPage /> },
        { path: 'thesaurus/deck/:deckId', element: <DeckPage /> },
        { path: 'thesaurus/ready/:key', element: <StarterPage /> },
        { path: 'thesaurus/study/:deckId', element: <StudyPage /> },
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
        { path: 'cantus/*', element: <CantusPage /> },
        // Kept as it is: learners entered this address in their own Spotify app.
        { path: 'cantus/spotify', element: <SpotifyCallbackPage /> },
        { path: 'visio', element: <VisioPage /> },
        { path: 'visio/watch/:mediaId', element: <WatchPage /> },
        { path: 'grammatica', element: <GrammaticaPage /> },
        { path: 'grammatica/review', element: <GrammarLessonPage review /> },
        { path: 'grammatica/:topicId', element: <GrammarTopicPage /> },
        { path: 'grammatica/:topicId/lesson', element: <GrammarLessonPage /> },
        { path: 'mundus', element: <MundusPage /> },
        { path: 'colloquium', element: <ColloquiumPage /> },
        { path: 'colloquium/chat/:chatId', element: <ChatPage /> },
        { path: 'ratio', element: <RatioPage /> },
        { path: 'ordo', element: <OrdoPage /> },
        { path: 'ordo/lab', element: <LabPage /> },
        { path: 'ordo/:group', element: <OrdoPage /> },
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ],
  { basename },
);
