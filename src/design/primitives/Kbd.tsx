import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

export function Kbd({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'inverse' }) {
  return (
    <kbd
      className={cx(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1.5 font-sans text-[11px] font-semibold',
        tone === 'inverse' ? 'bg-bg/15 text-bg' : 'border border-line bg-raised text-ink-soft shadow-elev-1',
      )}
    >
      {children}
    </kbd>
  );
}
