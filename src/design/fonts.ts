import { useEffect } from 'react';
import { getLanguage } from '@/core/lang/languages';
import type { Script } from '@/core/lang/languages';

export type ReaderFontId = 'literata' | 'lora' | 'newsreader' | 'merriweather' | 'atkinson' | 'comfortaa';

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
  { id: 'comfortaa', label: 'Comfortaa', family: "'Comfortaa Variable'", kind: 'sans', scripts: ['Latn', 'Cyrl', 'Grek'], blurb: 'Round, soft and friendly' },
];

/**
 * Faces for the scripts no reading font has: serif ones are bundled (and loaded only when the script
 * is used, see useScriptFont); sans text uses the system's own, which every phone has.
 */
const SCRIPT_SERIF: Partial<Record<Script, string>> = {
  Arab: "'Noto Naskh Arabic Variable'",
  Hans: "'Noto Serif SC Variable'",
  Jpan: "'Noto Serif JP Variable'",
  Kore: "'Noto Serif KR Variable'",
};
const SCRIPT_SANS: Partial<Record<Script, string>> = {
  Arab: "'SF Arabic', 'Segoe UI', 'Noto Sans Arabic', Tahoma",
  Hans: "'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', 'Noto Sans CJK SC'",
  Jpan: "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', Meiryo, 'Noto Sans JP', 'Noto Sans CJK JP'",
  Kore: "'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', 'Noto Sans CJK KR'",
  // Beta languages' scripts (3.0-1b): the device's own faces, in serif text too.
  Hant: "'PingFang HK', 'PingFang TC', 'Microsoft JhengHei', 'Noto Sans TC', 'Noto Sans CJK TC'",
  Deva: "'Kohinoor Devanagari', 'Nirmala UI', 'Noto Sans Devanagari'",
  Thai: "'Thonburi', 'Leelawadee UI', 'Noto Sans Thai'",
  Taml: "'Tamil Sangam MN', 'Nirmala UI', 'Noto Sans Tamil'",
  Geor: "'Helvetica Neue', 'Sylfaen', 'Noto Sans Georgian'",
};
/** Han characters look different in Japanese and Chinese: the language on screen goes first. */
const SCRIPT_ORDER: Script[] = ['Hans', 'Hant', 'Jpan', 'Kore', 'Arab', 'Deva', 'Thai', 'Taml', 'Geor'];

const SERIF_FALLBACK = "'Noto Serif Variable', Georgia, serif";
const SANS_FALLBACK = "'Inter Variable', system-ui, sans-serif";

export function getReaderFont(id: ReaderFontId): ReaderFont {
  return READER_FONTS.find((f) => f.id === id) ?? READER_FONTS[0];
}

/** CSS font-family for reader text in `lang`. Missing scripts fall through to a covering font. */
export function readerFontStack(font: ReaderFont, lang?: string): string {
  const own = lang ? getLanguage(lang)?.script : undefined;
  // Scripts without a bundled serif face use the device's own, in serif text too.
  const faces = font.kind === 'serif' ? { ...SCRIPT_SANS, ...SCRIPT_SERIF } : SCRIPT_SANS;
  const order = own && faces[own] ? [own, ...SCRIPT_ORDER.filter((s) => s !== own)] : SCRIPT_ORDER;
  const scripts = order.map((s) => faces[s]).filter(Boolean);
  return `${font.family}, ${font.kind === 'serif' ? `${scripts.join(', ')}, ${SERIF_FALLBACK}` : `${SANS_FALLBACK.replace(', system-ui', `, ${scripts.join(', ')}, system-ui`)}`}`;
}

/** Name of the font that will actually draw `script`, when the chosen font lacks it. */
export function fallbackFamily(font: ReaderFont, script: Script): string | null {
  if (font.scripts.includes(script)) return null;
  if (script in SCRIPT_SERIF) return font.kind === 'serif' ? SCRIPT_SERIF[script]!.replace(/'| Variable/g, '') : 'your device’s own font';
  if (script in SCRIPT_SANS) return 'your device’s own font';
  return font.kind === 'serif' ? 'Noto Serif' : 'Inter';
}

// Each face's CSS comes as a chunk of its own; its font files load only for characters on screen.
const LOADERS: Partial<Record<Script, () => Promise<unknown>>> = {
  Arab: () => import('@fontsource-variable/noto-naskh-arabic/wght.css'),
  Hans: () => import('@fontsource-variable/noto-serif-sc/wght.css'),
  Jpan: () => import('@fontsource-variable/noto-serif-jp/wght.css'),
  Kore: () => import('@fontsource-variable/noto-serif-kr/wght.css'),
};
const loaded = new Set<Script>();

/** Loads the reading face for a language's script, the first time it's needed. */
export function loadScriptFont(lang: string): void {
  const script = getLanguage(lang)?.script;
  if (!script || loaded.has(script) || !LOADERS[script]) return;
  loaded.add(script);
  void LOADERS[script]!().catch(() => loaded.delete(script));
}

export function useScriptFont(lang: string | undefined): void {
  useEffect(() => {
    if (lang) loadScriptFont(lang);
  }, [lang]);
}
