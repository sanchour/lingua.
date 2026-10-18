import { useLayoutEffect } from 'react';
import { useMediaQuery } from '@/design/hooks/useMediaQuery';
import type { Settings, Theme, ThemePref } from '@/data/settings';
import { motionIsReduced } from '@/design/motionPref';
import { installPaletteStyles } from '@/design/palettes';

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

function applyTheme(theme: Theme, palette: string) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.palette = palette;
  syncThemeColor();
}

/** Keeps <html data-theme> in sync with the saved preference and the system appearance. */
export function useThemeController(pref: ThemePref | undefined, palettes?: Settings['palette']): Theme {
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  const theme = resolveTheme(pref ?? 'paper', systemDark);
  const palette = palettes?.[theme] ?? (theme === 'paper' ? 'cream' : 'charcoal');

  useLayoutEffect(() => {
    installPaletteStyles();
    if (pref) {
      try {
        localStorage.setItem('lingua.theme', pref);
        if (palettes) localStorage.setItem('lingua.palette', JSON.stringify(palettes));
      } catch {
        // Storage can be unavailable (private mode); the theme still applies for this session.
      }
    }
    const root = document.documentElement;
    if (root.dataset.theme === theme && root.dataset.palette === palette) return;
    const reduceMotion = motionIsReduced();
    if (typeof document.startViewTransition === 'function' && !reduceMotion && document.visibilityState === 'visible') {
      document.startViewTransition(() => applyTheme(theme, palette));
    } else {
      applyTheme(theme, palette);
    }
  }, [theme, pref, palette, palettes]);

  return theme;
}
