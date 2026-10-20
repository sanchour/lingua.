import { cx } from '@/lib/cx';

/** App mark: two solid pages with a ribbon cut out of one (same drawing as public/logo.svg). */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="108 140 296 252" className={className} aria-hidden>
      <path d="M250 184C216 160 166 150 116 156V352C166 346 216 356 250 380Z" fill="var(--accent)" />
      <path d="M262 184C296 160 346 150 396 156V352C346 346 296 356 262 380Z" fill="var(--accent)" />
      <path d="M318 154V262l22-16 22 16V152Z" fill="var(--surface)" />
    </svg>
  );
}

export function Wordmark({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' }) {
  return (
    <span className={cx('flex items-center gap-2', className)}>
      <LogoMark size={size === 'sm' ? 24 : 28} />
      <span className={cx('font-serif font-semibold tracking-tight', size === 'sm' ? 'text-lg' : 'text-[22px]')}>Lingua</span>
    </span>
  );
}
