import {
  Apple,
  BedDouble,
  BookMarked,
  Briefcase,
  Building2,
  CalendarDays,
  CircleQuestionMark,
  Clapperboard,
  CloudSun,
  Coffee,
  CookingPot,
  Dumbbell,
  FileSpreadsheet,
  Guitar,
  Headphones,
  Heart,
  HeartPulse,
  Lamp,
  Languages,
  Laptop,
  Layers,
  Link2,
  Megaphone,
  MessageCircle,
  Package,
  Palette,
  PartyPopper,
  PawPrint,
  Plane,
  Rocket,
  Shirt,
  ShoppingBag,
  Shuffle,
  Signpost,
  Smile,
  Stethoscope,
  ThumbsUp,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Volleyball,
  WandSparkles,
  Waves,
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
  food: Apple,
  people: Users,
  home: Lamp,
  time: CalendarDays,
  describe: Palette,
  body: HeartPulse,
  travel: Plane,
  nature: CloudSun,
  feelings: Smile,
  work: Briefcase,
  clothes: Shirt,
  city: Building2,
  shopping: ShoppingBag,
  health: Stethoscope,
  sport: Dumbbell,
  hobbies: Guitar,
  tech: Laptop,
  kitchen: CookingPot,
  directions: Signpost,
  restaurant: UtensilsCrossed,
  hotel: BedDouble,
  cafe: Coffee,
  film: Clapperboard,
  football: Volleyball,
  love: Heart,
  compliments: ThumbsUp,
  exclamations: Megaphone,
  festivals: PartyPopper,
  sea: Waves,
  space: Rocket,
  fantasy: WandSparkles,
  irregular: Shuffle,
  questions: CircleQuestionMark,
  cognates: Languages,
  heard: Headphones,
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
  clothes: '#a77bb0',
  city: '#7f8c9e',
  shopping: '#c98a6b',
  health: '#d0757a',
  sport: '#5f9a86',
  hobbies: '#c49a4f',
  tech: '#5d8fb5',
  kitchen: '#b8845a',
  directions: '#6f9fa0',
  restaurant: '#c46a5a',
  hotel: '#8b7fae',
  cafe: '#a07858',
  film: '#8d6fa8',
  football: '#5a9a5f',
  love: '#d27a92',
  compliments: '#d39a6a',
  exclamations: '#d1a04a',
  festivals: '#c7697f',
  sea: '#4a90a8',
  space: '#5e6fa8',
  fantasy: '#9a7bc0',
  irregular: '#c08a52',
  questions: '#7c8fb8',
  cognates: '#5f9b9b',
  heard: '#b06f9a',
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
