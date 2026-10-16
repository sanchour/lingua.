import type { ComponentPropsWithRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Placement } from '@floating-ui/react-dom';
import { cx } from '@/lib/cx';
import { Tooltip } from './Tooltip';

export interface IconButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  icon: LucideIcon;
  /** Accessible name; also shown as a tooltip on mouse devices. */
  label: string;
  shortcut?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'soft' | 'solid';
  active?: boolean;
  tooltipPlacement?: Placement;
  showTooltip?: boolean;
}

const SIZES = { sm: 'size-8 rounded-lg pointer-coarse:size-10', md: 'size-10 rounded-xl', lg: 'size-11 rounded-2xl' } as const;
const ICONS = { sm: 16, md: 19, lg: 20 } as const;
const VARIANTS = {
  ghost: 'text-ink-soft hover:text-ink hover:bg-surface',
  soft: 'bg-surface text-ink hover:bg-sunken',
  solid: 'bg-inverse text-on-inverse hover:bg-inverse/90',
} as const;

export function IconButton({
  icon: Icon,
  label,
  shortcut,
  size = 'md',
  variant = 'ghost',
  active = false,
  tooltipPlacement = 'bottom',
  showTooltip = true,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  const button = (
    <button
      type={type}
      aria-label={label}
      className={cx(
        'no-callout inline-flex shrink-0 items-center justify-center',
        'transition-[transform,background-color,color] duration-150 active:scale-[0.92] disabled:pointer-events-none disabled:opacity-40',
        SIZES[size],
        active ? 'bg-accent-soft text-accent-text' : VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      <Icon size={ICONS[size]} strokeWidth={2} aria-hidden />
    </button>
  );
  if (!showTooltip) return button;
  return (
    <Tooltip label={label} shortcut={shortcut} placement={tooltipPlacement}>
      {button}
    </Tooltip>
  );
}
