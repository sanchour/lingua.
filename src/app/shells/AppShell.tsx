import { Suspense, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { SECTIONS } from '@/app/sections';
import { ShortcutsDialog } from '@/app/ShortcutsDialog';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { useLayout } from '@/design/hooks/useLayout';
import { pageEnter } from '@/design/motion';
import { useUI } from '@/state/ui';
import { DesktopShell } from './desktop/DesktopShell';
import { TouchShell } from './touch/TouchShell';

/** Routes that take the whole screen (no sidebar, no tab bar). */
const isImmersive = (pathname: string) => pathname.startsWith('/codex/read/') || pathname.startsWith('/thesaurus/study/');

export function AppShell() {
  const { layout } = useLayout();
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const setShortcutsOpen = useUI((s) => s.setShortcutsOpen);
  const immersive = isImmersive(pathname);

  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
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
      <motion.div key={pathname} {...pageEnter}>
        <Outlet />
      </motion.div>
    </Suspense>
  );

  return (
    <>
      {layout === 'wide' ? <DesktopShell>{content}</DesktopShell> : <TouchShell>{content}</TouchShell>}
      <ShortcutsDialog />
    </>
  );
}
