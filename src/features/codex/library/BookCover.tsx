import { memo, useEffect, useState } from 'react';
import { hashString } from '@/core/hash';
import { blobUrl } from '@/data/library';
import type { Text } from '@/data/types';
import { cx } from '@/lib/cx';

// Typographic covers for books without artwork: cloth colours, a double rule, serif title.
const CLOTH = [
  { bg: '#6b8e78', ink: '#faf6f0' },
  { bg: '#b8664c', ink: '#fff8f0' },
  { bg: '#3f4b5c', ink: '#f2ece1' },
  { bg: '#8a6a4f', ink: '#faf1e4' },
  { bg: '#d2b07f', ink: '#2a2420' },
  { bg: '#5b4b6b', ink: '#f2ece1' },
  { bg: '#2f3e36', ink: '#eae3d5' },
  { bg: '#b98a7b', ink: '#2a2420' },
];

interface BookCoverProps {
  text: Pick<Text, 'id' | 'title' | 'author' | 'coverBlobId' | 'lang'>;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BookCover = memo(function BookCover({ text, className, size = 'md' }: BookCoverProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!text.coverBlobId) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    void blobUrl(text.coverBlobId).then((u) => {
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
  }, [text.coverBlobId]);

  const frame = cx('relative aspect-[2/3] overflow-hidden rounded-[6px] shadow-elev-2', className);
  if (url) {
    return (
      <div className={frame}>
        <img src={url} alt="" className="size-full object-cover" draggable={false} />
        <span className="pointer-events-none absolute inset-y-0 left-0 w-[6%] bg-gradient-to-r from-black/20 to-transparent" aria-hidden />
      </div>
    );
  }

  const cloth = CLOTH[parseInt(hashString(text.title), 36) % CLOTH.length];
  const titleSize = size === 'sm' ? 'text-[11px]' : size === 'lg' ? 'text-[19px]' : 'text-[14px]';
  return (
    <div className={frame} style={{ backgroundColor: cloth.bg, color: cloth.ink }}>
      <div className="absolute inset-[7%] flex flex-col items-center rounded-[3px] border border-current/35 px-[8%] py-[12%] text-center">
        <span className="mb-auto text-[9px] font-bold tracking-[0.2em] uppercase opacity-70">{text.lang}</span>
        <span lang={text.lang} className={cx('line-clamp-4 font-serif leading-tight font-semibold', titleSize)}>
          {text.title}
        </span>
        <span className="my-[8%] h-px w-1/3 bg-current/40" aria-hidden />
        {text.author && <span className="mt-auto line-clamp-2 text-[9px] font-semibold tracking-[0.12em] uppercase opacity-80">{text.author}</span>}
      </div>
      <span className="pointer-events-none absolute inset-y-0 left-0 w-[6%] bg-gradient-to-r from-black/20 to-transparent" aria-hidden />
    </div>
  );
});
