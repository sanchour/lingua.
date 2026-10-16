import { lazy } from 'react';

// Sections are separate chunks; they are preloaded in the background after start-up
// so switching tabs never waits on the network.
const loaders = {
  codex: () => import('@/features/codex/CodexPage'),
  reader: () => import('@/features/codex/reader/ReaderPage'),
  thesaurus: () => import('@/features/thesaurus/ThesaurusPage'),
  deck: () => import('@/features/thesaurus/deck/DeckPage'),
  study: () => import('@/features/thesaurus/study/StudyPage'),
  sonus: () => import('@/features/sonus/SonusPage'),
  visio: () => import('@/features/visio/VisioPage'),
  ratio: () => import('@/features/ratio/RatioPage'),
  ordo: () => import('@/features/ordo/OrdoPage'),
  lab: () => import('@/features/lab/LabPage'),
};

export const CodexPage = lazy(loaders.codex);
export const ReaderPage = lazy(loaders.reader);
export const ThesaurusPage = lazy(loaders.thesaurus);
export const DeckPage = lazy(loaders.deck);
export const StudyPage = lazy(loaders.study);
export const SonusPage = lazy(loaders.sonus);
export const VisioPage = lazy(loaders.visio);
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
