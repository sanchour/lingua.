import type { ReactNode } from 'react';
import { ArrowDownUp, Check } from 'lucide-react';
import { cx } from '@/lib/cx';
import { IconButton } from './IconButton';
import { Popover } from './Popover';

interface SortMenuProps<T extends string> {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  /** Extra controls under the list (e.g. a view switch). */
  children?: ReactNode;
}

/** A sort icon that opens a short list of orderings. */
export function SortMenu<T extends string>({ value, options, onChange, children }: SortMenuProps<T>) {
  return (
    <Popover
      label="Sort"
      placement="bottom-end"
      className="w-60"
      trigger={(props) => <IconButton {...props} icon={ArrowDownUp} label="Sort" />}
    >
      {(close) => (
        <div>
          <p className="px-3 pt-1.5 pb-1 text-[11.5px] font-bold tracking-[0.1em] text-ink-faint uppercase">Sort by</p>
          <div role="radiogroup" aria-label="Sort by">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={o.value === value}
                onClick={() => {
                  onChange(o.value);
                  close();
                }}
                className={cx(
                  'no-callout flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors hover:bg-surface',
                  o.value === value ? 'text-ink' : 'text-ink-soft',
                )}
              >
                <span className="min-w-0 flex-1">{o.label}</span>
                {o.value === value && <Check size={16} className="shrink-0 text-accent-text" aria-hidden />}
              </button>
            ))}
          </div>
          {children && <div className="mt-1.5 border-t border-line px-1 pt-2.5 pb-1">{children}</div>}
        </div>
      )}
    </Popover>
  );
}
