import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from '@/state/ui';

/** Announces offline readiness and new versions. Updates wait for a tap, never reload on their own. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (offlineReady) toast('Lingua is ready to work offline.', { tone: 'success' });
  }, [offlineReady]);

  useEffect(() => {
    if (!needRefresh) return;
    toast('A new version of Lingua is ready.', {
      duration: 0,
      action: { label: 'Update', onClick: () => void updateServiceWorker(true) },
    });
  }, [needRefresh, updateServiceWorker]);

  return null;
}
