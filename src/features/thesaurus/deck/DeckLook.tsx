import { UiText, useUi } from '@/design/i18n/UiText';
// A deck's colour and cover picture (6-2b): chosen in Deck settings, shown in front of its name everywhere.
import { useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { db } from '@/data/db';
import { updateDeck } from '@/data/decks';
import type { Deck } from '@/data/types';
import { cx } from '@/lib/cx';
import { DECK_COLOURS, DeckGlyph } from '../common/DeckIcon';

/** A picture cut to a square and shrunk to 160 px, as a small PNG-or-JPEG blob: a cover is a thumbnail, not a photo. */
async function thumbnail(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 160;
  canvas.getContext('2d')!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 160, 160);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('That picture could not be read.'))), 'image/jpeg', 0.85));
}

export function DeckLook({ deck }: { deck: Deck }) {
  const translateUi = useUi();
  const input = useRef<HTMLInputElement>(null);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    const blob = await thumbnail(file);
    const id = crypto.randomUUID();
    await db.blobs.put({ id, kind: 'image', mime: blob.type, size: blob.size, blob, createdAt: Date.now() });
    await updateDeck(deck.id, { coverBlobId: id });
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <DeckGlyph deck={deck} size="lg" />
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={translateUi('Deck colour')}>
          <button type="button" role="radio" aria-checked={!deck.color} onClick={() => void updateDeck(deck.id, { color: undefined })} className={cx('h-7 rounded-full border px-2.5 text-[12.5px] font-semibold', !deck.color ? 'border-ink' : 'border-line text-ink-soft')}><UiText source={'Default'} /></button>
          {DECK_COLOURS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={deck.color === c}
              aria-label={c}
              onClick={() => void updateDeck(deck.id, { color: c })}
              className={cx('size-7 rounded-full border-2', deck.color === c ? 'border-ink' : 'border-transparent')}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input ref={input} type="file" accept="image/*" className="sr-only" aria-label={translateUi('Cover picture')} onChange={(e) => void pick(e.target.files?.[0]).finally(() => (e.target.value = ''))} />
        <button type="button" onClick={() => input.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line px-3 text-[13.5px] font-semibold hover:bg-surface">
          <ImagePlus size={15} aria-hidden /> {deck.coverBlobId ? translateUi('Change the picture') : translateUi('Add a cover picture')}
        </button>
        {deck.coverBlobId && (
          <button type="button" onClick={() => void updateDeck(deck.id, { coverBlobId: undefined })} className="inline-flex h-9 items-center gap-1 rounded-xl px-2 text-[13px] text-ink-soft hover:text-ink"><UiText source={'{0} Remove'} values={[<X size={14} aria-hidden />]} /></button>
        )}
      </div>
    </div>
  );
}
