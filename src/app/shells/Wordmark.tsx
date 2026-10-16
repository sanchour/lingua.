import { cx } from '@/lib/cx';

/** App mark: open book with a terracotta ribbon (same drawing as public/logo.svg). */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="96 120 320 290" className={className} aria-hidden>
      <path d="M256 176c-36-24-86-32-134-27v200c48-5 98 3 134 27 36-24 86-32 134-27V149c-48-5-98 3-134 27z" fill="var(--surface)" />
      <path d="M302 160v130l24-18 24 18V152z" fill="var(--accent)" />
      <path
        d="M256 176c-36-24-86-32-134-27v200c48-5 98 3 134 27 36-24 86-32 134-27V149c-48-5-98 3-134 27z"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="20"
        strokeLinejoin="round"
      />
      <path d="M256 176v200" stroke="var(--ink)" strokeWidth="20" strokeLinecap="round" />
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
