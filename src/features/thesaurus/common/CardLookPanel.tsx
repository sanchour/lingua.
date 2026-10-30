import { UiText, useUi } from '@/design/i18n/UiText';
import { Check } from 'lucide-react';
import { patchSetting } from '@/data/settings';
import type { Settings } from '@/data/settings';
import { READER_FONTS, readerFontStack } from '@/design/fonts';
import { Segmented } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { CARD_STYLES, CARD_TINTS, CARD_WIDTH, cardLookProps } from './cardLook';

const Label = ({ children }: { children: string }) => <p className="mb-2 text-[12px] font-bold tracking-[0.1em] text-ink-faint uppercase">{children}</p>;

/** Font, card style, colour, width and size for flashcards. Changes show at once on the card itself. */
export function CardLookPanel({ look, compact = false }: { look: Settings['cards']; compact?: boolean }) {
  const translateUi = useUi();
  const set = (patch: Partial<Settings['cards']>) => void patchSetting('cards', patch);
  return (
    <div className={cx('space-y-5', compact && 'w-[19rem] p-2')}>
      <div>
        <Label>{translateUi('Font')}</Label>
        <div role="radiogroup" aria-label={translateUi('Card font')} className="flex flex-wrap gap-1.5">
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
        <Label>{translateUi('Style')}</Label>
        <div role="radiogroup" aria-label={translateUi('Card style')} className="grid grid-cols-4 gap-2">
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
                ><UiText source={'Aa'} /></span>
                <span className="text-[11.5px] font-semibold text-ink-soft">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label>{translateUi('Colour')}</Label>
        <div role="radiogroup" aria-label={translateUi('Card colour')} className="flex flex-wrap gap-2">
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
        <Label>{translateUi('Card width')}</Label>
        <Segmented<Settings['cards']['width']>
          label={translateUi('Card width')}
          block
          value={look.width ?? 'normal'}
          onChange={(width) => set({ width })}
          options={[
            { value: 'thin', label: translateUi('Thin') },
            { value: 'normal', label: translateUi('Normal') },
            { value: 'wide', label: translateUi('Wide') },
          ]}
        />
        {/* The three widths side by side, to scale, the chosen one filled. */}
        <div className="mt-2.5 space-y-1" aria-hidden>
          {(['thin', 'normal', 'wide'] as const).map((w) => (
            <span
              key={w}
              className={cx('block h-1.5 rounded-full transition-colors', (look.width ?? 'normal') === w ? 'bg-accent' : 'bg-sunken')}
              style={{ width: `${(CARD_WIDTH[w] / CARD_WIDTH.wide) * 100}%` }}
            />
          ))}
        </div>
      </div>

      <div>
        <Label>{translateUi('Text size')}</Label>
        <Segmented<Settings['cards']['size']>
          label={translateUi('Card text size')}
          block
          value={look.size}
          onChange={(size) => set({ size })}
          options={[
            { value: 'sm', label: translateUi('Small') },
            { value: 'md', label: translateUi('Medium') },
            { value: 'lg', label: translateUi('Large') },
          ]}
        />
      </div>
    </div>
  );
}
