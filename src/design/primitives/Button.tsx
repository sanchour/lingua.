import type { ComponentPropsWithRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { LoaderCircle } from 'lucide-react';
import { cx } from '@/lib/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  block?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-inverse text-on-inverse shadow-elev-1 hover:bg-inverse/90',
  secondary: 'bg-raised text-ink border border-line hover:border-line-strong hover:bg-surface',
  ghost: 'text-ink-soft hover:text-ink hover:bg-surface',
  accent: 'bg-accent-fill text-on-accent shadow-elev-1 hover:brightness-105',
  danger: 'text-accent-text border border-accent/40 hover:bg-accent-soft',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] rounded-lg gap-1.5 pointer-coarse:h-10',
  md: 'h-10 px-4 text-sm rounded-xl gap-2 pointer-coarse:h-11',
  lg: 'h-12 px-5 text-[15px] rounded-2xl gap-2',
};

const ICON_SIZES: Record<ButtonSize, number> = { sm: 15, md: 17, lg: 18 };

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', block = false): string {
  return cx(
    'no-callout inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap',
    'transition-[transform,background-color,border-color,box-shadow,color,filter] duration-150 ease-out',
    'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45',
    VARIANTS[variant],
    SIZES[size],
    block && 'w-full',
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  block = false,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  const iconSize = ICON_SIZES[size];
  return (
    <button
      type={type}
      className={cx(buttonClasses(variant, size, block), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <LoaderCircle size={iconSize} className="animate-spin" aria-hidden />
      ) : (
        Icon && <Icon size={iconSize} strokeWidth={2} aria-hidden />
      )}
      {children}
      {IconRight && <IconRight size={iconSize} strokeWidth={2} aria-hidden />}
    </button>
  );
}
