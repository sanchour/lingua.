import { memo, useEffect, useState } from 'react';
import { blobUrl } from '@/data/library';
import type { ChapterModel } from './model';

/**
 * The chapter as static DOM: one span per word with its form (data-n), offset in the paragraph
 * (data-o) and state (data-s). Rendered once per chapter; after that the word engine updates
 * spans directly, so word clicks never re-render this tree.
 */
export const ChapterBody = memo(function ChapterBody({ model, lang }: { model: ChapterModel; lang: string }) {
  return (
    <>
      {model.blocks.map(({ block, tokens }, b) => {
        if (block.t === 'img') return <ReaderImage key={b} index={b} blobId={block.blobId} alt={block.alt} />;
        const children = tokens!.map((t, i) =>
          t.isWord ? (
            <span key={i} className="w" data-n={t.norm} data-o={t.start} data-s={model.states.get(t.norm!) ?? 0}>
              {t.text}
            </span>
          ) : (
            t.text
          ),
        );
        if (block.t === 'h') {
          return (
            <h2 key={b} data-b={b} lang={lang}>
              {children}
            </h2>
          );
        }
        if (block.t === 'quote') {
          return (
            <blockquote key={b} data-b={b} lang={lang}>
              {children}
            </blockquote>
          );
        }
        return (
          <p key={b} data-b={b} lang={lang}>
            {children}
          </p>
        );
      })}
    </>
  );
});

function ReaderImage({ blobId, alt, index }: { blobId: string; alt?: string; index: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    void blobUrl(blobId).then((u) => {
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
  }, [blobId]);
  return (
    <figure data-b={index} className="reader-figure">
      {url && <img src={url} alt={alt ?? ''} draggable={false} />}
    </figure>
  );
}
