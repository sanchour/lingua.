import { AlignJustify, AlignLeft, Minus, Moon, Plus, Sun } from 'lucide-react';
import { patchSetting, setSetting } from '@/data/settings';
import type { Settings, Theme } from '@/data/settings';
import { READER_FONTS, readerFontStack } from '@/design/fonts';
import { Segmented, Slider } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { useDraft } from '@/features/ordo/useDraft';

interface TypographyPanelProps {
  reader: Settings['reader'];
  theme: Theme;
  lang: string;
}

/** The reader's "Aa" panel: font, size, spacing, page style, light. */
export function TypographyPanel({ reader, theme, lang }: TypographyPanelProps) {
  const [lineHeight, setLineHeight] = useDraft(reader.lineHeight, (lh) => void patchSetting('reader', { lineHeight: lh }));
  const size = reader.sizePx;
  const setSize = (next: number) => void patchSetting('reader', { sizePx: Math.min(30, Math.max(15, next)) });

  return (
    <div className="w-[min(340px,calc(100vw-32px))] space-y-4 p-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Smaller text"
          onClick={() => setSize(size - 1)}
          className="grid h-11 flex-1 place-items-center rounded-xl bg-sunken text-ink transition-transform active:scale-95"
        >
          <Minus size={18} aria-hidden />
        </button>
        <span className="w-14 text-center font-serif text-lg tabular-nums" aria-live="polite">
          {size}
        </span>
        <button
          type="button"
          aria-label="Larger text"
          onClick={() => setSize(size + 1)}
          className="grid h-11 flex-1 place-items-center rounded-xl bg-sunken text-ink transition-transform active:scale-95"
        >
          <Plus size={18} aria-hidden />
        </button>
      </div>

      <div role="radiogroup" aria-label="Reading font" className="grid grid-cols-2 gap-1.5">
        {READER_FONTS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={f.id === reader.font}
            onClick={() => void patchSetting('reader', { font: f.id })}
            lang={lang}
            className={cx(
              'h-12 truncate rounded-xl border px-3 text-[16px] transition-[background-color,border-color] duration-150',
              f.id === reader.font ? 'border-accent bg-accent-soft' : 'border-line bg-raised hover:border-line-strong',
            )}
            style={{ fontFamily: readerFontStack(f) }}
          >
            {f.label.replace(' Hyperlegible', '')}
          </button>
        ))}
      </div>

      <Slider label="Line spacing" value={lineHeight} min={1.3} max={2.1} step={0.05} onChange={setLineHeight} format={(v) => v.toFixed(2)} />

      <div className="grid grid-cols-2 gap-2">
        <Segmented
          label="Page style"
          block
          value={reader.mode}
          onChange={(mode) => void patchSetting('reader', { mode })}
          options={[
            { value: 'paged', label: 'Pages' },
            { value: 'scroll', label: 'Scroll' },
          ]}
        />
        <Segmented
          label="Light"
          block
          value={theme}
          onChange={(t) => void setSetting('theme', t)}
          options={[
            { value: 'paper', label: '', icon: Sun, ariaLabel: 'Paper' },
            { value: 'nocturne', label: '', icon: Moon, ariaLabel: 'Nocturne' },
          ]}
        />
      </div>

      <Segmented
        label="Text alignment"
        block
        value={reader.justify ? 'justify' : 'left'}
        onChange={(v) => void patchSetting('reader', { justify: v === 'justify' })}
        options={[
          { value: 'left', label: 'Ragged', icon: AlignLeft },
          { value: 'justify', label: 'Justified', icon: AlignJustify },
        ]}
      />
    </div>
  );
}
