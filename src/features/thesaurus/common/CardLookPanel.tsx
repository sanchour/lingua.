import { Check } from 'lucide-react';
import { patchSetting } from '@/data/settings';
import type { Settings } from '@/data/settings';
import { READER_FONTS, readerFontStack } from '@/design/fonts';
import { Segmented } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { CARD_STYLES, CARD_TINTS, cardLookProps } from './cardLook';

const Label = ({ children }: { children: string }) => <p className="mb-2 text-[12px] font-bold tracking-[0.1em] text-ink-faint uppercase">{children}</p>;

/** Font, card style, colour and size for flashcards. Changes show at once on the card itself. */
export function CardLookPanel({ look, compact = false }: { look: Settings['cards']; compact?: boolean }) {
  const set = (patch: Partial<Settings['cards']>) => void patchSetting('cards', patch);
  return (
    <div className={cx('space-y-5', compact && 'w-[19rem] p-2')}>
      <div>
        <Label>Font</Label>
        <div role="radiogroup" aria-label="Card font" className="flex flex-wrap gap-1.5">
          {READER_FONTS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={look.font === f.id}
              onClick={() => set({ font: f.id })}
              className={cx(
                'no-callout rounded-xl border px-3 py-1.5 text-[15px] transition-colors',
                look.font === f.id ? 'border-accent bg-accent-soft' : 'border-line bg-raised hover:border-line-strong',
              )}
              style={{ fontFamily: readerFontStack(f) }}
            >
              {f.label.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Style</Label>
        <div role="radiogroup" aria-label="Card style" className="grid grid-cols-4 gap-2">
          {CARD_STYLES.map((s) => {
            const props = cardLookProps({ ...look, style: s.id });
            return (
              <button key={s.id} type="button" role="radio" aria-checked={look.style === s.id} onClick={() => set({ style: s.id })} className="no-callout group flex flex-col items-center gap-1.5">
                <span
                  {...props}
                  className={cx(
                    'flashcard grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-xl border text-[15px] font-semibold shadow-elev-1 transition-transform group-active:scale-95',
                    look.style === s.id ? 'border-accent ring-2 ring-accent/40' : 'border-line',
                  )}
                  style={{ ...props.style, backgroundSize: 'auto, auto', backgroundPosition: s.id === 'index' ? '0 -46px, 0 2px' : undefined }}
                >
                  Aa
                </span>
                <span className="text-[11.5px] font-semibold text-ink-soft">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label>Colour</Label>
        <div role="radiogroup" aria-label="Card colour" className="flex flex-wrap gap-2">
          {CARD_TINTS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={look.tint === t.id}
              aria-label={t.label}
              title={t.label}
              onClick={() => set({ tint: t.id })}
              className={cx(
                'no-callout grid size-9 place-items-center rounded-full border transition-transform active:scale-90',
                look.tint === t.id ? 'border-ink' : t.id === 'paper' ? 'border-line-strong' : 'border-line',
              )}
              style={{ background: t.id === 'paper' ? 'var(--surface)' : `color-mix(in oklab, ${t.color} 70%, var(--raised))` }}
            >
              {look.tint === t.id && <Check size={15} strokeWidth={3} className="text-ink" aria-hidden />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Text size</Label>
        <Segmented<Settings['cards']['size']>
          label="Card text size"
          block
          value={look.size}
          onChange={(size) => set({ size })}
          options={[
            { value: 'sm', label: 'Small' },
            { value: 'md', label: 'Medium' },
            { value: 'lg', label: 'Large' },
          ]}
        />
      </div>
    </div>
  );
}
