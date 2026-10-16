import type { Script } from '@/core/lang/languages';

export type ReaderFontId = 'literata' | 'lora' | 'newsreader' | 'merriweather' | 'atkinson';

export interface ReaderFont {
  id: ReaderFontId;
  label: string;
  family: string;
  kind: 'serif' | 'sans';
  /** Scripts the font itself covers; anything else falls back (see `fallbackFamily`). */
  scripts: Script[];
  blurb: string;
}

export const READER_FONTS: ReaderFont[] = [
  { id: 'literata', label: 'Literata', family: "'Literata Variable'", kind: 'serif', scripts: ['Latn', 'Cyrl', 'Grek'], blurb: 'Made for long reading on screens' },
  { id: 'lora', label: 'Lora', family: "'Lora Variable'", kind: 'serif', scripts: ['Latn', 'Cyrl'], blurb: 'Soft, calligraphic warmth' },
  { id: 'newsreader', label: 'Newsreader', family: "'Newsreader Variable'", kind: 'serif', scripts: ['Latn'], blurb: 'Elegant and editorial' },
  { id: 'merriweather', label: 'Merriweather', family: "'Merriweather Variable'", kind: 'serif', scripts: ['Latn', 'Cyrl'], blurb: 'Sturdy and very clear' },
  { id: 'atkinson', label: 'Atkinson Hyperlegible', family: "'Atkinson Hyperlegible'", kind: 'sans', scripts: ['Latn'], blurb: 'Maximum letter distinction' },
];

const SERIF_FALLBACK = "'Noto Serif Variable', Georgia, serif";
const SANS_FALLBACK = "'Inter Variable', system-ui, sans-serif";

export function getReaderFont(id: ReaderFontId): ReaderFont {
  return READER_FONTS.find((f) => f.id === id) ?? READER_FONTS[0];
}

/** CSS font-family for reader text. Missing scripts fall through to a covering font. */
export function readerFontStack(font: ReaderFont): string {
  return `${font.family}, ${font.kind === 'serif' ? SERIF_FALLBACK : SANS_FALLBACK}`;
}

/** Name of the font that will actually draw `script`, when the chosen font lacks it. */
export function fallbackFamily(font: ReaderFont, script: Script): string | null {
  if (font.scripts.includes(script)) return null;
  return font.kind === 'serif' ? 'Noto Serif' : 'Inter';
}
