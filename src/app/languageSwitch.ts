import { switchLanguage } from '@/data/languages';
import { motionIsReduced } from '@/design/motionPref';

/** Resolves once `done()` is true (checked every frame), or after `timeoutMs` even if no frames come. */
function until(done: () => boolean, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    let frame = 0;
    const finish = () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      resolve();
    };
    const timer = window.setTimeout(finish, timeoutMs);
    const tick = () => (done() ? finish() : (frame = requestAnimationFrame(tick)));
    tick();
  });
}

/**
 * Switches the studied language with a soft cross-fade of the whole app (a View Transition):
 * the old screen is held until the new language has rendered, then they blend. `beforeSwitch`
 * runs inside the transition (e.g. leaving a page that belongs to the old language).
 */
export async function switchLanguageSmoothly(id: string, beforeSwitch?: () => void): Promise<void> {
  const root = document.documentElement;
  if (root.dataset.studying === id) return;
  const apply = async () => {
    beforeSwitch?.();
    await switchLanguage(id);
    // AppShell marks <html data-studying> once the new language has rendered.
    await until(() => root.dataset.studying === id, 1500);
  };
  if (typeof document.startViewTransition !== 'function' || motionIsReduced() || document.visibilityState !== 'visible') {
    await apply();
    return;
  }
  root.dataset.transition = 'language';
  try {
    await document.startViewTransition(apply).finished;
  } catch {
    // A skipped transition still switched the language.
  } finally {
    delete root.dataset.transition;
  }
}
