import { memo, useEffect, useState } from 'react';
import { AudioLines } from 'lucide-react';
import { hashString } from '@/core/hash';
import { blobUrl } from '@/data/library';
import { cx } from '@/lib/cx';

// Soft cloth colours for items without artwork (the same family as Codex's book covers).
const CLOTH = ['#6b8e78', '#b8664c', '#3f4b5c', '#8a6a4f', '#5b4b6b', '#2f3e36', '#b98a7b', '#a08b52'];

interface ArtworkProps {
  title: string;
  coverBlobId?: string;
  coverUrl?: string;
  className?: string;
  /** Rounded corners scale with the tile. */
  rounded?: string;
}

/** Square artwork: stored cover, web cover, or a quiet generated tile. */
export const Artwork = memo(function Artwork({ title, coverBlobId, coverUrl, className, rounded = 'rounded-xl' }: ArtworkProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!coverBlobId) return;
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

  const src = url ?? (failed ? null : coverUrl);
  const frame = cx('relative aspect-square shrink-0 overflow-hidden shadow-elev-1', rounded, className);
  if (src) {
    return (
      <span className={frame}>
        <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" draggable={false} className="size-full object-cover" onError={() => setFailed(true)} />
      </span>
    );
  }
  const bg = CLOTH[parseInt(hashString(title), 36) % CLOTH.length];
  return (
    <span className={cx(frame, 'grid place-items-center text-[#faf3e6]')} style={{ backgroundColor: bg }}>
      <AudioLines className="size-[42%] opacity-80" strokeWidth={1.6} aria-hidden />
    </span>
  );
});
