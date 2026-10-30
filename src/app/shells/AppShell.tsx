import { PhraseCapture } from '@/features/phrasebook/Capture';
import { UiText } from '@/design/i18n/UiText';
import { ReferenceHelp } from '@/features/culture/ReferenceHelp';
import { Suspense, useEffect, useLayoutEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { useApp } from '@/app/context';
import { useFullMotion } from '@/app/motion';
import { roomKey } from '@/app/redirects';
import { sectionKey, SHORTCUT_SECTIONS } from '@/app/sections';
import { ShortcutsDialog } from '@/app/ShortcutsDialog';
import { MiniPlayer } from '@/features/sonus/MiniPlayer';
import { PlansSheet } from '@/features/plans/PlansSheet';
import { usePlanUpkeep } from '@/features/plans/usePlan';
import { GlobalSearchModal } from '@/features/search/GlobalSearchModal';
import { AskPanel } from '@/features/tutor/AskPanel';
import { AskButton } from '@/features/tutor/AskButton';
import { loadScriptFont } from '@/design/fonts';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { useLayout } from '@/design/hooks/useLayout';
import { pageEnter, pageEnterFull } from '@/design/motion';
import { ensureLexicon } from '@/services/packs/lexicon';
import { useUI } from '@/state/ui';
import { DesktopShell } from './desktop/DesktopShell';
import { TouchShell } from './touch/TouchShell';

/** Routes that take the whole screen (no sidebar, no tab bar). On phones the Sonus and Visio players and a Cantus song do too. */
const isImmersive = (pathname: string, wide: boolean) =>
  pathname.startsWith('/codex/read/') ||
  pathname.startsWith('/thesaurus/study/') ||
  pathname.startsWith('/thesaurus/practice/') ||
  pathname === '/cursus/grammatica/review' ||
  pathname === '/cursus/grammatica/placement' ||
  pathname === '/cursus/alphabets/review' ||
  /^\/cursus\/alphabets\/[^/]+\/lesson\/?$/.test(pathname) ||
  /^\/cursus\/grammatica\/[^/]+\/lesson\/?$/.test(pathname) ||
  /^\/cursus\/course\/[^/]+\/[^/]+\/?$/.test(pathname) ||
  pathname === '/sonus/commute' ||
  (pathname.startsWith('/cantus') && !pathname.startsWith('/cantus/spotify')) ||
  (!wide && (pathname.startsWith('/sonus/play/') || pathname.startsWith('/sonus/station/') || pathname.startsWith('/visio/watch/')));

/** On wide screens Settings' groups open beside their list, so moving between them isn't a new page. */
const pageKey = (pathname: string, wide: boolean) => (wide && /^\/settings(?:\/(?!lab)[\w-]+)?\/?$/.test(pathname) ? '/settings' : (roomKey(pathname) ?? pathname));

export function AppShell() {
  const { layout } = useLayout();
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const setShortcutsOpen = useUI((s) => s.setShortcutsOpen);
  const setGlobalSearchOpen = useUI((s) => s.setGlobalSearchOpen);
  const immersive = isImmersive(pathname, layout === 'wide');
  // The mini player shows everywhere except where the full player is on screen.
  const showMini = !immersive && !pathname.startsWith('/sonus/play/') && !pathname.startsWith('/sonus/station/') && !pathname.startsWith('/visio/watch/');
  const { language } = useApp();
  const fullMotion = useFullMotion();
  usePlanUpkeep();

  // Lets a language switch know when the new language is on screen (see app/languageSwitch.ts).
  useLayoutEffect(() => {
    document.documentElement.dataset.studying = language.id;
  }, [language.id]);

  // Arabic, Chinese, Japanese and Korean bring their own reading face; Japanese its word list.
  useEffect(() => {
    loadScriptFont(language.id);
    void ensureLexicon(language.id);
  }, [language.id]);

  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, hash]);

  useHotkeys({
    ...Object.fromEntries(SHORTCUT_SECTIONS.slice(0, 10).map((s, i) => [`alt+${sectionKey(i)}`, () => navigate(s.path)])),
    '?': () => setShortcutsOpen(true),
    'mod+k': () => setGlobalSearchOpen(true),
    'alt+t': () => { const s = useUI.getState(); if (s.tutorOpen) s.closeTutor(); else s.openTutor(); },
  });

  if (immersive) {
    return (
      <>
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
        <ReferenceHelp />
      <PhraseCapture />
        <ShortcutsDialog />
        <GlobalSearchModal />
        <PlansSheet />
        <AskPanel />
      </>
    );
  }

  const content = (
    <Suspense fallback={<div className="min-h-[60dvh]" />}>
      <motion.div key={pageKey(pathname, layout === 'wide')} {...(fullMotion ? pageEnterFull : pageEnter)}>
        <Outlet />
      </motion.div>
    </Suspense>
  );

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[90] focus:rounded-xl focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-on-accent focus:shadow-elev-3"
      ><UiText source={'Skip to main content'} /></a>
      {layout === 'wide' ? <DesktopShell>{content}</DesktopShell> : <TouchShell>{content}</TouchShell>}
      {showMini && <MiniPlayer />}
      <ReferenceHelp />
      <PhraseCapture />
      <ShortcutsDialog />
      <GlobalSearchModal />
      <PlansSheet />
      <AskPanel />
      {showMini && !pathname.startsWith('/settings') && !pathname.startsWith('/ordo') && (
        <AskButton variant="floating" />
      )}
    </>
  );
}
