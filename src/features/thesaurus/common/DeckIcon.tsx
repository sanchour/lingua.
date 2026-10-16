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

/** The small rounded glyph in front of a deck's name. */
export function DeckGlyph({ deck, size = 'md' }: { deck: Pick<Deck, 'kind' | 'starter'>; size?: 'md' | 'lg' }) {
  const Icon = deckIcon(deck);
  const tone = deck.kind === 'mined' ? 'bg-accent-soft text-accent-text' : 'bg-sage-soft text-sage-text';
  return (
    <span className={cx('grid shrink-0 place-items-center', size === 'lg' ? 'size-12 rounded-2xl' : 'size-9 rounded-xl', tone)}>
      <Icon size={size === 'lg' ? 22 : 17} aria-hidden />
    </span>
  );
}
