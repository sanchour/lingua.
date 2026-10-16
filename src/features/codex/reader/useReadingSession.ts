import { useCallback, useEffect, useRef } from 'react';
import { recordSession } from '@/data/activity';

const IDLE_AFTER_MS = 120_000;

/**
 * Measures active reading time (visible tab, recent interaction) and words read, and records a
 * session when the reader closes or the app goes to the background.
 */
export function useReadingSession(lang: string, textId: string | undefined) {
  const startedAt = useRef(Date.now());
  const activeMs = useRef(0);
  const lastTick = useRef(performance.now());
  const lastInteraction = useRef(performance.now());
  const wordsRead = useRef(0);

  const tick = useCallback(() => {
    const now = performance.now();
    if (document.visibilityState === 'visible' && now - lastInteraction.current < IDLE_AFTER_MS) {
      activeMs.current += Math.min(now - lastTick.current, IDLE_AFTER_MS);
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
    }, []),
  };
}
