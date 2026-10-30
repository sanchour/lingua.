// 6-15: The Ask button (where learning happens).
// Contextual button that triggers the tutor side panel.
import type { ButtonHTMLAttributes } from 'react';
import { Sparkles } from 'lucide-react';
import type { TutorContext } from '@/core/tutor/types';
import { Button } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { useUI } from '@/state/ui';

export interface AskButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  context?: TutorContext;
  label?: string;
  variant?: 'floating' | 'inline' | 'subtle';
  size?: 'sm' | 'md';
}

export function AskButton({
  context,
  label = 'Ask',
  variant = 'inline',
  size = 'sm',
  className,
  ...props
}: AskButtonProps) {
  const openTutor = useUI((s) => s.openTutor);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    openTutor(context);
    props.onClick?.(e);
  };

  if (variant === 'floating') {
    return (
      <button
        type="button"
        onClick={handleClick}
        title="Ask the tutor (Alt+T)"
        aria-label="Ask the tutor"
        className={cx(
          'fixed right-5 bottom-5 z-40 flex items-center gap-2 rounded-full border border-line bg-raised px-4 py-2.5 font-medium text-ink shadow-elev-3 backdrop-blur-md transition-all hover:scale-105 hover:border-line-strong hover:bg-paper active:scale-95',
          className,
        )}
      >
        <Sparkles size={16} className="text-accent-text" aria-hidden />
        <span className="text-[13.5px] font-semibold">{label}</span>
      </button>
    );
  }

  if (variant === 'subtle') {
    return (
      <button
        type="button"
        onClick={handleClick}
        title="Ask the tutor about this (Alt+T)"
        aria-label="Ask the tutor"
        className={cx(
          'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-ink-soft transition-colors hover:bg-accent-soft/30 hover:text-accent-text',
          className,
        )}
      >
        <Sparkles size={13} className="text-accent-text" aria-hidden />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <Button
      variant="secondary"
      size={size}
      icon={Sparkles}
      onClick={handleClick}
      title="Ask the tutor (Alt+T)"
      className={cx('font-medium', className)}
    >
      {label}
    </Button>
  );
}
