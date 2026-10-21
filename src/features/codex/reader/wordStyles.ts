// How Known, Learning and Unseen words look (5.1-3a, the reader's "T" › Words). The choice becomes
// CSS variables on the text (reader.css reads them), so changing it repaints without a render.
import type { CSSProperties } from 'react';
import type { Settings, WordColor, WordLook, WordLookState } from '@/data/settings';

/** Six colours that sit with every palette: two of the palette's own and four quiet inks. */
export const WORD_COLORS: Array<{ id: WordColor; label: string; css: string }> = [
  { id: 'accent', label: 'Accent', css: 'var(--accent)' },
  { id: 'sage', label: 'Sage', css: 'var(--sage)' },
  { id: 'gold', label: 'Gold', css: '#c9a13b' },
  { id: 'blue', label: 'Blue', css: '#5b84b1' },
  { id: 'plum', label: 'Plum', css: '#9a6a9e' },
  { id: 'ink', label: 'Ink', css: 'var(--ink-soft)' },
];

/** What each state looks like until the learner chooses: as Lingua always drew them. */
export const DEFAULT_WORDS: Record<WordLookState, WordLook> = {
  known: { style: 'none', color: 'ink' },
  learning: { style: 'highlight', color: 'accent' },
  unseen: { style: 'dotted', color: 'sage' },
};

const KEY: Record<WordLookState, string> = { unseen: '0', known: '1', learning: '2' };

/** The variables for one state; the CSS falls back to the default look where none is set. */
function varsFor(state: WordLookState, look: WordLook): Record<string, string> {
  const k = KEY[state];
  const color = WORD_COLORS.find((c) => c.id === look.color)?.css ?? 'var(--accent)';
  // Unseen words are many: their marks are lighter.
  const line = state === 'unseen' ? `color-mix(in oklab, ${color} 60%, transparent)` : color;
  const bg = `color-mix(in oklab, ${color} ${state === 'unseen' ? 10 : 16}%, transparent)`;
  return {
    [`--ws${k}-line`]: look.style === 'none' || look.style === 'faint' ? 'none' : 'underline',
    [`--ws${k}-style`]: look.style === 'dotted' ? 'dotted' : 'solid',
    [`--ws${k}-color`]: line,
    [`--ws${k}-bg`]: look.style === 'highlight' ? bg : 'transparent',
    [`--ws${k}-ink`]: look.style === 'faint' ? 'color-mix(in oklab, currentColor 55%, transparent)' : 'inherit',
  };
}

/** The text's variables for the chosen looks (nothing when the learner hasn't chosen). */
export function wordStyleVars(words: Settings['reader']['words']): CSSProperties {
  if (!words) return {};
  return Object.assign({}, ...(Object.keys(DEFAULT_WORDS) as WordLookState[]).map((s) => varsFor(s, words[s] ?? DEFAULT_WORDS[s]))) as CSSProperties;
}
