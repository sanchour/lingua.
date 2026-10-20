import { useCallback, useEffect, useRef } from 'react';
import { recordSession } from '@/data/activity';

const IDLE_AFTER_MS = 120_000;

/** What one sitting with a text came to, for the end page. */
export interface SessionStats {
  activeMs: number;
  wordsRead: number;
  pages: number;
  /** Words met for the first time (unseen when their page or paragraph was read). */
  newWords: number;
  lookedUp: number;
}

/**
 * Measures active reading time (visible tab, recent interaction) and words read, and records a
 * session when the reader closes or the app goes to the background. It also keeps the whole
 * sitting's totals (they don't reset when a session is recorded) for the end page.
 */
export function useReadingSession(lang: string, textId: string | undefined) {
  const startedAt = useRef(Date.now());
  const activeMs = useRef(0);
  const lastTick = useRef(performance.now());
  const lastInteraction = useRef(performance.now());
  const wordsRead = useRef(0);
  const total = useRef({ activeMs: 0, wordsRead: 0, pages: 0 });
  const met = useRef(new Set<string>());
  const lookedUp = useRef(new Set<string>());

  const tick = useCallback(() => {
    const now = performance.now();
    if (document.visibilityState === 'visible' && now - lastInteraction.current < IDLE_AFTER_MS) {
      const step = Math.min(now - lastTick.current, IDLE_AFTER_MS);
      activeMs.current += step;
      total.current.activeMs += step;
    }
    lastTick.current = now;
  }, []);

  const flush = useCallback(() => {
    tick();
    if (!textId || activeMs.current < 5_000) return;
    void recordSession({
      lang,
      type: 'read',
      refId: textId,
      startedAt: startedAt.current,
      endedAt: Date.now(),
      activeMs: Math.round(activeMs.current),
      wordsRead: Math.round(wordsRead.current),
    });
    startedAt.current = Date.now();
    activeMs.current = 0;
    wordsRead.current = 0;
  }, [lang, textId, tick]);

  useEffect(() => {
    const onVisibility = () => (document.visibilityState === 'hidden' ? flush() : (lastTick.current = performance.now()));
    const interval = window.setInterval(tick, 15_000);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      flush();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, [flush, tick]);

  return {
    /** Call on any reading interaction (page turn, word tap, scroll). */
    touch: useCallback(() => {
      tick();
      lastInteraction.current = performance.now();
    }, [tick]),
    addWords: useCallback((n: number) => {
      wordsRead.current += n;
      total.current.wordsRead += n;
    }, []),
    addPage: useCallback(() => {
      total.current.pages++;
    }, []),
    /** Words on a page or paragraph just read that were new to the reader. */
    meet: useCallback((norms: Iterable<string>) => {
      for (const n of norms) met.current.add(n);
    }, []),
    lookUp: useCallback((norm: string) => {
      lookedUp.current.add(norm);
    }, []),
    /** Reading time not yet recorded (what today's total doesn't include yet). */
    pendingMs: useCallback(() => {
      tick();
      return activeMs.current;
    }, [tick]),
    stats: useCallback((): SessionStats => {
      tick();
      return { ...total.current, activeMs: Math.round(total.current.activeMs), wordsRead: Math.round(total.current.wordsRead), newWords: met.current.size, lookedUp: lookedUp.current.size };
    }, [tick]),
  };
}
