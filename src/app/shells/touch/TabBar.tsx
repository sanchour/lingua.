import { useUi } from '@/design/i18n/UiText';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import { animate, motion, useMotionValue, useTransform, useVelocity } from 'motion/react';
import { TAB_SECTIONS } from '@/app/sections';
import { motionIsReduced } from '@/design/motionPref';
import { cx } from '@/lib/cx';

const PAD = 6;
/** Pointer travel before a press on the bar becomes a drag of the lens. */
const DRAG_START = 8;

/** The open section's tab, or -1 on a page that has none (Ordo, Ratio). */
const activeIndex = (pathname: string) =>
  TAB_SECTIONS.findIndex(({ path }) => (path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`)));

/**
 * The phone's tab bar as iOS 26 draws it: a floating glass capsule, and a glass lens that slides to
 * the open section on a spring, stretching as it moves. Drag along the bar and the lens follows the
 * finger, then settles on the nearest section. Reduced motion settles at once; reduced transparency
 * makes the glass solid (index.css).
 */
export function TabBar() {
  const translateUi = useUi();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const barRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  /** A finger is down on the bar: the lens swells under it, as in iOS 26. */
  const [pressed, setPressed] = useState(false);
  const index = activeIndex(pathname);
  const count = TAB_SECTIONS.length;
  const tab = width ? (width - PAD * 2) / count : 0;

  const x = useMotionValue(0);
  const velocity = useVelocity(x);
  // The lens stretches with its speed, like a drop of water pulled along, and slims a little.
  const scaleX = useTransform(velocity, [-2400, 0, 2400], [1.22, 1, 1.22], { clamp: true });
  const scaleY = useTransform(velocity, [-2400, 0, 2400], [0.9, 1, 0.9], { clamp: true });
  const drag = useRef<{ startX: number; startLens: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const suppressTimer = useRef(0);

  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const measure = () => setWidth(el.getBoundingClientRect().width);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The lens goes to the open section: on a spring, or at once with reduced motion.
  useEffect(() => {
    if (!tab || drag.current || index < 0) return;
    const target = PAD + index * tab;
    if (motionIsReduced() || x.get() === 0) {
      x.set(target);
      return;
    }
    const controls = animate(x, target, { type: 'spring', stiffness: 520, damping: 34, mass: 0.9 });
    return () => controls.stop();
  }, [index, tab, x]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // A tap always starts clean: a leftover from a drag must never swallow it (the two-tap bug).
    suppressClick.current = false;
    window.clearTimeout(suppressTimer.current);
    if (!tab || e.pointerType === 'mouse' || index < 0) return;
    setPressed(true);
    drag.current = { startX: e.clientX, startLens: x.get(), moved: false };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    if (!d.moved && Math.abs(dx) < DRAG_START) return;
    if (!d.moved) {
      d.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    x.set(Math.min(PAD + (count - 1) * tab, Math.max(PAD, d.startLens + dx)));
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    setPressed(false);
    if (!d?.moved) return;
    // The click that follows a drag is not a tap on the tab below. Browsers send none after a long
    // drag, so the flag clears itself rather than waiting for one.
    suppressClick.current = true;
    window.clearTimeout(suppressTimer.current);
    suppressTimer.current = window.setTimeout(() => (suppressClick.current = false), 350);
    const nearest = Math.round((x.get() - PAD) / tab);
    const target = PAD + nearest * tab;
    if (motionIsReduced()) x.set(target);
    else animate(x, target, { type: 'spring', stiffness: 520, damping: 34 });
    if (nearest !== index) navigate(TAB_SECTIONS[nearest].path);
    else if (index < 0) x.set(0);
  };

  return (
    <nav
      aria-label={translateUi('Sections')}
      className="no-callout fixed inset-x-0 z-40 flex justify-center px-3"
      style={{ bottom: 'max(10px, calc(env(safe-area-inset-bottom) - 10px))' }}
    >
      <div
        ref={barRef}
        className="glass-bar relative flex w-full max-w-md items-stretch rounded-full touch-pan-y"
        style={{ padding: PAD }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null;
          setPressed(false);
        }}
        onClickCapture={(e) => {
          // A drag ends where the finger lifts: that is not also a tap on the tab below it.
          if (suppressClick.current) {
            suppressClick.current = false;
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {tab > 0 && (
          <motion.span
            aria-hidden
            className={cx('glass-lens pointer-events-none absolute rounded-full', TAB_SECTIONS[index]?.tint && 'glass-lens-cantus')}
            animate={{ scale: pressed ? 1.12 : 1 }}
            transition={{ type: 'spring', stiffness: 520, damping: 30 }}
            style={{ x, scaleX, scaleY, width: tab, top: PAD, bottom: PAD, left: 0, opacity: index < 0 && !drag.current ? 0 : 1 }}
          />
        )}
        {TAB_SECTIONS.map(({ id, path, name, icon: Icon, tint }) => (
          <NavLink
            key={id}
            to={path}
            end={path === '/'}
            draggable={false}
            className={({ isActive }) =>
              cx(
                'relative flex h-[54px] flex-1 flex-col items-center justify-center gap-0.5 rounded-full transition-[transform,color] duration-150 active:scale-[0.94]',
                isActive ? (tint ? 'text-[var(--cantus-text)]' : 'text-accent-text') : 'text-ink-soft',
              )
            }
          >
            {({ isActive }) => (
              <>
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
