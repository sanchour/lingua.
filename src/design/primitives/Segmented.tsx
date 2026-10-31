import { UiText, useUi } from '@/design/i18n/UiText';
import { useId, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** A shorter label for a phone's width. */
  short?: string;
  icon?: LucideIcon;
  /** Accessible name for icon-only options. */
  ariaLabel?: string;
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  label: string;
  block?: boolean;
}

export function Segmented<T extends string>({ value, onChange, options, label, block = false }: SegmentedProps<T>) {
  const translateUi = useUi();
  const id = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={translateUi(label)}
      className={cx('no-callout gap-1 rounded-2xl border border-line bg-sunken/70 p-1', block ? 'flex w-full' : 'inline-flex')}
    >
      {options.map((o, i) => {
        const active = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.ariaLabel ? translateUi(o.ariaLabel) : undefined}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cx(
              'relative h-9 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors duration-150 pointer-coarse:h-10',
              // Full-width rows share a phone's width: tighter padding, and a label that can't push the row off screen.
              block ? 'min-w-0 flex-auto px-2 sm:px-3.5' : 'flex-1 px-3.5',
              active ? 'text-ink' : 'text-ink-soft hover:text-ink',
            )}
          >
            {active && (
              <motion.span layoutId={`segmented-${id}`} className="segmented-lens absolute inset-0 rounded-xl bg-raised shadow-elev-1" transition={spring.snappy} />
            )}
            <span className="relative flex min-w-0 items-center justify-center gap-1.5">
              {Icon && <Icon size={16} aria-hidden className="shrink-0" />}
              {o.short ? (
                <>
                  <span className="truncate sm:hidden"><UiText source={o.short} /></span>
                  <span className="hidden truncate sm:inline"><UiText source={o.label} /></span>
                </>
              ) : (
                <span className="truncate"><UiText source={o.label} /></span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
