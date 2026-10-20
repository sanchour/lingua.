import { useLayoutEffect, useRef } from 'react';
import { useApp } from '@/app/context';
import { resolveTheme, syncThemeColor } from '@/app/theme';

/**
 * Cantus is always dark, in Paper and Nocturne alike. While the room is open the whole document
 * takes its colours (html[data-room='cantus'], see styles/cantus-room.css), so dialogs, sheets and
 * menus portalled outside the room match it, and so does the browser's bar. Leaving puts the
 * app's own theme back.
 */
export function useRoomTheme(): void {
  const pref = useApp().settings.theme;
  const prefRef = useRef(pref);
  useLayoutEffect(() => {
    prefRef.current = pref;
  });

  useLayoutEffect(() => {
    const root = document.documentElement;
    const darken = () => {
      // Nocturne underneath, so everything written for the dark theme applies; the room's colours over it.
      if (root.dataset.theme !== 'nocturne') root.dataset.theme = 'nocturne';
      syncThemeColor();
    };
    root.dataset.room = 'cantus';
    darken();
    // The app's theme can change while the room is open (the system turning dark at dusk): stay dark.
    const observer = new MutationObserver(() => root.dataset.theme !== 'nocturne' && darken());
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      observer.disconnect();
      delete root.dataset.room;
      // What the theme controller (app/theme.ts) would have set by now.
      root.dataset.theme = resolveTheme(prefRef.current ?? 'paper', window.matchMedia('(prefers-color-scheme: dark)').matches);
      syncThemeColor();
    };
  }, []);
}
