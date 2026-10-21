import { memo, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Clapperboard } from 'lucide-react';
import { hashString } from '@/core/hash';
import { blobUrl } from '@/data/library';
import { cx } from '@/lib/cx';

// Deep screening-room colours for videos without a poster frame.
const VELVET = ['#3f4b5c', '#5b4b6b', '#2f3e36', '#6b3f3a', '#4a5a4f', '#3a3550', '#5c4a3a', '#2e4650'];

/** A 16:9 poster (or, with `fill`, one filling its box): the frame captured when the video was added, or a quiet generated tile. */
export const Poster = memo(function Poster({ title, coverBlobId, className, children, fill = false }: { title: string; coverBlobId?: string; className?: string; children?: ReactNode; fill?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!coverBlobId) return setUrl(null);
    let objectUrl: string | null = null;
    let cancelled = false;
    void blobUrl(coverBlobId).then((u) => {
      if (cancelled) {
        if (u) URL.revokeObjectURL(u);
        return;
      }
      objectUrl = u;
      setUrl(u);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [coverBlobId]);

  const bg = VELVET[parseInt(hashString(title), 36) % VELVET.length];
  return (
    <span className={cx('relative block overflow-hidden rounded-2xl shadow-elev-1', fill ? 'size-full' : 'aspect-video', className)} style={url ? undefined : { backgroundColor: bg }}>
      {url ? (
        <img src={url} alt="" loading="lazy" draggable={false} className="size-full object-cover" />
      ) : (
        <span className="grid size-full place-items-center text-[#faf3e6]">
          <Clapperboard className="size-[22%] opacity-70" strokeWidth={1.5} aria-hidden />
        </span>
      )}
      {children}
    </span>
  );
});
