import { useEffect, useState } from 'react';
import { Check, ImagePlus, X } from 'lucide-react';
import type { CoverDesign, Text } from '@/data/types';
import { cx } from '@/lib/cx';
import { pickFile } from '@/services/files/files';
import { BookCover } from './BookCover';
import { CLOTHS, ORNAMENTS } from './covers';

interface CoverDesignerProps {
  text: Pick<Text, 'id' | 'title' | 'author' | 'lang'> & { coverBlobId?: string };
  design: CoverDesign;
  onDesign: (design: CoverDesign) => void;
  /** A picture chosen here but not saved yet (new texts). */
  image: Blob | null;
  onImage: (image: Blob | null) => void;
  /** The text already has a stored picture (editing). */
  hasStoredImage?: boolean;
  onRemoveStored?: () => void;
}

const Label = ({ children }: { children: string }) => <p className="mb-2 text-[12px] font-bold tracking-[0.1em] text-ink-faint uppercase">{children}</p>;

/** A book cover of your own: a picture, or a cloth colour with a small ornament. */
export function CoverDesigner({ text, design, onDesign, image, onImage, hasStoredImage = false, onRemoveStored }: CoverDesignerProps) {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!image) return setPreview(null);
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);
  const showsPicture = Boolean(preview) || hasStoredImage;

  return (
    <div className="flex flex-col gap-5 sm:flex-row lg:flex-col">
      <div className="w-36 shrink-0 self-center sm:self-start lg:w-44">
        {preview ? (
          <div className="relative aspect-[2/3] overflow-hidden rounded-[6px] shadow-elev-2">
            <img src={preview} alt="" className="size-full object-cover" />
          </div>
        ) : (
          <BookCover text={{ ...text, coverBlobId: hasStoredImage ? text.coverBlobId : undefined, cover: design }} size="lg" />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-4">
        <div className={cx('transition-opacity', showsPicture && 'pointer-events-none opacity-40')}>
          <Label>Cloth</Label>
          <div role="radiogroup" aria-label="Cover colour" className="flex flex-wrap gap-1.5">
            {CLOTHS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={design.cloth === c.id}
                aria-label={c.name}
                title={c.name}
                onClick={() => onDesign({ ...design, cloth: c.id })}
                className={cx('grid size-8 place-items-center rounded-lg shadow-elev-1 transition-transform active:scale-90', design.cloth === c.id && 'ring-2 ring-accent ring-offset-2 ring-offset-surface')}
                style={{ background: c.bg, color: c.ink }}
              >
                {design.cloth === c.id && <Check size={14} strokeWidth={3} aria-hidden />}
              </button>
            ))}
          </div>
        </div>

        <div className={cx('transition-opacity', showsPicture && 'pointer-events-none opacity-40')}>
          <Label>Ornament</Label>
          <div role="radiogroup" aria-label="Cover ornament" className="flex flex-wrap gap-1.5">
            {ORNAMENTS.map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={design.ornament === o.id}
                onClick={() => onDesign({ ...design, ornament: o.id })}
                className={cx(
                  'rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors',
                  design.ornament === o.id ? 'border-accent/40 bg-accent-soft text-accent-text' : 'border-line bg-raised text-ink-soft hover:border-line-strong',
                )}
              >
                {o.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              const file = await pickFile('image/*');
              if (file) onImage(file);
            }}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-line bg-raised px-3 text-[13px] font-semibold transition-colors hover:border-line-strong"
          >
            <ImagePlus size={15} aria-hidden /> {showsPicture ? 'Another picture' : 'Use a picture'}
          </button>
          {showsPicture && (
            <button
              type="button"
              onClick={() => (preview ? onImage(null) : onRemoveStored?.())}
              className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-surface hover:text-ink"
            >
              <X size={15} aria-hidden /> Use a cloth cover
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
