import { Suspense, useEffect, useLayoutEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { useApp } from '@/app/context';
import { useFullMotion } from '@/app/motion';
import { SECTIONS } from '@/app/sections';
import { ShortcutsDialog } from '@/app/ShortcutsDialog';
import { MiniPlayer } from '@/features/sonus/MiniPlayer';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { useLayout } from '@/design/hooks/useLayout';
import { pageEnter, pageEnterFull } from '@/design/motion';
import { useUI } from '@/state/ui';
import { DesktopShell } from './desktop/DesktopShell';
import { TouchShell } from './touch/TouchShell';

/** Routes that take the whole screen (no sidebar, no tab bar). On phones the Sonus player does too. */
const isImmersive = (pathname: string, wide: boolean) =>
  pathname.startsWith('/codex/read/') || pathname.startsWith('/thesaurus/study/') || pathname === '/sonus/commute' || (!wide && pathname.startsWith('/sonus/play/'));

export function AppShell() {
  const { layout } = useLayout();
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const setShortcutsOpen = useUI((s) => s.setShortcutsOpen);
  const immersive = isImmersive(pathname, layout === 'wide');
  // The mini player shows everywhere except where the full player is on screen.
  const showMini = !immersive && !pathname.startsWith('/sonus/play/');
  const { language } = useApp();
  const fullMotion = useFullMotion();

  // Lets a language switch know when the new language is on screen (see app/languageSwitch.ts).
  useLayoutEffect(() => {
    document.documentElement.dataset.studying = language.id;
  }, [language.id]);

  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, hash]);

  useHotkeys({
    ...Object.fromEntries(SECTIONS.map((s, i) => [`alt+${i + 1}`, () => navigate(s.path)])),
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
      <motion.div key={pathname} {...(fullMotion ? pageEnterFull : pageEnter)}>
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
