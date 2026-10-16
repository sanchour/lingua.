import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { useLayout } from '@/design/hooks/useLayout';
import { cx } from '@/lib/cx';

/** "‹ Section" above a sub-page on wide screens. Phones already have the top bar's back button. */
export function BackLink({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  const { layout } = useLayout();
  if (layout === 'compact') return null;
  return (
    <Link to={to} className={cx('mb-5 inline-flex items-center gap-1 rounded-lg py-1 pr-2 text-sm font-semibold text-ink-soft transition-colors hover:text-ink', className)}>
      <ChevronLeft size={16} aria-hidden /> {children}
    </Link>
  );
}
