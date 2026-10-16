import { useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react';

// Shared behaviour for drawers, sheets and dialogs: scroll lock, Escape (topmost only), focus handling.

let lockCount = 0;
const stack: Array<{ close: () => void }> = [];

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function onKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || stack.length === 0) return;
  event.preventDefault();
  stack[stack.length - 1].close();
}

export function useOverlay(containerRef: RefObject<HTMLElement | null>, onClose: () => void): void {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const entry = { close: () => closeRef.current() };
    stack.push(entry);
    if (stack.length === 1) window.addEventListener('keydown', onKeyDown);
    if (lockCount++ === 0) document.documentElement.style.overflow = 'hidden';

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;
      const first = container.querySelector<HTMLElement>('[data-autofocus]') ?? container;
      first.focus({ preventScroll: true });
    });

    return () => {
      cancelAnimationFrame(frame);
      stack.splice(stack.indexOf(entry), 1);
      if (stack.length === 0) window.removeEventListener('keydown', onKeyDown);
      if (--lockCount === 0) document.documentElement.style.overflow = '';
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [containerRef]);
}

/** Keeps Tab focus inside an open overlay. */
export function trapTab(event: ReactKeyboardEvent<HTMLElement>): void {
  if (event.key !== 'Tab') return;
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE));
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
