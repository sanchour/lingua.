import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

const TONES = {
  default: 'border border-line bg-raised text-ink-soft shadow-elev-1',
  inverse: 'bg-on-inverse/15 text-on-inverse',
  accent: 'bg-accent/15 text-accent-text',
} as const;

export function Kbd({ children, tone = 'default' }: { children: ReactNode; tone?: keyof typeof TONES }) {
  return (
    <kbd className={cx('inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1.5 font-sans text-[11px] font-semibold', TONES[tone])}>
      {children}
    </kbd>
  );
}
