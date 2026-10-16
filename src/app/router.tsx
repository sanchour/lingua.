import { createBrowserRouter, Navigate } from 'react-router';
import HomePage from '@/features/home/HomePage';
import { CodexPage, DeckPage, LabPage, OrdoPage, RatioPage, ReaderPage, SonusPage, StudyPage, ThesaurusPage, VisioPage } from './pages';
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
        { path: 'thesaurus', element: <ThesaurusPage /> },
        { path: 'thesaurus/deck/:deckId', element: <DeckPage /> },
        { path: 'thesaurus/study/:deckId', element: <StudyPage /> },
        { path: 'sonus', element: <SonusPage /> },
        { path: 'visio', element: <VisioPage /> },
        { path: 'ratio', element: <RatioPage /> },
        { path: 'ordo', element: <OrdoPage /> },
        { path: 'ordo/lab', element: <LabPage /> },
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ],
  { basename },
);
