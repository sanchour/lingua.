import { createBrowserRouter, Navigate } from 'react-router';
import HomePage from '@/features/home/HomePage';
import { BookDetailsPage, CodexPage, JournalEntryPage, CommutePage, DeckPage, LabPage, NewTextPage, OrdoPage, RatioPage, ReaderPage, SonusFeedPage, SonusPage, SonusPlayerPage, StarterPage, StudyPage, ThesaurusPage, VisioPage, WatchPage } from './pages';
import { Root } from './Root';

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

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
        { path: 'sonus/commute', element: <CommutePage /> },
        { path: 'visio', element: <VisioPage /> },
        { path: 'visio/watch/:mediaId', element: <WatchPage /> },
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
