import { useUi } from '@/design/i18n/UiText';
import type { Ref } from 'react';
import { Search, X } from 'lucide-react';
import { cx } from '@/lib/cx';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Called by the close button, or Escape on an empty field. */
  onClose?: () => void;
  autoFocus?: boolean;
  ref?: Ref<HTMLInputElement>;
  className?: string;
}

/** A rounded search field. Escape clears it first, then closes it. */
export function SearchInput({ value, onChange, placeholder, onClose, autoFocus, ref, className }: SearchInputProps) {
  const translateUi = useUi();
  return (
    <label className={cx('flex h-11 items-center gap-2 rounded-2xl border border-line bg-raised pr-1.5 pl-3.5 transition-colors focus-within:border-line-strong', className)}>
      <Search size={17} className="shrink-0 text-ink-faint" aria-hidden />
      <input
        ref={ref}
        type="search"
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Escape') return;
          e.preventDefault();
          e.stopPropagation();
          if (value) onChange('');
          else onClose?.();
        }}
        className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:appearance-none"
      />
      {(value || onClose) && (
        <button
          type="button"
          aria-label={value ? translateUi('Clear search') : translateUi('Close search')}
          onClick={() => (value ? onChange('') : onClose?.())}
          className="grid size-8 shrink-0 place-items-center rounded-xl text-ink-faint transition-colors hover:bg-surface hover:text-ink"
        >
          <X size={16} aria-hidden />
        </button>
      )}
    </label>
  );
}

/** Accent- and case-insensitive text for matching searches. */
export function searchKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase();
}
