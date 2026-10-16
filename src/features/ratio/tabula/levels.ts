import type { CapabilityStatus, CefrLevel } from '@/data/types';

/** Each level has its own quiet tint: warm while beginning, sage once fluent. */
export const LEVEL_TINT: Record<CefrLevel, { bg: string; fg: string }> = {
  A0: { bg: 'var(--sunken)', fg: 'var(--ink-faint)' },
  A1: { bg: 'color-mix(in oklab, var(--accent) 14%, var(--raised))', fg: 'var(--accent-text)' },
  A2: { bg: 'color-mix(in oklab, var(--accent) 24%, var(--raised))', fg: 'var(--accent-text)' },
  B1: { bg: 'color-mix(in oklab, var(--accent) 18%, color-mix(in oklab, var(--sage) 18%, var(--raised)))', fg: 'var(--ink)' },
  B2: { bg: 'color-mix(in oklab, var(--sage) 22%, var(--raised))', fg: 'var(--sage-text)' },
  C1: { bg: 'color-mix(in oklab, var(--sage) 34%, var(--raised))', fg: 'var(--sage-text)' },
  C2: { bg: 'color-mix(in oklab, var(--sage) 50%, var(--raised))', fg: 'var(--ink)' },
};

export const STATUS_LABEL: Record<CapabilityStatus, string> = {
  native: 'Native',
  natural: 'Natural',
  background: 'Background',
  learning: 'Learning',
  'not-started': 'Not started',
};

export const STATUS_HINT: Record<CapabilityStatus, string> = {
  native: 'Your mother tongue',
  natural: 'Picked up naturally, in daily use',
  background: 'Known, not actively studied',
  learning: 'Studying it now',
  'not-started': 'On the wish list',
};

export const METHOD_OPTIONS = ['Natural', 'School', 'Internet', 'Series', 'Self-study', 'Tutor', 'Travel', 'Books'];
export const SKILLS = [
  ['reading', 'Reading'],
  ['listening', 'Listening'],
  ['speaking', 'Speaking'],
  ['writing', 'Writing'],
] as const;
