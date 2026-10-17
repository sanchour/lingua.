import { useState } from 'react';
import { Music2 } from 'lucide-react';
import { cx } from '@/lib/cx';

/** A song's album art, or a quiet tinted square with a note when there is none (or it fails). */
export function SongArt({ url, title, className, rounded = 'rounded-xl', size = 600 }: { url?: string; title: string; className?: string; rounded?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = url?.replace(/\/\d+x\d+bb\.jpg$/, `/${size}x${size}bb.jpg`);
  return (
    <span className={cx('relative block aspect-square shrink-0 overflow-hidden bg-sunken', rounded, className)}>
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setFailed(true)} className="absolute inset-0 size-full object-cover" />
      ) : (
        <span className="absolute inset-0 grid place-items-center bg-[color-mix(in_oklab,var(--song,var(--accent))_22%,var(--surface))] text-[color-mix(in_oklab,var(--song,var(--accent))_70%,var(--ink))]" aria-label={title}>
          <Music2 size={22} aria-hidden />
        </span>
      )}
    </span>
  );
}
