import type { CSSProperties } from 'react';
import type { CardStyleId, CardTintId, CardWidth, Settings } from '@/data/settings';
import { getReaderFont, readerFontStack } from '@/design/fonts';

export const CARD_STYLES: Array<{ id: CardStyleId; label: string }> = [
  { id: 'plain', label: 'Plain' },
  { id: 'index', label: 'Index card' },
  { id: 'bookplate', label: 'Bookplate' },
  { id: 'linen', label: 'Linen' },
];

/** Soft, bookish colours: cloth covers and old paper rather than bright fills. */
export const CARD_TINTS: Array<{ id: CardTintId; label: string; color: string }> = [
  { id: 'paper', label: 'Paper', color: 'var(--raised)' },
  { id: 'cream', label: 'Cream', color: '#e3bf7f' },
  { id: 'sage', label: 'Sage', color: '#7d9f88' },
  { id: 'rose', label: 'Rose', color: '#d0918b' },
  { id: 'sky', label: 'Sky', color: '#86a9cc' },
  { id: 'lavender', label: 'Lavender', color: '#a596cf' },
  { id: 'butter', label: 'Butter', color: '#e3cb6a' },
];

const SCALE = { sm: 0.88, md: 1, lg: 1.16 } as const;

/** A flashcard's widest, in px: thin, normal (the width cards always had) and wide. */
export const CARD_WIDTH: Record<CardWidth, number> = { thin: 460, normal: 576, wide: 840 };

/** The width a card is shown at: its deck's own, or the one chosen for every card. */
export const cardWidth = (look: CardLook, deckWidth?: CardWidth): number => CARD_WIDTH[deckWidth ?? look.width ?? 'normal'];

export type CardLook = Settings['cards'];

/** Attributes for a .flashcard element (see styles/cards.css). */
export function cardLookProps(look: CardLook, lang?: string): { 'data-look': string; 'data-tint': string; style: CSSProperties } {
  return {
    'data-look': look.style,
    'data-tint': look.tint,
    style: {
      '--card-tint': CARD_TINTS.find((t) => t.id === look.tint)?.color,
      '--card-font': readerFontStack(getReaderFont(look.font), lang),
      '--card-scale': SCALE[look.size],
    } as CSSProperties,
  };
}
