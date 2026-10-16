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

  const toggle = () => setCollapsed((c) => !c);
  useHotkeys({ '[': toggle });

  return (
    <div className="min-h-dvh">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <motion.main
        layout="position"
        layoutDependency={collapsed}
        transition={spring.soft}
        style={{ marginLeft: collapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded }}
        className="min-h-dvh"
      >
        <div className="mx-auto w-full max-w-6xl px-10 pt-12 pb-20">{children}</div>
      </motion.main>
    </div>
  );
}
