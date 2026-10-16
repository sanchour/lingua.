import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { createPortal } from 'react-dom';
import type { WordEngine } from './engine';
import { wordAt as findWord } from './hit';

const STATE_LABEL = ['', 'Known', 'Learning'] as const;

interface HoverGlossProps {
  rootRef: RefObject<HTMLElement | null>;
  engine: WordEngine | null;
  /** Currently hovered word (for keyboard shortcuts). */
  hoveredRef: RefObject<HTMLElement | null>;
}

/** How long the pointer may sit between words (spaces, line gaps) before the tooltip goes. */
const GRACE_MS = 120;
/** A word missing from the offline dictionary is looked up online once the mouse rests this long. */
const FETCH_DELAY_MS = 70;

/**
 * Desktop hover translation. One always-mounted element, positioned with a transform and filled
 * with textContent, so showing a gloss costs no React render: it appears on the next frame.
 *
 * The rule is strict: whenever the mouse is over a word, the tooltip shows that word. It is driven
 * by pointer position (not enter/leave pairs, which can be missed), it never catches the pointer
 * itself (so it can't hide the words beneath it), and it re-checks what's under the mouse after
 * scrolling, page changes and re-renders.
 */
export function HoverGloss({ rootRef, engine, hoveredRef }: HoverGlossProps) {
  const tipRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const stateRef = useRef<HTMLSpanElement>(null);
  const engineRef = useRef(engine);
  const syncRef = useRef<() => void>(() => {});

  // A new engine (new chapter, re-attached spans) keeps the hover: re-read the word under the mouse.
  useEffect(() => {
    engineRef.current = engine;
    syncRef.current();
  }, [engine]);

  useEffect(() => {
    const tip = tipRef.current;
    const label = textRef.current;
    const badge = stateRef.current;
    if (!tip || !label || !badge) return;
    // The text element is replaced on every chapter change, so it is looked up on each use.
    const inText = (el: HTMLElement | null | undefined): HTMLElement | null => (el && rootRef.current?.contains(el) ? el : null);
    let current: HTMLElement | null = null;
    let hideTimer = 0;
    let fetchTimer = 0;
    let frame = 0;
    // Last mouse position in client coordinates (-1 = outside the window or not a mouse).
    let x = -1;
    let y = -1;

    const place = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      const w = tip.offsetWidth;
      const h = tip.offsetHeight;
      const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8);
      const above = r.top - h - 8;
      const top = above >= 8 ? above : r.bottom + 8;
      tip.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
    };

    const show = (el: HTMLElement) => {
      const engine = engineRef.current;
      if (!engine) return;
      window.clearTimeout(fetchTimer);
      current = el;
      hoveredRef.current = el;
      const norm = el.dataset.n!;
      const gloss = engine.gloss(norm);
      label.textContent = gloss?.text ?? '…';
      // The word's state, so a click visibly lands: nothing for Unseen, Learning or Known.
      const state = engine.state(norm);
      badge.textContent = STATE_LABEL[state];
      badge.dataset.s = String(state);
      tip.dataset.pending = gloss ? '0' : '1';
      place(el);
      tip.dataset.visible = '1';
      if (!gloss) {
        // Short delay so sweeping the mouse across a line doesn't fire requests.
        fetchTimer = window.setTimeout(async () => {
          const found = await engine.ensureGloss(norm, el.textContent ?? norm);
          if (current !== el) return;
          label.textContent = found?.text ?? 'No translation found';
          tip.dataset.pending = '0';
          place(el);
        }, FETCH_DELAY_MS);
      }
    };

    const hide = () => {
      window.clearTimeout(fetchTimer);
      current = null;
      hoveredRef.current = null;
      tip.dataset.visible = '0';
    };

    const cancelHide = () => {
      window.clearTimeout(hideTimer);
      hideTimer = 0;
    };

    const wordAt = (): HTMLElement | null => {
      if (x < 0) return null;
      return inText(findWord(document.elementFromPoint(x, y), x, y, rootRef.current));
    };

    /** Shows whatever word is under the mouse right now, or hides. */
    const sync = () => {
      cancelHide();
      const el = wordAt();
      if (el) show(el);
      else hide();
    };
    syncRef.current = sync;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        x = -1;
        return;
      }
      x = e.clientX;
      y = e.clientY;
      const word = inText(findWord(e.target, x, y, rootRef.current));
      if (word) {
        cancelHide();
        if (word !== current) show(word);
      } else if (current && !hideTimer) {
        hideTimer = window.setTimeout(sync, GRACE_MS);
      }
    };
    const onLeaveWindow = (e: PointerEvent) => {
      if (e.relatedTarget) return;
      x = -1;
      cancelHide();
      hideTimer = window.setTimeout(sync, GRACE_MS);
    };
    // Content moved under a still mouse (scrolling, a word repainted, the page re-rendered).
    const resync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(sync);
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerover', onMove, { passive: true });
    document.addEventListener('pointerout', onLeaveWindow, { passive: true });
    document.addEventListener('reader:hide-tip', hide);
    document.addEventListener('reader:refresh-tip', resync);
    window.addEventListener('scroll', resync, { passive: true });
    return () => {
      hide();
      cancelHide();
      cancelAnimationFrame(frame);
      syncRef.current = () => {};
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerover', onMove);
      document.removeEventListener('pointerout', onLeaveWindow);
      document.removeEventListener('reader:hide-tip', hide);
      document.removeEventListener('reader:refresh-tip', resync);
      window.removeEventListener('scroll', resync);
    };
  }, [rootRef, hoveredRef]);

  return createPortal(
    <div ref={tipRef} className="reader-tip" role="tooltip" data-visible="0">
      <span ref={textRef} className="reader-tip-text" />
      <span ref={stateRef} className="reader-tip-state" />
    </div>,
    document.body,
  );
}
