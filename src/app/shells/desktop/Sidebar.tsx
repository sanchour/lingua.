import { NavLink } from 'react-router';
import { motion } from 'motion/react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { sectionKey, SECTIONS } from '@/app/sections';
import type { Section } from '@/app/sections';
import { IconButton, Tooltip } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { useApp } from '@/app/context';
import { hasPlus } from '@/data/plus';
import { LanguageChip } from '../LanguageChip';
import { LogoMark } from '../Wordmark';

export const SIDEBAR_WIDTH = { expanded: 248, collapsed: 76 } as const;

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { settings } = useApp();
  const plus = hasPlus(settings.meta);
  const main = SECTIONS.filter((s) => s.placement === 'tab');
  // Ratio and Ordo (your numbers and your settings) sit at the bottom, apart from the rooms.
  const bottom = SECTIONS.filter((s) => s.id === 'ratio' || s.id === 'ordo');
  const extra = SECTIONS.filter((s) => s.placement !== 'tab' && !bottom.includes(s));

  return (
    // Only the (contained, fixed) sidebar reflows while it resizes; the page content moves with a transform.
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded }}
      transition={spring.soft}
      className="no-callout fixed inset-y-0 left-0 z-30 flex flex-col overflow-hidden border-r border-line bg-surface px-3.5 pt-4 pb-3 [contain:layout_paint]"
    >
      <div className={cx('flex items-center', collapsed ? 'flex-col gap-3' : 'gap-2 pr-0.5 pl-1')}>
        <LogoMark size={30} className="shrink-0" />
        <motion.span
          className="flex-1 font-serif text-[22px] font-semibold tracking-tight whitespace-nowrap"
          animate={{ opacity: collapsed ? 0 : 1 }}
          transition={{ duration: 0.12 }}
          hidden={collapsed}
        >
          Lingua
          {plus && <sup className="ml-0.5 text-[17px] font-medium text-accent-text" aria-label="Plus">+</sup>}
        </motion.span>
        <IconButton
          icon={collapsed ? PanelLeftOpen : PanelLeftClose}
          label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          shortcut="["
          size="sm"
          tooltipPlacement="right"
          onClick={onToggle}
        />
      </div>

      <div className="mt-3.5">
        <LanguageChip compact={collapsed} />
      </div>

      <nav aria-label="Sections" className="mt-3 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain [scrollbar-width:none]">
        {main.map((section) => (
          <SidebarLink key={section.id} section={section} collapsed={collapsed} index={sectionKey(SECTIONS.indexOf(section))} />
        ))}
        <div className="mx-2 my-2 h-px shrink-0 bg-line" />
        {extra.map((section) => (
          <SidebarLink key={section.id} section={section} collapsed={collapsed} index={sectionKey(SECTIONS.indexOf(section))} />
        ))}
      </nav>

      <nav aria-label="Statistics and settings" className="mt-2 flex shrink-0 flex-col gap-0.5 border-t border-line pt-2">
        {bottom.map((section) => (
          <SidebarLink key={section.id} section={section} collapsed={collapsed} index={sectionKey(SECTIONS.indexOf(section))} />
        ))}
      </nav>
    </motion.aside>
  );
}

function SidebarLink({ section, collapsed, index }: { section: Section; collapsed: boolean; index: number }) {
  const Icon = section.icon;
  return (
    <Tooltip label={section.name} shortcut={`Alt ${index}`} placement="right" disabled={!collapsed}>
      <NavLink
        to={section.path}
        end={section.path === '/'}
        className={({ isActive }) =>
          cx(
            'group relative flex h-10 shrink-0 items-center gap-3 rounded-xl px-3 transition-colors duration-150',
            isActive ? 'text-ink' : 'text-ink-soft hover:bg-raised/70 hover:text-ink',
          )
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <motion.span layoutId="sidebar-active" className="absolute inset-0 rounded-xl bg-raised shadow-elev-1" transition={spring.snappy} />
            )}
            <Icon size={20} strokeWidth={isActive ? 2.2 : 1.9} className={cx('relative shrink-0', isActive && (section.tint ? 'text-[var(--cantus-text)]' : 'text-accent-text'))} aria-hidden />
            <motion.span
              className="relative min-w-0 flex-1 text-[15px] font-semibold whitespace-nowrap"
              animate={{ opacity: collapsed ? 0 : 1 }}
              transition={{ duration: 0.12 }}
            >
              {section.name}
            </motion.span>
          </>
        )}
      </NavLink>
    </Tooltip>
  );
}
