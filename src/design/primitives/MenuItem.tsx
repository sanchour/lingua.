import type { LucideIcon } from 'lucide-react';
import { cx } from '@/lib/cx';

/** A row in a popover menu. */
export function MenuItem({ icon: Icon, label, onClick, danger, detail }: { icon: LucideIcon; label: string; onClick: () => void; danger?: boolean; detail?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'no-callout flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors hover:bg-surface active:bg-surface',
        danger ? 'text-accent-text' : 'text-ink',
      )}
    >
      <Icon size={16} className="shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        {label}
        {detail && <span className="block text-[12.5px] font-medium text-ink-soft">{detail}</span>}
      </span>
    </button>
  );
}
