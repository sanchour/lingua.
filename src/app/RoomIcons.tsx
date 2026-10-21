import type { LucideIcon } from 'lucide-react';

/** Sonus et Visio's icon: headphones over a screen with a play mark. Drawn like Lucide's icons. */
export const SonusVisioIcon = (({ size = 24, strokeWidth = 2, className }: { size?: number | string; strokeWidth?: number | string; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M5 11V9a7 7 0 0 1 14 0v2" />
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <path d="m10.5 14 3.5 2-3.5 2z" />
  </svg>
)) as unknown as LucideIcon;
