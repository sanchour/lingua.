import { useLayoutEffect } from 'react';
import { useMediaQuery } from '@/design/hooks/useMediaQuery';
import type { Theme, ThemePref } from '@/data/settings';

const THEME_COLOR: Record<Theme, string> = { paper: '#FAF6F0', nocturne: '#1F1C1A' };

export function resolveTheme(pref: ThemePref, systemDark: boolean): Theme {
  return pref === 'system' ? (systemDark ? 'nocturne' : 'paper') : pref;
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
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
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (typeof document.startViewTransition === 'function' && !reduceMotion && document.visibilityState === 'visible') {
      document.startViewTransition(() => applyTheme(theme));
    } else {
      applyTheme(theme);
    }
  }, [theme, pref]);

  return theme;
}
