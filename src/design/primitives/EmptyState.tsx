import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-8 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-sage-soft text-sage-text">
        <Icon size={24} aria-hidden />
      </div>
      <h3 className={title.endsWith('?') ? 'asks font-display text-lg font-semibold' : 'font-display text-lg font-semibold'}>{title}</h3>
      <span className="flourish-quiet mt-3" aria-hidden />
      {children && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-soft">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
