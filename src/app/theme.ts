import { useLayoutEffect } from 'react';
import { useMediaQuery } from '@/design/hooks/useMediaQuery';
import type { Theme, ThemePref } from '@/data/settings';
import { motionIsReduced } from '@/design/motionPref';

const THEME_COLOR: Record<Theme, string> = { paper: '#FAF6F0', nocturne: '#1F1C1A' };

export function resolveTheme(pref: ThemePref, systemDark: boolean): Theme {
  return pref === 'system' ? (systemDark ? 'nocturne' : 'paper') : pref;
}

/** Matches the browser/status bar to the page colour actually showing (a reading paper included). */
export function syncThemeColor(): void {
  const root = document.documentElement;
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
  const theme = (root.dataset.theme as Theme | undefined) ?? 'paper';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg || THEME_COLOR[theme]);
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  syncThemeColor();
}

/** Keeps <html data-theme> in sync with the saved preference and the system appearance. */
export function useThemeController(pref: ThemePref | undefined): Theme {
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  const theme = resolveTheme(pref ?? 'paper', systemDark);

  useLayoutEffect(() => {
    if (pref) {
      try {
        localStorage.setItem('lingua.theme', pref);
      } catch {
        // Storage can be unavailable (private mode); the theme still applies for this session.
      }
    }
    if (document.documentElement.dataset.theme === theme) return;
    const reduceMotion = motionIsReduced();
    if (typeof document.startViewTransition === 'function' && !reduceMotion && document.visibilityState === 'visible') {
      document.startViewTransition(() => applyTheme(theme));
    } else {
      applyTheme(theme);
    }
  }, [theme, pref]);

  return theme;
}
