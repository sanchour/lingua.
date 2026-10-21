import { useState } from 'react';
import type { CSSProperties } from 'react';
import { AlignJustify, AlignLeft, Check, Minus, Moon, Plus, Sun } from 'lucide-react';
import { patchSetting, setSetting } from '@/data/settings';
import type { Settings, Theme, WordLook, WordLookState } from '@/data/settings';
import { READER_FONTS, readerFontStack } from '@/design/fonts';
import { Segmented, Slider } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { useDraft } from '@/features/ordo/useDraft';
import { PaperPicker } from './PaperPicker';
import { DEFAULT_WORDS, WORD_COLORS, wordStyleVars } from './wordStyles';

interface TypographyPanelProps {
  reader: Settings['reader'];
  theme: Theme;
  lang: string;
}

/** The reader's "T" panel: the text (font, size, spacing, page style, light) and how words look. */
export function TypographyPanel({ reader, theme, lang }: TypographyPanelProps) {
  const [tab, setTab] = useState<'text' | 'words'>('text');
  return (
    <div className="w-[min(340px,calc(100vw-32px))] space-y-4 p-1">
      <Segmented
        label="Show"
        block
        value={tab}
        onChange={setTab}
        options={[
          { value: 'text', label: 'Text' },
          { value: 'words', label: 'Words' },
        ]}
      />
      {tab === 'text' ? <TextSection reader={reader} theme={theme} lang={lang} /> : <WordsSection reader={reader} />}
    </div>
  );
}

function TextSection({ reader, theme, lang }: TypographyPanelProps) {
  const [lineHeight, setLineHeight] = useDraft(reader.lineHeight, (lh) => void patchSetting('reader', { lineHeight: lh }));
  const size = reader.sizePx;
  const setSize = (next: number) => void patchSetting('reader', { sizePx: Math.min(30, Math.max(15, next)) });

  return (
    <>
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

      <div>
        <p className="mb-2 text-[12px] font-bold tracking-[0.1em] text-ink-faint uppercase">{theme === 'paper' ? 'Day paper' : 'Night paper'}</p>
        <PaperPicker reader={reader} theme={theme} />
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
    </>
  );
}

const STYLE_LABEL: Record<WordLook['style'], string> = { none: 'None', underline: 'Line', dotted: 'Dots', highlight: 'Mark', faint: 'Faint' };
const ROWS: Array<{ state: WordLookState; label: string; styles: Array<WordLook['style']> }> = [
  { state: 'known', label: 'Known', styles: ['none', 'faint', 'underline', 'dotted', 'highlight'] },
  { state: 'learning', label: 'Learning', styles: ['none', 'underline', 'dotted', 'highlight'] },
  { state: 'unseen', label: 'Unseen', styles: ['none', 'underline', 'dotted', 'highlight'] },
];

/** Known, Learning and Unseen: a style and a colour each, with one live sample. */
function WordsSection({ reader }: { reader: Settings['reader'] }) {
  const looks = { ...DEFAULT_WORDS, ...reader.words };
  // Unseen's "None" is the usual "highlight unseen words" switch turned off.
  const styleOf = (state: WordLookState) => (state === 'unseen' && !reader.highlightUnseen ? 'none' : looks[state].style);
  const set = (state: WordLookState, change: Partial<WordLook>) => {
    if (state === 'unseen' && change.style === 'none') return void patchSetting('reader', { highlightUnseen: false });
    void patchSetting('reader', { words: { ...reader.words, [state]: { ...looks[state], ...change } }, ...(state === 'unseen' ? { highlightUnseen: true } : {}) });
  };
  const usual = !reader.words && reader.highlightUnseen;
  const sample = {
    ...wordStyleVars(looks),
    '--reader-font': readerFontStack(READER_FONTS.find((f) => f.id === reader.font) ?? READER_FONTS[0]),
    '--reader-size': '17px',
    '--reader-lh': '1.7',
  } as CSSProperties;

  return (
    <>
      <p className={cx('reader-flow rounded-xl bg-bg px-3.5 py-3', reader.highlightUnseen && 'hl-unseen')} style={sample}>
        A <span className="w" data-s="1">known</span> word, one you’re <span className="w" data-s="2">learning</span>, and a <span className="w" data-s="0">new</span> one.
      </p>
      {ROWS.map(({ state, label, styles }) => {
        const style = styleOf(state);
        const tinted = style !== 'none' && style !== 'faint';
        return (
          <div key={state}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <p className="text-[13px] font-semibold">{label}</p>
              <div role="radiogroup" aria-label={`${label}: colour`} className={cx('flex gap-1.5 transition-opacity', !tinted && 'pointer-events-none opacity-35')}>
                {WORD_COLORS.map((c) => {
                  const on = looks[state].color === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={c.label}
                      title={c.label}
                      tabIndex={tinted ? undefined : -1}
                      onClick={() => set(state, { color: c.id })}
                      className={cx('grid size-5 place-items-center rounded-full text-white transition-transform hover:scale-110', on && 'ring-2 ring-ink/60 ring-offset-2 ring-offset-raised')}
                      style={{ background: c.css }}
                    >
                      {on && <Check size={11} strokeWidth={3} aria-hidden />}
                    </button>
                  );
                })}
              </div>
            </div>
            <Segmented<WordLook['style']> label={`${label}: style`} block value={style} onChange={(v) => set(state, { style: v })} options={styles.map((v) => ({ value: v, label: STYLE_LABEL[v] }))} />
          </div>
        );
      })}
      {!usual && (
        <button type="button" onClick={() => void patchSetting('reader', { words: undefined, highlightUnseen: true })} className="text-[13px] font-semibold text-accent-text hover:underline">
          Back to the usual look
        </button>
      )}
    </>
  );
}
