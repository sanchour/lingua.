import { useState } from 'react';
import { appIconUrl, MARKS } from '@/core/mundus/marks';
import { serviceById } from '@/core/mundus/services';
import type { StreamingService } from '@/core/mundus/services';
import { cx } from '@/lib/cx';

const tile = 'inline-grid shrink-0 place-items-center overflow-hidden rounded-[28%] ring-1 ring-black/10 ring-inset dark:ring-white/15';

/** A streaming service's real mark, at one size and corner: its drawing, its app icon, or (offline) its initials. */
export function ServiceMark({ service, size = 22, className }: { service: StreamingService | string; size?: number; className?: string }) {
  const s = typeof service === 'string' ? serviceById(service) : service;
  const [failed, setFailed] = useState(false);
  if (!s) return null;
  const art = MARKS[s.id];
  if (art && 'glyph' in art) {
    return (
      <span aria-hidden className={cx(tile, className)} style={{ width: size, height: size, background: art.bg }}>
        <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill={art.fg}>
          <path d={art.glyph} />
        </svg>
      </span>
    );
  }
  if (art && !failed) {
    return (
      <span aria-hidden className={cx(tile, 'bg-surface', className)} style={{ width: size, height: size }}>
        <img src={appIconUrl(art.app, size > 32 ? 128 : 64)} alt="" width={size} height={size} loading="lazy" decoding="async" onError={() => setFailed(true)} className="size-full object-cover" />
      </span>
    );
  }
  const letters = s.mono.length;
  return (
    <span aria-hidden className={cx(tile, 'font-bold leading-none text-white', className)} style={{ width: size, height: size, background: s.hue, fontSize: size * (letters >= 3 ? 0.3 : letters === 2 ? 0.38 : 0.5) }}>
      {s.mono}
    </span>
  );
}
