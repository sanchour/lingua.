import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight, PanelLeftClose, PanelLeftOpen, Shapes } from 'lucide-react';
import { BOTTOM_SECTIONS, PRIMARY_SECTIONS, SECTIONS, sectionKey, TOOL_SECTIONS } from '@/app/sections';
import type { Section } from '@/app/sections';
import { IconButton, Tooltip } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { useApp } from '@/app/context';
import { planOf } from '@/data/plan';
import { PlanBadge } from '@/features/plans/PlanMarks';
import { LanguageChip } from '../LanguageChip';
import { LogoMark } from '../Wordmark';

export const SIDEBAR_WIDTH = { expanded: 216, collapsed: 64 } as const;

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { settings } = useApp();
  const { pathname } = useLocation();
  const plan = planOf(settings.meta);
  const inTool = TOOL_SECTIONS.some((s) => pathname === s.path || pathname.startsWith(`${s.path}/`));
  const [toolsOpen, setToolsOpen] = useState(true);

  useEffect(() => {
    if (inTool) setToolsOpen(true);
  }, [inTool]);

  return (
    // Only the (contained, fixed) sidebar reflows while it resizes; the page content moves with a transform.
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded }}
      transition={spring.soft}
      className="no-callout fixed inset-y-0 left-0 z-30 flex flex-col overflow-hidden border-r border-line bg-surface px-3 pt-4 pb-3 [contain:layout_paint]"
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
          <PlanBadge plan={plan} />
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
        {PRIMARY_SECTIONS.map((section) => (
          <SidebarLink key={section.id} section={section} collapsed={collapsed} index={sectionKey(SECTIONS.indexOf(section))} />
        ))}

        <div className="mt-1.5 pt-1.5 border-t border-line/60">
          <Tooltip label={toolsOpen ? 'Hide tools' : 'Show tools'} placement="right" disabled={!collapsed}>
            <button
              type="button"
              aria-expanded={toolsOpen}
              onClick={() => setToolsOpen((o) => !o)}
              className={cx(
                'group relative flex h-9 w-full shrink-0 items-center gap-3 rounded-xl px-2.5 text-left transition-colors duration-150',
                inTool && !toolsOpen ? 'text-accent-text' : 'text-ink-soft hover:bg-raised/70 hover:text-ink',
              )}
            >
              <Shapes size={18} strokeWidth={1.9} className="relative shrink-0" aria-hidden />
              <motion.span
                className="relative flex min-w-0 flex-1 items-center justify-between text-[14px] font-semibold tracking-wide whitespace-nowrap"
                animate={{ opacity: collapsed ? 0 : 1 }}
                transition={{ duration: 0.12 }}
              >
                <span>Tools</span>
                <ChevronRight
                  size={15}
                  className={cx('text-ink-faint transition-transform duration-200 group-hover:text-ink', toolsOpen && 'rotate-90')}
                  aria-hidden
                />
              </motion.span>
            </button>
          </Tooltip>

          <AnimatePresence initial={false}>
            {toolsOpen && (
              <motion.div
                key="tools-list"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={spring.snappy}
                className="overflow-hidden"
              >
                <div className={cx('mt-0.5 flex flex-col gap-0.5', !collapsed && 'pl-1.5')}>
                  {TOOL_SECTIONS.map((section) => (
                    <SidebarLink key={section.id} section={section} collapsed={collapsed} index={sectionKey(SECTIONS.indexOf(section))} compact />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      <nav aria-label="Statistics and settings" className="mt-2 flex shrink-0 flex-col gap-0.5 border-t border-line pt-2">
        {BOTTOM_SECTIONS.map((section) => (
          <SidebarLink key={section.id} section={section} collapsed={collapsed} index={sectionKey(SECTIONS.indexOf(section))} />
        ))}
      </nav>
    </motion.aside>
  );
}

function SidebarLink({ section, collapsed, index, compact = false }: { section: Section; collapsed: boolean; index: number; compact?: boolean }) {
  const Icon = section.icon;
  return (
    <Tooltip label={section.name} shortcut={index ? `Alt ${index}` : undefined} placement="right" disabled={!collapsed}>
      <NavLink
        to={section.path}
        end={section.path === '/'}
        className={({ isActive }) =>
          cx(
            'group relative flex shrink-0 items-center gap-3 rounded-xl px-2.5 transition-colors duration-150',
            compact ? 'h-9' : 'h-10',
            isActive ? 'text-ink' : 'text-ink-soft hover:bg-raised/70 hover:text-ink',
          )
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <motion.span layoutId="sidebar-active" className="absolute inset-0 rounded-xl bg-raised shadow-elev-1" transition={spring.snappy} />
            )}
            <Icon
              size={compact ? 18 : 20}
              strokeWidth={isActive ? 2.2 : 1.9}
              className={cx('relative shrink-0', isActive && (section.tint ? 'text-[var(--cantus-text)]' : 'text-accent-text'))}
              aria-hidden
            />
            <motion.span
              className={cx('relative min-w-0 flex-1 font-semibold whitespace-nowrap', compact ? 'text-[14px]' : 'text-[15px]')}
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
