import { useId } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; disabled?: boolean }[];
  hideLabel?: boolean;
}

/** Native select (the iOS wheel picker on phones), styled to match. */
export function Select<T extends string>({ label, value, onChange, options, hideLabel = false }: SelectProps<T>) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'mb-1.5 block text-[13px] font-bold tracking-wide text-ink-soft uppercase'}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-line bg-raised pr-10 pl-3.5 text-[15px] font-medium text-ink transition-colors hover:border-line-strong"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={18} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-soft" aria-hidden />
      </div>
    </div>
  );
}
