import { useEffect, useState } from 'react';

const current = () => (document.fullscreenElement as HTMLElement | null) ?? document.body;

/**
 * Where overlays (popovers, drawers, glosses, toasts) are rendered: the page, or the element in
 * full screen (Visio's player), since nothing outside it is drawn while it fills the screen.
 */
export function usePortalRoot(): HTMLElement {
  const [root, setRoot] = useState<HTMLElement>(current);
  useEffect(() => {
    const update = () => setRoot(current());
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);
  return root;
}
