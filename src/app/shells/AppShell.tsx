import { Suspense, useEffect, useLayoutEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { useApp } from '@/app/context';
import { useFullMotion } from '@/app/motion';
import { sectionKey, SECTIONS } from '@/app/sections';
import { ShortcutsDialog } from '@/app/ShortcutsDialog';
import { MiniPlayer } from '@/features/sonus/MiniPlayer';
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
  pathname === '/grammatica/review' ||
  /^\/grammatica\/[^/]+\/lesson\/?$/.test(pathname) ||
  pathname === '/sonus/commute' ||
  (pathname.startsWith('/cantus') && !pathname.startsWith('/cantus/spotify')) ||
  (!wide && (pathname.startsWith('/sonus/play/') || pathname.startsWith('/sonus/station/') || pathname.startsWith('/visio/watch/') || pathname.startsWith('/colloquium/chat/')));

/** On wide screens Ordo's groups open beside their list, so moving between them isn't a new page. */
const pageKey = (pathname: string, wide: boolean) => (wide && /^\/ordo(?:\/(?!lab)[\w-]+)?\/?$/.test(pathname) ? '/ordo' : pathname);

export function AppShell() {
  const { layout } = useLayout();
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const setShortcutsOpen = useUI((s) => s.setShortcutsOpen);
  const immersive = isImmersive(pathname, layout === 'wide');
  // The mini player shows everywhere except where the full player is on screen.
  const showMini = !immersive && !pathname.startsWith('/sonus/play/') && !pathname.startsWith('/sonus/station/') && !pathname.startsWith('/visio/watch/');
  const { language } = useApp();
  const fullMotion = useFullMotion();

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
    ...Object.fromEntries(SECTIONS.slice(0, 10).map((s, i) => [`alt+${sectionKey(i)}`, () => navigate(s.path)])),
    '?': () => setShortcutsOpen(true),
  });

  if (immersive) {
    return (
      <>
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
        <ShortcutsDialog />
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
      {layout === 'wide' ? <DesktopShell>{content}</DesktopShell> : <TouchShell>{content}</TouchShell>}
      {showMini && <MiniPlayer />}
      <ShortcutsDialog />
    </>
  );
}
