import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cx } from '@/lib/cx';

export function Card({ className, ...rest }: ComponentPropsWithRef<'div'>) {
  return <div className={cx('rounded-3xl border border-line/70 bg-surface p-5', className)} {...rest} />;
}

export function CardTitle({ icon: Icon, children, action }: { icon?: LucideIcon; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {Icon && <Icon size={17} className="text-sage-text" aria-hidden />}
      <h3 className="flex-1 text-[13px] font-bold tracking-wide text-ink-soft uppercase">{children}</h3>
      {action}
    </div>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'sage' | 'accent' }) {
  const tones = {
    neutral: 'bg-sunken text-ink-soft',
    sage: 'bg-sage-soft text-sage-text',
    accent: 'bg-accent-soft text-accent-text',
  };
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-bold whitespace-nowrap', tones[tone])}>
      {children}
    </span>
  );
}
