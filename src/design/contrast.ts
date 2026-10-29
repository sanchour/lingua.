// High-contrast palettes and WCAG 2.1 AAA contrast calculation (7:1 for text).
// Lingua 6 step 6-25 (F1534).

export interface ContrastPalette {
  bg: string;
  surface: string;
  raised: string;
  sunken: string;
  line: string;
  lineStrong: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  accent: string;
  accentText: string;
  accentSoft: string;
  onAccent: string;
  sage: string;
  sageText: string;
  sageSoft: string;
}

/**
 * High-contrast Light (Paper) palette.
 * Backgrounds are stark white and light greys; text is pure black or very dark grey (all >= 7:1).
 */
export const HIGH_CONTRAST_PAPER: ContrastPalette = {
  bg: '#ffffff',
  surface: '#f0f0f0',
  raised: '#ffffff',
  sunken: '#e2e2e2',
  line: '#555555',
  lineStrong: '#000000',
  ink: '#000000',
  inkSoft: '#222222',
  inkFaint: '#3a3a3a',
  accent: '#a01c00',
  accentText: '#801500',
  accentSoft: 'rgb(160 28 0 / 0.15)',
  onAccent: '#ffffff',
  sage: '#00591f',
  sageText: '#004719',
  sageSoft: 'rgb(0 89 31 / 0.15)',
};

/**
 * High-contrast Dark (Nocturne) palette.
 * Backgrounds are pure black and deep greys; text is pure white, bright ivory, and bright accents (all >= 7:1).
 */
export const HIGH_CONTRAST_NOCTURNE: ContrastPalette = {
  bg: '#000000',
  surface: '#121212',
  raised: '#1a1a1a',
  sunken: '#050505',
  line: '#888888',
  lineStrong: '#ffffff',
  ink: '#ffffff',
  inkSoft: '#f0f0f0',
  inkFaint: '#dcdcdc',
  accent: '#ffd700',
  accentText: '#ffe033',
  accentSoft: 'rgb(255 215 0 / 0.2)',
  onAccent: '#000000',
  sage: '#70ff99',
  sageText: '#85ffa8',
  sageSoft: 'rgb(112 255 153 / 0.2)',
};

/** Parses a hex color string (#rgb or #rrggbb) into [r, g, b] normalized to 0..1. */
export function parseHex(hex: string): [number, number, number] {
  let clean = hex.replace(/^#/, '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return [0, 0, 0];
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  return [r, g, b];
}

/** Calculates the relative luminance of a color according to WCAG 2.1 formula. */
export function getLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  const sRGB = [r, g, b].map((val) => {
    return val <= 0.04045 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

/** Computes the contrast ratio between two hex colors, returning a number between 1 and 21. */
export function contrastRatio(colorA: string, colorB: string): number {
  const lumA = getLuminance(colorA);
  const lumB = getLuminance(colorB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Converts a high-contrast palette into CSS custom property declarations. */
export function contrastPaletteToCss(palette: ContrastPalette, theme: 'paper' | 'nocturne'): string {
  return `[data-theme='${theme}'][data-high-contrast='true'] {
  --bg: ${palette.bg};
  --surface: ${palette.surface};
  --raised: ${palette.raised};
  --sunken: ${palette.sunken};
  --line: ${palette.line};
  --line-strong: ${palette.lineStrong};
  --ink: ${palette.ink};
  --ink-soft: ${palette.inkSoft};
  --ink-faint: ${palette.inkFaint};
  --accent: ${palette.accent};
  --accent-text: ${palette.accentText};
  --accent-fill: ${palette.accentText};
  --accent-soft: ${palette.accentSoft};
  --on-accent: ${palette.onAccent};
  --sage: ${palette.sage};
  --sage-text: ${palette.sageText};
  --sage-soft: ${palette.sageSoft};
}`;
}
