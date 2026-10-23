import {
  BookMarked,
  Briefcase,
  CalendarDays,
  CloudSun,
  Coffee,
  FileSpreadsheet,
  HeartPulse,
  Lamp,
  Layers,
  Link2,
  MessageCircle,
  Package,
  Palette,
  PawPrint,
  Plane,
  Smile,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Deck } from '@/data/types';
import { cx } from '@/lib/cx';

export const THEME_ICONS: Record<string, LucideIcon> = {
  basics: MessageCircle,
  verbs: Zap,
  connectors: Link2,
  animals: PawPrint,
  food: Coffee,
  people: Users,
  home: Lamp,
  time: CalendarDays,
  describe: Palette,
  body: HeartPulse,
  travel: Plane,
  nature: CloudSun,
  feelings: Smile,
  work: Briefcase,
};

/** Each themed set has its own soft colour, mixed into the page so it suits Paper and Nocturne alike. */
export const THEME_HUES: Record<string, string> = {
  basics: '#c86d51',
  verbs: '#d49b54',
  connectors: '#8a7fb0',
  animals: '#6b8e78',
  food: '#c98a4b',
  people: '#c4707f',
  home: '#9a8466',
  time: '#5f87a8',
  describe: '#b56fa0',
  body: '#cf6a6a',
  travel: '#4f93a0',
  nature: '#6f9a5a',
  feelings: '#d18aa0',
  work: '#7c8aa8',
};

const SPARE_HUES = ['#5f87a8', '#8a7fb0', '#4f93a0', '#b56fa0', '#9a8466', '#7c8aa8', '#c4707f', '#6f9a5a'];

/** A deck's colour: its theme's, accent for words from reading, sage for the path, and a steady one of its own for the rest. */
export function deckHue(deck: Pick<Deck, 'id' | 'kind' | 'starter'>): string {
  if (deck.kind === 'mined') return 'var(--accent)';
  if (deck.kind === 'starterFrequency') return 'var(--sage)';
  if (deck.kind === 'starterTheme') return THEME_HUES[deck.starter?.theme ?? ''] ?? 'var(--sage)';
  let h = 0;
  for (const ch of deck.id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return SPARE_HUES[Math.abs(h) % SPARE_HUES.length];
}

export function deckIcon(deck: Pick<Deck, 'kind' | 'starter'>): LucideIcon {
  switch (deck.kind) {
    case 'mined':
      return BookMarked;
    case 'starterFrequency':
      return TrendingUp;
    case 'starterTheme':
      return THEME_ICONS[deck.starter?.theme ?? ''] ?? Layers;
    case 'apkg':
      return Package;
    case 'csv':
      return FileSpreadsheet;
    default:
      return Layers;
  }
}

/** The small rounded glyph in front of a deck's name, in the deck's colour. */
export function DeckGlyph({ deck, size = 'md' }: { deck: Pick<Deck, 'id' | 'kind' | 'starter'>; size?: 'md' | 'lg' }) {
  const Icon = deckIcon(deck);
  return (
    <span
      style={{ '--hue': deckHue(deck) } as CSSProperties}
      className={cx(
        'grid shrink-0 place-items-center bg-[color-mix(in_oklab,var(--hue)_18%,transparent)] text-[color-mix(in_oklab,var(--hue)_70%,var(--ink))]',
        size === 'lg' ? 'size-12 rounded-2xl' : 'size-9 rounded-xl',
      )}
    >
      <Icon size={size === 'lg' ? 22 : 17} aria-hidden />
    </span>
  );
}
