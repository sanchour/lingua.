import { useCallback, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react';

interface Options {
  /** Hold duration before a long-press fires. */
  ms?: number;
  /** Movement (px) that cancels the press, so scrolling never triggers it. */
  slop?: number;
  onTap?: () => void;
}

/**
 * Long-press for touch and mouse. Pair the target with the `no-callout` utility so iOS
 * shows neither its callout menu nor a text selection.
 */
export function useLongPress(onLongPress: () => void, { ms = 450, slop = 10, onTap }: Options = {}) {
  const timer = useRef<number | undefined>(undefined);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const clear = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    start.current = null;
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (e.button !== 0) return;
      fired.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      timer.current = window.setTimeout(() => {
        fired.current = true;
        start.current = null;
        onLongPress();
      }, ms);
    },
    [ms, onLongPress],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!start.current) return;
      if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > slop) clear();
    },
    [clear, slop],
  );

  const onPointerUp = useCallback(() => {
    const wasPressing = start.current !== null;
    clear();
    if (wasPressing && !fired.current) onTap?.();
  }, [clear, onTap]);

  const onContextMenu = useCallback((e: ReactMouseEvent) => e.preventDefault(), []);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: clear, onPointerLeave: clear, onContextMenu };
}
