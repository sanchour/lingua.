import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import type { WordEngine } from './engine';
import { CLICK_SLOP_PX, wordAt } from './hit';
import { PhraseSelector } from './phrase';
import type { Phrase } from './PhraseBubble';

const LONG_PRESS_MS = 430;

export interface WordTap {
  /** The word tapped, or null for a tap beside the words. */
  word: HTMLElement | null;
  target: Element;
  type: string;
}

interface Options {
  /** A tap or click (a word, or beside the words). */
  onTap: (tap: WordTap) => void;
  /** Touch: a word held and lifted without sliding (its drawer, as in the reader). */
  onHold: (word: HTMLElement) => void;
  /** A finger came down on a word (Visio holds the picture still at once). */
  onPress?: (word: HTMLElement) => void;
  /** A phrase started being chosen (true), or its bubble closed (false). */
  onSelecting?: (on: boolean) => void;
  /** Presses that belong to something else (a toolbar inside the text). */
  ignore?: (target: Element) => boolean;
}

/**
 * The reader's gestures for text that isn't a book (lyrics, transcripts, subtitles): a click or tap
 * on a word, a long-press for its drawer, and a phrase chosen by pressing and dragging across words
 * (mouse) or holding a word and sliding (touch), which the phrase bubble then translates. The root
 * must be in the DOM when `deps` change, so the page can be held still while a finger chooses.
 */
export function usePhraseGesture(rootRef: RefObject<HTMLElement | null>, engine: WordEngine | null, options: Options, deps: readonly unknown[] = []) {
  const opts = useRef(options);
  opts.current = options;
  const [phrase, setPhrase] = useState<Phrase | null>(null);
  const selector = useRef<PhraseSelector | null>(null);
  type Gesture = { x: number; y: number; word: HTMLElement | null; target: Element; selectReady: boolean; selecting: boolean; longPressed: boolean; timer: number; type: string };
  const gesture = useRef<Gesture | null>(null);

  const closePhrase = useCallback(() => {
    const had = Boolean(selector.current);
    selector.current?.clear();
    selector.current = null;
    setPhrase(null);
    if (had) opts.current.onSelecting?.(false);
  }, []);

  // While a finger chooses words, the page must not scroll.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const hold = (e: TouchEvent) => {
      if (gesture.current?.selectReady) e.preventDefault();
    };
    root.addEventListener('touchmove', hold, { passive: false });
    return () => root.removeEventListener('touchmove', hold);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => () => selector.current?.clear(), []);

  const startSelecting = (g: Gesture) => {
    const root = rootRef.current;
    if (!root || !g.word) return;
    g.word.classList.remove('is-active');
    root.dispatchEvent(new Event('reader:hide-tip', { bubbles: true }));
    selector.current?.clear();
    setPhrase(null);
    selector.current = new PhraseSelector(root);
    selector.current.begin(g.word);
    g.selecting = true;
    opts.current.onSelecting?.(true);
  };

  const finishSelecting = () => {
    const sel = selector.current;
    if (!sel || !engine || sel.count < 2 || !sel.first || !sel.last) return closePhrase();
    const ctx = engine.context(sel.first);
    setPhrase({ text: sel.text(), anchor: sel.last, context: { sentence: ctx.sentence, textId: ctx.textId, chapterIndex: ctx.chapterIndex, blockIndex: ctx.blockIndex } });
  };

  // The click that follows a long-press lift would land on the drawer's backdrop and close it.
  const swallowNextClick = () => {
    const swallow = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
    };
    document.addEventListener('click', swallow, { capture: true, once: true });
    window.setTimeout(() => document.removeEventListener('click', swallow, { capture: true }), 450);
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const target = e.target as Element;
    if (opts.current.ignore?.(target)) return;
    const word = wordAt(target, e.clientX, e.clientY, rootRef.current);
    const g: Gesture = { x: e.clientX, y: e.clientY, word, target, selectReady: false, selecting: false, longPressed: false, timer: 0, type: e.pointerType };
    if (e.pointerType !== 'mouse' && word) {
      opts.current.onPress?.(word);
      g.timer = window.setTimeout(() => {
        g.longPressed = true;
        g.selectReady = true;
        word.classList.add('is-active');
        navigator.vibrate?.(8);
      }, LONG_PRESS_MS);
    }
    gesture.current = g;
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    const moved = Math.hypot(e.clientX - g.x, e.clientY - g.y);
    if (g.type === 'mouse') {
      if (!(e.buttons & 1) || !g.word) return;
      if (!g.selecting && moved > CLICK_SLOP_PX) startSelecting(g);
      if (g.selecting) selector.current?.update(e.clientX, e.clientY);
      return;
    }
    if (g.selectReady) {
      if (!g.selecting && moved > 8) startSelecting(g);
      if (g.selecting) selector.current?.update(e.clientX, e.clientY);
      return;
    }
    // Moving before the hold is up: the finger is scrolling.
    if (moved > 10) window.clearTimeout(g.timer);
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    window.clearTimeout(g.timer);
    if (g.selecting) return finishSelecting();
    if (g.selectReady && g.word) {
      g.word.classList.remove('is-active');
      swallowNextClick();
      return opts.current.onHold(g.word);
    }
    if (g.longPressed || Math.hypot(e.clientX - g.x, e.clientY - g.y) > (g.type === 'mouse' ? CLICK_SLOP_PX : 10)) return;
    opts.current.onTap({ word: g.word, target: g.target, type: g.type });
  };

  const onPointerCancel = () => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    window.clearTimeout(g.timer);
    g.word?.classList.remove('is-active');
    if (g.selecting) closePhrase();
  };

  return { handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel }, phrase, closePhrase };
}
