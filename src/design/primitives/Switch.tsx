import { useId } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  id?: string;
}

export function Switch({ checked, onChange, label, disabled, id }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'no-callout relative h-[30px] w-[50px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-45',
        checked ? 'bg-sage' : 'bg-line-strong',
      )}
    >
      <motion.span
        className="absolute top-[3px] left-[3px] size-6 rounded-full bg-raised shadow-elev-1"
        initial={false}
        animate={{ x: checked ? 20 : 0 }}
        transition={spring.snappy}
      />
    </button>
  );
}

/** Settings row: title + description on the left, switch on the right. */
export function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-4 py-3">
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <div className="text-[15px] font-semibold">{title}</div>
        {description && (
          <div data-hint="" className="mt-0.5 text-[13px] leading-snug text-ink-soft">
            {description}
          </div>
        )}
      </label>
      <Switch id={id} checked={checked} onChange={onChange} label={title} disabled={disabled} />
    </div>
  );
}
