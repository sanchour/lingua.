import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { animate, useMotionValue } from 'motion/react';
import type { MotionValue } from 'motion/react';

export const PAGE_SPRING = { type: 'spring', stiffness: 320, damping: 36, mass: 0.9 } as const;
/** Two-page spread from this viewport width. */
const SPREAD_MIN_WIDTH = 940;

interface Geometry {
  width: number;
  height: number;
  gap: number;
  step: number;
  spread: boolean;
}

export interface Pager {
  x: MotionValue<number>;
  page: number;
  pageCount: number;
  spread: boolean;
  goTo: (page: number, options?: { animate?: boolean }) => void;
  /** Page number that contains an element. */
  pageOf: (el: Element) => number;
  /** Elements of the given selector that sit on a page. */
  onPage: (page: number, selector: string) => HTMLElement[];
  /** Live finger tracking for swipes: offset in px from the current page (null = release & settle). */
  drag: (dx: number | null, velocity?: number) => void;
  geometry: () => Geometry | null;
}

interface PagerOptions {
  enabled: boolean;
  viewportRef: RefObject<HTMLDivElement | null>;
  flowRef: RefObject<HTMLDivElement | null>;
  /** Anything that changes layout (chapter, font, size…); a change triggers relayout. */
  layoutKey: string;
  /** Page to show after the next layout (e.g. last page when going back a chapter). */
  initialPage: 'first' | 'last' | number;
  onBoundary: (direction: 'next' | 'prev') => void;
  onPageChange?: (page: number, previous: number) => void;
}

/**
 * Paginates a chapter with CSS columns. The flow is one long row of columns moved with a transform,
 * so turning a page is a GPU-composited spring and never re-lays out text.
 */
export function usePager({ enabled, viewportRef, flowRef, layoutKey, initialPage, onBoundary, onPageChange }: PagerOptions): Pager {
  const x = useMotionValue(0);
  const geo = useRef<Geometry | null>(null);
  const pageRef = useRef(0);
  const pageCountRef = useRef(1);
  const anchorRef = useRef<number | null>(null); // block index at the top of the current page
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [spread, setSpread] = useState(false);
  const callbacks = useRef({ onBoundary, onPageChange });
  useEffect(() => {
    callbacks.current = { onBoundary, onPageChange };
  });

  const pageOf = useCallback((el: Element) => {
    const flow = flowRef.current;
    const g = geo.current;
    if (!flow || !g) return 0;
    const offset = el.getBoundingClientRect().left - flow.getBoundingClientRect().left;
    return Math.max(0, Math.floor((offset + 2) / g.step));
  }, [flowRef]);

  const firstBlockOnPage = useCallback((p: number): number | null => {
    const flow = flowRef.current;
    const g = geo.current;
    if (!flow || !g) return null;
    const flowLeft = flow.getBoundingClientRect().left;
    const pageStart = p * g.step;
    for (const el of flow.querySelectorAll<HTMLElement>('[data-b]')) {
      const r = el.getBoundingClientRect();
      if (r.right - flowLeft > pageStart + 1) return Number(el.dataset.b);
    }
    return null;
  }, [flowRef]);

  const settle = useCallback(
    (p: number, animated: boolean) => {
      const g = geo.current;
      if (!g) return;
      const target = -p * g.step;
      if (animated) animate(x, target, PAGE_SPRING);
      else x.set(target);
    },
    [x],
  );

  const goTo = useCallback(
    (target: number, options: { animate?: boolean } = {}) => {
      const g = geo.current;
      if (!g) return;
      if (target < 0) {
        settle(pageRef.current, true);
        callbacks.current.onBoundary('prev');
        return;
      }
      if (target >= pageCountRef.current) {
        settle(pageRef.current, true);
        callbacks.current.onBoundary('next');
        return;
      }
      const previous = pageRef.current;
      pageRef.current = target;
      setPage(target);
      settle(target, options.animate ?? true);
      anchorRef.current = firstBlockOnPage(target);
      if (previous !== target) callbacks.current.onPageChange?.(target, previous);
    },
    [settle, firstBlockOnPage],
  );

  const layout = useCallback(
    (placement: 'first' | 'last' | number | 'anchor') => {
      const viewport = viewportRef.current;
      const flow = flowRef.current;
      if (!enabled || !viewport || !flow) return;
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      const isSpread = width >= SPREAD_MIN_WIDTH;
      const gap = isSpread ? 72 : 48;
      const colWidth = isSpread ? (width - gap) / 2 : width;
      flow.style.columnWidth = `${colWidth}px`;
      flow.style.columnGap = `${gap}px`;
      flow.style.setProperty('--page-h', `${height}px`);
      geo.current = { width, height, gap, step: width + gap, spread: isSpread };
      const count = Math.max(1, Math.ceil((flow.scrollWidth + gap - 2) / (width + gap)));
      pageCountRef.current = count;
      setPageCount(count);
      setSpread(isSpread);

      let target: number;
      if (placement === 'first') target = 0;
      else if (placement === 'last') target = count - 1;
      else if (placement === 'anchor') {
        const anchor = anchorRef.current;
        const el = anchor !== null ? flow.querySelector(`[data-b="${anchor}"]`) : null;
        target = el ? pageOf(el) : pageRef.current;
      } else {
        const el = flow.querySelector(`[data-b="${placement}"]`);
        target = el ? pageOf(el) : 0;
      }
      target = Math.min(Math.max(0, target), count - 1);
      pageRef.current = target;
      setPage(target);
      settle(target, false);
      anchorRef.current = firstBlockOnPage(target);
    },
    [enabled, viewportRef, flowRef, pageOf, settle, firstBlockOnPage],
  );

  // New chapter or typography: lay out synchronously before paint. `initialPage` is read once per
  // layoutKey (a typography change keeps the reader on the same paragraph instead).
  const initialRef = useRef(initialPage);
  initialRef.current = initialPage;
  const lastKey = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!enabled) return;
    const chapterChanged = lastKey.current?.split('|')[0] !== layoutKey.split('|')[0];
    lastKey.current = layoutKey;
    layout(chapterChanged ? initialRef.current : 'anchor');
  }, [enabled, layoutKey, layout]);

  // Window size changes and late-loading fonts keep the reader on the same paragraph.
  useEffect(() => {
    if (!enabled) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    let frame = 0;
    const relayout = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => layout('anchor'));
    };
    const ro = new ResizeObserver(relayout);
    ro.observe(viewport);
    document.fonts?.addEventListener('loadingdone', relayout);
    void document.fonts?.ready.then(relayout);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      document.fonts?.removeEventListener('loadingdone', relayout);
    };
  }, [enabled, viewportRef, layout]);

  const drag = useCallback(
    (dx: number | null, velocity = 0) => {
      const g = geo.current;
      if (!g) return;
      const base = -pageRef.current * g.step;
      if (dx !== null) {
        x.set(base + dx);
        return;
      }
      const offset = x.get() - base;
      const threshold = g.width * 0.16;
      if (offset < -threshold || velocity < -0.45) goTo(pageRef.current + 1);
      else if (offset > threshold || velocity > 0.45) goTo(pageRef.current - 1);
      else settle(pageRef.current, true);
    },
    [x, goTo, settle],
  );

  const onPage = useCallback(
    (p: number, selector: string) => {
      const flow = flowRef.current;
      if (!flow) return [];
      return [...flow.querySelectorAll<HTMLElement>(selector)].filter((el) => pageOf(el) === p);
    },
    [flowRef, pageOf],
  );

  return { x, page, pageCount, spread, goTo, pageOf, onPage, drag, geometry: () => geo.current };
}
