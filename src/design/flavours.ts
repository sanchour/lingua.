// A touch of the language in the design (Lingua 5.1-4b): for the six core languages, a heading face,
// a colour for small ornaments, the accent leaning a little toward it, one ornament for dividers and
// empty states, and the language's quotation marks. All of it hangs off <html data-flavour>, so the
// palette and the reading font stay the learner's own; the ornaments themselves are in
// styles/flavours.css. Settings › Preferences › Language touches turns it off.
import { NOCTURNE_PALETTES, PAPER_PALETTES } from './palettes';
import type { Palette } from './palettes';

export type FlavourId = 'fr' | 'es' | 'de' | 'ru' | 'zh' | 'ar';

export interface Flavour {
  id: FlavourId;
  /** What Settings says the touch is. */
  touch: string;
  /** The ornaments' colour on Paper and on Nocturne; the accent leans toward the Paper one. */
  colour: { paper: string; nocturne: string };
  /** How far the accent leans (0 = not at all), keeping its lightness. */
  lean: number;
  /** The heading face's CSS, loaded the first time the language is shown. */
  font: () => Promise<unknown>;
}

export const FLAVOURS: Record<FlavourId, Flavour> = {
  fr: { id: 'fr', touch: 'Garamond headings, a fleuron, a hint of bleu de France', colour: { paper: '#2f6db5', nocturne: '#86b4ea' }, lean: 0.12, font: () => import('@fontsource-variable/eb-garamond/wght.css') },
  es: { id: 'es', touch: 'Alegreya headings, a tile-pattern rule, warm terracotta, ¿ in titles that ask', colour: { paper: '#b4532f', nocturne: '#e08a62' }, lean: 0.25, font: () => import('@fontsource-variable/alegreya/wght.css') },
  de: { id: 'de', touch: 'clean grotesque headings, straight rules', colour: { paper: '#3a3634', nocturne: '#d6cdbf' }, lean: 0, font: () => import('@fontsource-variable/hanken-grotesk/wght.css') },
  ru: { id: 'ru', touch: 'PT Serif headings, a thin red rule', colour: { paper: '#b8322c', nocturne: '#e46a5f' }, lean: 0.22, font: () => Promise.all([import('@fontsource/pt-serif/400.css'), import('@fontsource/pt-serif/700.css')]) },
  zh: { id: 'zh', touch: 'Song-style headings, a vermilion seal', colour: { paper: '#c53a2c', nocturne: '#e8604f' }, lean: 0.22, font: () => import('@fontsource-variable/noto-serif-sc/wght.css') },
  ar: { id: 'ar', touch: 'Amiri headings, an eight-point star', colour: { paper: '#1d6f66', nocturne: '#6cc0b2' }, lean: 0.1, font: () => Promise.all([import('@fontsource/amiri/400.css'), import('@fontsource/amiri/700.css')]) },
};

export const flavourOf = (lang: string | undefined): Flavour | null => (lang && lang in FLAVOURS ? FLAVOURS[lang as FlavourId] : null);

// ── Quotation marks ─────────────────────────────────────────────────────────────

/** Each language's quotation marks; French keeps a thin space inside its guillemets. */
const QUOTES: Record<string, [string, string]> = {
  fr: ['« ', ' »'],
  es: ['«', '»'],
  it: ['«', '»'],
  ru: ['«', '»'],
  uk: ['«', '»'],
  ar: ['«', '»'],
  de: ['„', '“'],
  cs: ['„', '“'],
  pl: ['„', '”'],
  nl: ['„', '”'],
  ja: ['「', '」'],
  'zh-Hant': ['「', '」'],
  zh: ['“', '”'],
};

/** A quotation in a language, in that language's own marks (English curly quotes otherwise). */
export function quote(lang: string | undefined, text: string): string {
  const [open, close] = (lang && QUOTES[lang]) || ['“', '”'];
  return `${open}${text}${close}`;
}

// ── The accent leaning toward the language's colour ─────────────────────────────

type Rgb = [number, number, number];

const hexToRgb = (hex: string): Rgb => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
const toLinear = (c: number) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** sRGB to OKLab (Björn Ottosson's matrices). */
export function toOklab(hex: string): Rgb {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

function fromOklab([L, a, b]: Rgb): string {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return rgbToHex([4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map(fromLinear) as Rgb);
}

/** `hex` moved `t` of the way toward `toward` in colour, its lightness kept. */
export function lean(hex: string, toward: string, t: number): string {
  if (t <= 0) return hex;
  const [L, a, b] = toOklab(hex);
  const [, a2, b2] = toOklab(toward);
  return fromOklab([L, a + (a2 - a) * t, b + (b2 - b) * t]);
}

/** WCAG contrast ratio of two colours. */
export function contrast(x: string, y: string): number {
  const lum = (hex: string) => {
    const [r, g, b] = hexToRgb(hex).map(toLinear);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [hi, lo] = [lum(x), lum(y)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}

interface AccentSet {
  bg: string;
  accent: string;
  text: string;
  fill: string;
  on: string;
}

/** Cream's and Charcoal's colours live in tokens.css, not in a palette entry. */
const BASE: Record<'paper' | 'nocturne', AccentSet> = {
  paper: { bg: '#faf6f0', accent: '#c86d51', text: '#a5533b', fill: '#a5533b', on: '#fffaf2' },
  nocturne: { bg: '#1f1c1a', accent: '#d49b54', text: '#dba765', fill: '#d49b54', on: '#1f1c1a' },
};

const accentsOf = (p: Palette, theme: 'paper' | 'nocturne'): AccentSet =>
  Object.keys(p.vars).length ? { bg: p.vars['--bg'], accent: p.vars['--accent'], text: p.vars['--accent-text'], fill: p.vars['--accent-fill'], on: p.vars['--on-accent'] } : BASE[theme];

/**
 * A palette's accent colours leaning toward a flavour's. A text or fill colour that would read less
 * clearly than 4.5 : 1 (or than the palette's own, if that was lower) stays as it was.
 */
export function leanedAccents(set: AccentSet, f: Flavour): AccentSet {
  const toward = f.colour.paper;
  const keep = (before: string, after: string, against: string) => (contrast(after, against) >= Math.min(4.5, contrast(before, against)) ? after : before);
  return {
    ...set,
    accent: lean(set.accent, toward, f.lean),
    text: keep(set.text, lean(set.text, toward, f.lean), set.bg),
    fill: keep(set.fill, lean(set.fill, toward, f.lean), set.on),
  };
}

const rgbList = (hex: string) => hexToRgb(hex).join(' ');

/** Every palette × flavour as CSS: the leaned accents and the ornaments' colour. */
export function flavourCss(): string {
  const rules: string[] = [];
  for (const [theme, palettes] of [['paper', PAPER_PALETTES], ['nocturne', NOCTURNE_PALETTES]] as const) {
    const dark = theme === 'nocturne';
    for (const f of Object.values(FLAVOURS)) {
      rules.push(`[data-theme='${theme}'][data-flavour='${f.id}']{--flavour:${f.colour[theme]}}`);
      if (!f.lean) continue;
      for (const p of palettes) {
        const a = leanedAccents(accentsOf(p, theme), f);
        const vars = { '--accent': a.accent, '--accent-text': a.text, '--accent-fill': a.fill, '--accent-soft': `rgb(${rgbList(a.accent)} / ${dark ? 0.16 : 0.13})`, '--learning-bg': `rgb(${rgbList(a.accent)} / ${dark ? 0.17 : 0.14})`, '--learning-line': a.accent };
        rules.push(`[data-theme='${theme}'][data-palette='${p.id}'][data-flavour='${f.id}']{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';')}}`);
      }
    }
  }
  return rules.join('\n');
}

/** The test's view of the same pairs (theme, palette, the colours before and after). */
export function allLeanedAccents(): Array<{ theme: string; palette: string; flavour: FlavourId; before: AccentSet; after: AccentSet }> {
  return (['paper', 'nocturne'] as const).flatMap((theme) =>
    (theme === 'paper' ? PAPER_PALETTES : NOCTURNE_PALETTES).flatMap((p: Palette) =>
      Object.values(FLAVOURS).map((f) => ({ theme, palette: p.id, flavour: f.id, before: accentsOf(p, theme), after: leanedAccents(accentsOf(p, theme), f) })),
    ),
  );
}

const fontsLoaded = new Set<FlavourId>();

/** Puts the language's touch on <html> (or takes it off), loading its heading face once. */
export function applyFlavour(lang: string | null | undefined): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const f = flavourOf(lang ?? undefined);
  if (!f) {
    delete root.dataset.flavour;
    return;
  }
  if (!document.getElementById('lingua-flavours')) {
    const style = document.createElement('style');
    style.id = 'lingua-flavours';
    style.textContent = flavourCss();
    document.head.append(style);
  }
  if (!fontsLoaded.has(f.id)) {
    fontsLoaded.add(f.id);
    void f.font().catch(() => fontsLoaded.delete(f.id));
  }
  root.dataset.flavour = f.id;
}
