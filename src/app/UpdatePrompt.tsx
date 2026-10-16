import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { usePlayer } from '@/services/audio/engine';
import { toast } from '@/state/ui';

const CHECK_EVERY = 30 * 60_000;
/** Right after opening the app nothing is in progress yet, so an update is applied straight away. */
const LAUNCH_WINDOW = 15_000;
const UPDATED_FLAG = 'lingua.updated';

/** A study session lives in memory only: reloading would lose it. Everything else saves as you go. */
const busy = () => location.pathname.includes('/thesaurus/study/') || usePlayer.getState().status === 'playing';

/**
 * Keeps installed apps (iPhone, desktop) up to date without asking. New versions are looked for on
 * launch, when the app comes back to the front and every half hour, and are applied at a calm moment:
 * at launch, or while the app is in the background, but never mid-lesson or while audio plays.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => {
        if (navigator.onLine && document.visibilityState === 'visible') void registration.update().catch(() => {});
      };
      window.setInterval(check, CHECK_EVERY);
      document.addEventListener('visibilitychange', check);
    },
  });

  useEffect(() => {
    let updated = false;
    try {
      updated = sessionStorage.getItem(UPDATED_FLAG) === '1';
      sessionStorage.removeItem(UPDATED_FLAG);
    } catch {
      /* storage unavailable */
    }
    if (updated) toast('Lingua was updated to the latest version.', { tone: 'success' });
  }, []);

  useEffect(() => {
    if (offlineReady) toast('Lingua is ready to work offline.', { tone: 'success' });
  }, [offlineReady]);

  useEffect(() => {
    if (!needRefresh) return;
    const apply = () => {
      try {
        sessionStorage.setItem(UPDATED_FLAG, '1');
      } catch {
        /* storage unavailable */
      }
      void updateServiceWorker(true);
    };
    const calm = () => !busy();
    if (calm() && (performance.now() < LAUNCH_WINDOW || document.visibilityState === 'hidden')) {
      apply();
      return;
    }
    const onHidden = () => {
      if (document.visibilityState === 'hidden' && calm()) apply();
    };
    document.addEventListener('visibilitychange', onHidden);
    toast('A new version of Lingua is ready. It installs itself when you leave the app.', {
      duration: 8000,
      action: { label: 'Update now', onClick: apply },
    });
    return () => document.removeEventListener('visibilitychange', onHidden);
  }, [needRefresh, updateServiceWorker]);

  return null;
}
