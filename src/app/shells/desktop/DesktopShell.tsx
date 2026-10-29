import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { useApp } from '@/app/context';
import { patchSetting } from '@/data/settings';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { spring } from '@/design/motion';
import { Sidebar, SIDEBAR_WIDTH } from './Sidebar';

export function DesktopShell({ children }: { children: ReactNode }) {
  const { settings } = useApp();
  // Local state answers the click instantly; the preference is saved in the background.
  const [collapsed, setCollapsed] = useState(settings.ui.sidebarCollapsed);
  useEffect(() => {
    if (collapsed !== settings.ui.sidebarCollapsed) void patchSetting('ui', { sidebarCollapsed: collapsed });
  }, [collapsed, settings.ui.sidebarCollapsed]);

  // Fixed bars that centre themselves beside the sidebar read its width from --sidebar-w.
  const width = collapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded;
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--sidebar-w', `${width}px`);
    return () => void root.style.removeProperty('--sidebar-w');
  }, [width]);

  const toggle = () => setCollapsed((c) => !c);
  useHotkeys({ '[': toggle });

  return (
    <div className="min-h-dvh">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <motion.main
        id="main-content"
        tabIndex={-1}
        layout="position"
        layoutDependency={collapsed}
        transition={spring.soft}
        style={{ marginLeft: width }}
        className="min-h-dvh outline-none"
      >
        <div className="mx-auto w-full max-w-6xl px-10 pt-6 pb-8">{children}</div>
      </motion.main>
    </div>
  );
}
