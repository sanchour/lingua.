import { NavLink } from 'react-router';
import { motion } from 'motion/react';
import { TAB_SECTIONS } from '@/app/sections';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';

/** Floating bottom tab bar for the core sections. */
export function TabBar() {
  return (
    <nav
      aria-label="Sections"
      className="no-callout fixed inset-x-0 z-40 flex justify-center px-3"
      style={{ bottom: 'max(10px, calc(env(safe-area-inset-bottom) - 10px))' }}
    >
      <div className="flex w-full max-w-md items-stretch gap-1 rounded-[26px] border border-line/70 bg-raised/85 p-1.5 shadow-elev-2 backdrop-blur-xl">
        {TAB_SECTIONS.map(({ id, path, name, icon: Icon, tint }) => (
          <NavLink
            key={id}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              cx(
                'relative flex h-[54px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] transition-[transform,color] duration-150 active:scale-[0.93]',
                isActive ? (tint ? 'text-[var(--cantus-text)]' : 'text-accent-text') : 'text-ink-faint',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="tab-active" className={cx('absolute inset-0 rounded-[20px]', tint ? 'bg-[var(--cantus-soft)]' : 'bg-accent-soft')} transition={spring.snappy} />}
                <Icon size={22} strokeWidth={isActive ? 2.2 : 1.9} className="relative" aria-hidden />
                <span className="relative max-w-full truncate text-[10.5px] font-bold tracking-wide">{name}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
