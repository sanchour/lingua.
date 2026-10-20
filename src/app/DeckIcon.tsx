import type { LucideIcon } from 'lucide-react';

/** Thesaurus's icon: a deck of cards, the front one with a word on it. Drawn like Lucide's icons. */
export const DeckIcon = (({ size = 24, strokeWidth = 2, className }: { size?: number | string; strokeWidth?: number | string; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M8 5.5V4.5A1.5 1.5 0 0 1 9.5 3h9A1.5 1.5 0 0 1 20 4.5v9a1.5 1.5 0 0 1-1.5 1.5H18" />
    <rect x="4" y="7" width="13" height="14" rx="2" />
    <path d="M7.5 17.5 10.5 10l3 7.5M8.6 15h3.8" />
  </svg>
)) as unknown as LucideIcon;
