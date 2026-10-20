import { serviceById } from '@/core/mundus/services';
import type { StreamingService } from '@/core/mundus/services';
import { cx } from '@/lib/cx';

/** A streaming service as a small coloured tile with its initials (no logos: they're trademarks). */
export function ServiceMark({ service, size = 22, className }: { service: StreamingService | string; size?: number; className?: string }) {
  const s = typeof service === 'string' ? serviceById(service) : service;
  if (!s) return null;
  const letters = s.mono.length;
  return (
    <span
      aria-hidden
      className={cx('inline-grid shrink-0 place-items-center rounded-[28%] font-bold leading-none text-white ring-1 ring-black/10 ring-inset dark:ring-white/15', className)}
      style={{ width: size, height: size, background: s.hue, fontSize: size * (letters >= 3 ? 0.3 : letters === 2 ? 0.38 : 0.5) }}
    >
      {s.mono}
    </span>
  );
}
