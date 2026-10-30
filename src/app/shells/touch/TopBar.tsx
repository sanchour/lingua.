import { UiText, useUi } from '@/design/i18n/UiText';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HEADER_SECTIONS, PRIMARY_SECTIONS, SECTIONS, TOOL_SECTIONS } from '@/app/sections';
import { IconButton } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { useUI } from '@/state/ui';
import { LanguageChip } from '../LanguageChip';
import { LogoMark } from '../Wordmark';

const BACK_TO: Record<string, string> = {
  'sonus/podcast': '/sonus?tab=podcasts',
  'sonus/book': '/sonus?tab=books',
  'mentis/diarium': '/mentis/diarium',
  'thesaurus/ready': '/thesaurus?tab=discover',
  'settings/lab': '/settings/developer',
  'cantus/spotify': '/sonus',
  'sonus/song': '/sonus',
};

export function TopBar() {
  const translateUi = useUi();
  const title = useUI((s) => s.pageTitle);
  const titleHidden = useUI((s) => s.pageTitleHidden);
  const setTopBarHeight = useUI((s) => s.setTopBarHeight);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const ref = useRef<HTMLElement>(null);
  const inTool = TOOL_SECTIONS.some((s) => pathname === s.path || pathname.startsWith(`${s.path}/`));
  const [toolsOpen, setToolsOpen] = useState(false);

  useEffect(() => {
    setToolsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setTopBarHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [setTopBarHeight]);

  const segments = pathname.split('/').filter(Boolean);
  // Sub-pages go back to their section (e.g. /codex/book/:id → /codex), or to the tab they came from.
  // A song's games go back to the song.
  const songPage = segments[0] === 'sonus' && segments[1] === 'song' && segments.length > 3 ? `/${segments.slice(0, 3).join('/')}` : null;
  // A room opened from Home (not in the tab bar or the header) goes back there.
  const fromHome = SECTIONS.some((s) => s.placement === 'side' && s.path === pathname);
  const parent = segments.length > 1 ? (songPage ?? BACK_TO[`${segments[0]}/${segments[1]}`] ?? `/${segments[0]}`) : fromHome ? '/' : null;

  return (
    <header ref={ref} className="no-callout sticky top-0 z-30 pt-safe">
      <div
        className={cx(
          'absolute inset-0 border-b bg-bg/90 backdrop-blur-xl transition-colors duration-200',
          titleHidden || toolsOpen ? 'border-line' : 'border-line/50',
        )}
        aria-hidden
      />
      <div
        className="relative flex h-12 items-center gap-1.5 px-2"
        style={{ paddingLeft: 'max(10px, env(safe-area-inset-left))', paddingRight: 'max(10px, env(safe-area-inset-right))' }}
      >
        {parent ? (
          <IconButton icon={ChevronLeft} label={translateUi('Back')} showTooltip={false} onClick={() => navigate(parent)} />
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="pl-1">
              <LogoMark size={25} />
            </span>
            <span className="font-serif text-[19px] font-semibold tracking-tight"><UiText source={'Lingua'} /></span>
            <LanguageChip compact placement="bottom-start" />
          </div>
        )}

        <motion.div
          className="pointer-events-none min-w-0 flex-1 truncate px-1 text-center font-serif text-[17px] font-semibold"
          initial={false}
          animate={{ opacity: titleHidden ? 1 : 0, y: titleHidden ? 0 : 6 }}
          transition={spring.snappy}
          aria-hidden={!titleHidden}
        >
          {title}
        </motion.div>

        <nav aria-label={translateUi('Statistics and settings')} className="ml-auto flex items-center gap-1">
          {HEADER_SECTIONS.map(({ id, path, name, role, icon: Icon }) => (
            <NavLink
              key={id}
              to={path}
              aria-label={`${name} · ${role}`}
              className={({ isActive }) =>
                cx(
                  'inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold transition-colors',
                  isActive ? 'bg-accent-soft text-accent-text' : 'text-ink-soft hover:bg-raised hover:text-ink',
                )
              }
            >
              <Icon size={16} aria-hidden />
              <span className="hidden min-[380px]:inline">{name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Horizontal navigation strip for narrow/touch viewports (Home, Cursus, Explora, Bibliotheca, Tools >) */}
      <div
        className="relative flex items-center gap-1 overflow-x-auto border-t border-line/40 px-2 py-1.5 [scrollbar-width:none]"
        style={{ paddingLeft: 'max(10px, env(safe-area-inset-left))', paddingRight: 'max(10px, env(safe-area-inset-right))' }}
      >
        {PRIMARY_SECTIONS.map(({ id, path, name }) => (
          <NavLink
            key={id}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              cx(
                'shrink-0 rounded-lg px-2.5 py-1 font-serif text-[14px] font-semibold transition-colors',
                isActive ? 'bg-raised text-accent-text shadow-elev-1' : 'text-ink-soft hover:text-ink',
              )
            }
          >
            {name}
          </NavLink>
        ))}
        <button
          type="button"
          aria-expanded={toolsOpen}
          onClick={() => setToolsOpen((o) => !o)}
          className={cx(
            'ml-auto inline-flex shrink-0 items-center gap-0.5 rounded-lg px-2.5 py-1 font-serif text-[14px] font-semibold transition-colors',
            inTool || toolsOpen ? 'bg-raised text-accent-text shadow-elev-1' : 'text-ink-soft hover:text-ink',
          )}
        ><UiText source={'Tools{0}'} values={[<ChevronRight size={14} className={cx('transition-transform duration-150', toolsOpen && 'rotate-90')} aria-hidden />]} /></button>
      </div>

      <AnimatePresence initial={false}>
        {toolsOpen && (
          <motion.nav
            key="touch-tools"
            aria-label={translateUi('Tools')}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring.snappy}
            className="relative overflow-hidden border-t border-line/50 bg-surface/95 backdrop-blur-xl"
          >
            <div className="flex flex-wrap items-center gap-1.5 px-3 py-2">
              {TOOL_SECTIONS.map(({ id, path, name, icon: Icon }) => (
                <NavLink
                  key={id}
                  to={path}
                  className={({ isActive }) =>
                    cx(
                      'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[13.5px] font-semibold transition-colors',
                      isActive ? 'border-accent/40 bg-accent-soft text-accent-text' : 'border-line/70 bg-raised text-ink-soft hover:text-ink',
                    )
                  }
                >
                  <Icon size={15} aria-hidden />
                  {name}
                </NavLink>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
