import { contrastPaletteToCss, HIGH_CONTRAST_NOCTURNE, HIGH_CONTRAST_PAPER } from './contrast';

// Themes for Paper (light) and Nocturne (dark): a background and the element colours that belong
// with it. Text keeps the theme's own ink, so reading stays as clear; each accent's text colour is
// chosen to stay at 4.5 : 1 or more on its background. The first of each list is the original look.

export type PaperPaletteId = 'cream' | 'rose' | 'sage' | 'sand' | 'linen' | 'lavender';
export type NocturnePaletteId = 'charcoal' | 'ink' | 'plum' | 'forest' | 'slate' | 'ember';

export interface Palette<Id extends string = string> {
  id: Id;
  name: string;
  /** What the swatch shows: the page and the accent. */
  swatch: [bg: string, accent: string];
  /** CSS custom properties laid over the theme's own. */
  vars: Record<string, string>;
}

/** The colours a palette sets, from its page, its surfaces and its accent. */
function palette<Id extends string>(
  id: Id,
  name: string,
  page: { bg: string; surface: string; raised: string; sunken: string; line: string; lineStrong: string },
  accent: { color: string; text: string; fill?: string; rgb: string; on: string },
  dark = false,
): Palette<Id> {
  return {
    id,
    name,
    swatch: [page.bg, accent.color],
    vars: {
      '--bg': page.bg,
      '--surface': page.surface,
      '--raised': page.raised,
      '--sunken': page.sunken,
      '--line': page.line,
      '--line-strong': page.lineStrong,
      '--accent': accent.color,
      '--accent-text': accent.text,
      '--accent-fill': accent.fill ?? (dark ? accent.color : accent.text),
      '--accent-soft': `rgb(${accent.rgb} / ${dark ? 0.16 : 0.13})`,
      '--on-accent': accent.on,
      '--learning-bg': `rgb(${accent.rgb} / ${dark ? 0.17 : 0.14})`,
      '--learning-line': accent.color,
    },
  };
}

export const PAPER_PALETTES: Array<Palette<PaperPaletteId>> = [
  { id: 'cream', name: 'Cream', swatch: ['#faf6f0', '#c86d51'], vars: {} },
  palette('rose', 'Rose', { bg: '#fbf3f2', surface: '#f3e3e1', raised: '#fffafa', sunken: '#ecd8d5', line: '#ead3cf', lineStrong: '#d9b9b3' }, { color: '#b85c74', text: '#9a4560', rgb: '184 92 116', on: '#fff8f9' }),
  palette('sage', 'Sage', { bg: '#f4f6f0', surface: '#e5eadf', raised: '#fbfcf8', sunken: '#dbe2d3', line: '#d8dfcf', lineStrong: '#bfc9b3' }, { color: '#5e8a6c', text: '#456d52', rgb: '94 138 108', on: '#f7fbf5' }),
  palette('sand', 'Sand', { bg: '#f7f0e3', surface: '#ece0c8', raised: '#fdf8ee', sunken: '#e4d6ba', line: '#e0d1b5', lineStrong: '#cbb894' }, { color: '#b0802f', text: '#7a561a', rgb: '176 128 47', on: '#fffaf0' }),
  palette('linen', 'Linen', { bg: '#f5f5f2', surface: '#e8e8e3', raised: '#fcfcfa', sunken: '#dfdfd8', line: '#dcdcd4', lineStrong: '#c3c3b8' }, { color: '#4f6d9a', text: '#3d5a85', rgb: '79 109 154', on: '#f6f8fc' }),
  palette('lavender', 'Lavender', { bg: '#f6f3f8', surface: '#e9e2ef', raised: '#fcfafd', sunken: '#e0d7e8', line: '#ddd3e6', lineStrong: '#c5b6d3' }, { color: '#7d63a3', text: '#654b8c', rgb: '125 99 163', on: '#faf8fd' }),
];

export const NOCTURNE_PALETTES: Array<Palette<NocturnePaletteId>> = [
  { id: 'charcoal', name: 'Charcoal', swatch: ['#1f1c1a', '#d49b54'], vars: {} },
  palette('ink', 'Ink', { bg: '#161a22', surface: '#1f2430', raised: '#282e3b', sunken: '#11141a', line: '#2c3240', lineStrong: '#3d4556' }, { color: '#7fa8d8', text: '#93b6e0', rgb: '127 168 216', on: '#12161d' }, true),
  palette('plum', 'Plum', { bg: '#1e1820', surface: '#2a2130', raised: '#33293a', sunken: '#18131a', line: '#3a2f40', lineStrong: '#4f4157' }, { color: '#d08bb0', text: '#dc9dbe', rgb: '208 139 176', on: '#1e1820' }, true),
  palette('forest', 'Forest', { bg: '#161d19', surface: '#1f2924', raised: '#27332d', sunken: '#111713', line: '#2b3830', lineStrong: '#3c4c42' }, { color: '#a8c77a', text: '#b5d18a', rgb: '168 199 122', on: '#141a16' }, true),
  palette('slate', 'Slate', { bg: '#1c1e20', surface: '#26292c', raised: '#2f3336', sunken: '#161819', line: '#34383c', lineStrong: '#474c51' }, { color: '#7fbcb5', text: '#92c8c1', rgb: '127 188 181', on: '#141617' }, true),
  palette('ember', 'Ember', { bg: '#221a17', surface: '#2e2420', raised: '#382c27', sunken: '#1b1412', line: '#3d302a', lineStrong: '#54433b' }, { color: '#e07a5f', text: '#e89279', rgb: '224 122 95', on: '#1f1714' }, true),
];

/** One stylesheet with every palette, so switching is just an attribute on <html>. */
export function installPaletteStyles(): void {
  if (typeof document === 'undefined' || document.getElementById('lingua-palettes')) return;
  const rule = (theme: string, p: Palette) =>
    `[data-theme='${theme}'][data-palette='${p.id}']{${Object.entries(p.vars)
      .map(([k, v]) => `${k}:${v}`)
      .join(';')}}`;
  const css = [
    ...PAPER_PALETTES.filter((p) => Object.keys(p.vars).length).map((p) => rule('paper', p)),
    ...NOCTURNE_PALETTES.filter((p) => Object.keys(p.vars).length).map((p) => rule('nocturne', p)),
    contrastPaletteToCss(HIGH_CONTRAST_PAPER, 'paper'),
    contrastPaletteToCss(HIGH_CONTRAST_NOCTURNE, 'nocturne'),
  ].join('\n');
  const style = document.createElement('style');
  style.id = 'lingua-palettes';
  style.textContent = css;
  document.head.append(style);
}
