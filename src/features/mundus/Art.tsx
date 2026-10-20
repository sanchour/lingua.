import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { cachedImage, findImage, imageKey } from '@/services/mundus/images';
import type { ImageQuery } from '@/services/mundus/images';
import { cx } from '@/lib/cx';

/**
 * A real picture for a pick (a cover, poster, logo or photo); the drawn fallback shows until it
 * arrives, and stays if there is none. Lookups queue four at a time and are cached.
 */
export function Art({ query, fallback, fit = 'cover', className }: { query: ImageQuery | null; fallback: ReactNode; fit?: 'cover' | 'contain'; className?: string }) {
  const key = query ? imageKey(query) : '';
  const [src, setSrc] = useState<string | null>(() => (query ? (cachedImage(query) ?? null) : null));
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
    if (!query) return setSrc(null);
    const known = cachedImage(query);
    if (known !== undefined) return setSrc(known);
    setSrc(null);
    let alive = true;
    void findImage(query).then((url) => alive && setSrc(url));
    return () => {
      alive = false;
    };
    // `key` stands for the query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <span className={cx('relative block size-full', className)}>
      {src && !broken ? (
        <img src={src} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} className={cx('size-full', fit === 'cover' ? 'object-cover' : 'bg-white object-contain p-3')} />
      ) : (
        fallback
      )}
    </span>
  );
}
