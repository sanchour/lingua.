import { memo, useEffect, useState } from 'react';
import { blobUrl } from '@/data/library';
import type { CoverOrnament, Text } from '@/data/types';
import { cx } from '@/lib/cx';
import { coverOf } from './covers';

interface BookCoverProps {
  text: Pick<Text, 'id' | 'title' | 'author' | 'coverBlobId' | 'lang' | 'cover'>;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/** Small decorations for designed covers, drawn in the cover's ink colour. */
function Ornament({ kind, place }: { kind: CoverOrnament; place: 'top' | 'middle' }) {
  if (place === 'top') {
    if (kind === 'stars') return <span className="mb-[6%] text-[9px] tracking-[0.4em] opacity-75" aria-hidden>✦ ✦ ✦</span>;
    if (kind === 'moon')
      return (
        <svg viewBox="0 0 24 24" className="mb-[6%] h-[11%] w-auto opacity-80" aria-hidden>
          <path d="M15.5 3.5a8.5 8.5 0 1 0 5 15.4A7 7 0 0 1 15.5 3.5Z" fill="currentColor" />
        </svg>
      );
    return null;
  }
  if (kind === 'sprig')
    return (
      <svg viewBox="0 0 48 16" className="my-[8%] w-2/5 opacity-75" aria-hidden>
        <path d="M2 8h44" stroke="currentColor" strokeWidth="1.2" />
        <path d="M24 8c-3-4-7-5-10-4 2 3 6 5 10 4Zm0 0c3-4 7-5 10-4-2 3-6 5-10 4Zm-8 0c-2-3-5-4-8-3 2 2 5 3 8 3Zm16 0c2-3 5-4 8-3-2 2-5 3-8 3Z" fill="currentColor" />
      </svg>
    );
  if (kind === 'frame') return <span className="my-[8%]" aria-hidden />;
  if (kind === 'stars' || kind === 'moon') return <span className="my-[8%] text-[8px] tracking-[0.5em] opacity-60" aria-hidden>· · ·</span>;
  return <span className="my-[8%] h-px w-1/3 bg-current/40" aria-hidden />;
}

export const BookCover = memo(function BookCover({ text, className, size = 'md' }: BookCoverProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!text.coverBlobId) return setUrl(null);
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

  const { cloth, ornament } = coverOf(text);
  const titleSize = size === 'sm' ? 'text-[11px]' : size === 'lg' ? 'text-[19px]' : 'text-[14px]';
  return (
    <div className={frame} style={{ backgroundColor: cloth.bg, color: cloth.ink }}>
      <div className={cx('absolute inset-[7%] flex flex-col items-center rounded-[3px] border border-current/35 px-[8%] py-[12%] text-center', ornament === 'frame' && 'outline outline-1 outline-offset-[3px] outline-current/25')}>
        <span className="mb-auto text-[9px] font-bold tracking-[0.2em] uppercase opacity-70">{text.lang}</span>
        <Ornament kind={ornament} place="top" />
        <span lang={text.lang} className={cx('line-clamp-4 font-serif leading-tight font-semibold', titleSize)}>
          {text.title}
        </span>
        <Ornament kind={ornament} place="middle" />
        {text.author && <span className="mt-auto line-clamp-2 text-[9px] font-semibold tracking-[0.12em] uppercase opacity-80">{text.author}</span>}
      </div>
      <span className="pointer-events-none absolute inset-y-0 left-0 w-[6%] bg-gradient-to-r from-black/20 to-transparent" aria-hidden />
    </div>
  );
});
