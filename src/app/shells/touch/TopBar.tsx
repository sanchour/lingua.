import { useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { HEADER_SECTIONS } from '@/app/sections';
import { IconButton } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { useUI } from '@/state/ui';
import { LanguageChip } from '../LanguageChip';
import { LogoMark } from '../Wordmark';

const BACK_TO: Record<string, string> = {
  'sonus/podcast': '/sonus?tab=podcasts',
  'codex/diarium': '/codex?tab=diarium',
  'thesaurus/ready': '/thesaurus?tab=discover',
  'ordo/lab': '/ordo/about',
  'cantus/spotify': '/sonus',
  'sonus/song': '/sonus',
};

export function TopBar() {
  const title = useUI((s) => s.pageTitle);
  const titleHidden = useUI((s) => s.pageTitleHidden);
  const setTopBarHeight = useUI((s) => s.setTopBarHeight);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const ref = useRef<HTMLElement>(null);

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
  const parent = segments.length > 1 ? (songPage ?? BACK_TO[`${segments[0]}/${segments[1]}`] ?? `/${segments[0]}`) : null;

  return (
    <header ref={ref} className="no-callout sticky top-0 z-30 pt-safe">
      <div
        className={cx(
          'absolute inset-0 border-b bg-bg/85 backdrop-blur-xl transition-colors duration-200',
          titleHidden ? 'border-line' : 'border-transparent',
        )}
        aria-hidden
      />
      <div className="relative flex h-12 items-center gap-1 px-2" style={{ paddingLeft: 'max(8px, env(safe-area-inset-left))', paddingRight: 'max(8px, env(safe-area-inset-right))' }}>
        {parent ? (
          <IconButton icon={ChevronLeft} label="Back" showTooltip={false} onClick={() => navigate(parent)} />
        ) : (
          <>
            <span className="px-2">
              <LogoMark size={26} />
            </span>
            <LanguageChip compact placement="bottom-start" />
          </>
        )}

        <motion.div
          className="pointer-events-none absolute left-1/2 max-w-[46%] -translate-x-1/2 truncate font-serif text-[17px] font-semibold"
          initial={false}
          animate={{ opacity: titleHidden ? 1 : 0, y: titleHidden ? 0 : 6 }}
          transition={spring.snappy}
          aria-hidden={!titleHidden}
        >
          {title}
        </motion.div>

        <nav aria-label="More sections" className="ml-auto flex items-center gap-0.5">
          {HEADER_SECTIONS.map(({ id, path, name, role, icon: Icon }) => (
            <NavLink
              key={id}
              to={path}
              aria-label={`${name} · ${role}`}
              className={({ isActive }) =>
                cx(
                  'grid size-10 place-items-center rounded-xl transition-[transform,background-color,color] duration-150 active:scale-[0.92]',
                  isActive ? 'bg-accent-soft text-accent-text' : 'text-ink-soft',
                )
              }
            >
              <Icon size={21} aria-hidden />
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
