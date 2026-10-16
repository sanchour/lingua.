import { BookOpenText, Check } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useApp } from '@/app/context';
import { resolveTheme } from '@/app/theme';
import { getLanguage, LANGUAGES } from '@/core/lang/languages';
import type { Script } from '@/core/lang/languages';
import { patchSetting } from '@/data/settings';
import type { Settings } from '@/data/settings';
import { fallbackFamily, getReaderFont, READER_FONTS, readerFontStack } from '@/design/fonts';
import { useMediaQuery } from '@/design/hooks/useMediaQuery';
import { darkPaper, lightPaper, paperStyle } from '@/design/papers';
import { PaperPicker } from '@/features/codex/reader/PaperPicker';
import { Badge, Segmented, Slider, ToggleRow } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { SettingsSection } from '../SettingsSection';
import { useDraft } from '../useDraft';

const SCRIPT_NAMES: Record<Script, string> = { Latn: 'Latin', Cyrl: 'Cyrillic', Grek: 'Greek' };
const PREVIEW_SCRIPTS: Script[] = ['Latn', 'Cyrl', 'Grek'];

export function ReadingSection({ reader, lang }: { reader: Settings['reader']; lang: string }) {
  const [size, setSize] = useDraft(reader.sizePx, (sizePx) => void patchSetting('reader', { sizePx }));
  const [lineHeight, setLineHeight] = useDraft(reader.lineHeight, (lh) => void patchSetting('reader', { lineHeight: lh }));
  const font = getReaderFont(reader.font);
  const target = getLanguage(lang) ?? LANGUAGES[0];
  const fallback = fallbackFamily(font, target.script);
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  const theme = resolveTheme(useApp().settings.theme, systemDark);
  const paper = theme === 'paper' ? lightPaper(reader.paperLight) : darkPaper(reader.paperDark);

  return (
    <SettingsSection id="reading" icon={BookOpenText} title="Reading" description="How text looks in Codex. The preview uses your current language.">
      <div
        lang={target.code}
        className="rounded-2xl border border-line bg-bg px-5 py-4 text-ink transition-colors duration-200"
        style={{ ...paperStyle(paper), fontFamily: readerFontStack(font), fontSize: size, lineHeight } as CSSProperties}
      >
        {target.sample}
      </div>
      {fallback && (
        <p className="mt-2 text-[13px] text-ink-soft">
          {font.label} has no {SCRIPT_NAMES[target.script]} letters, so {target.name} text uses {fallback}.
        </p>
      )}

      <div role="radiogroup" aria-label="Reading font" className="mt-4 grid gap-2 sm:grid-cols-2">
        {READER_FONTS.map((f) => {
          const selected = f.id === reader.font;
          return (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => void patchSetting('reader', { font: f.id })}
              className={cx(
                'no-callout flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-[transform,background-color,border-color] duration-150 active:scale-[0.98]',
                selected ? 'border-accent bg-accent-soft' : 'border-line bg-raised hover:border-line-strong',
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-lg leading-tight" style={{ fontFamily: readerFontStack(f) }}>
                  {f.label}
                </span>
                <span className="mt-0.5 block text-[13px] text-ink-soft">{f.blurb}</span>
                <span className="mt-2 flex flex-wrap gap-1">
                  {PREVIEW_SCRIPTS.map((s) => (
                    <Badge key={s} tone={f.scripts.includes(s) ? 'sage' : 'neutral'}>
                      {SCRIPT_NAMES[s]}
                      {!f.scripts.includes(s) && ' · fallback'}
                    </Badge>
                  ))}
                </span>
              </span>
              {selected && <Check size={18} className="mt-1 shrink-0 text-accent-text" aria-hidden />}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-x-8 sm:grid-cols-2">
        <Slider label="Text size" value={size} min={15} max={30} onChange={setSize} format={(v) => `${v} px`} />
        <Slider label="Line spacing" value={lineHeight} min={1.3} max={2.1} step={0.05} onChange={setLineHeight} format={(v) => v.toFixed(2)} />
      </div>

      <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-[15px] font-semibold">Day paper</p>
          <PaperPicker reader={reader} theme="paper" labelled />
        </div>
        <div>
          <p className="mb-2 text-[15px] font-semibold">Night paper</p>
          <PaperPicker reader={reader} theme="nocturne" labelled />
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[15px] font-semibold">Page style</p>
        <Segmented
          label="Page style"
          value={reader.mode}
          onChange={(mode) => void patchSetting('reader', { mode })}
          options={[
            { value: 'paged', label: 'Page flip' },
            { value: 'scroll', label: 'Smooth scroll' },
          ]}
        />
      </div>

      <div className="mt-3 divide-y divide-line">
        <ToggleRow
          title="Highlight unseen words"
          description="A faint dotted underline on words you haven’t marked yet."
          checked={reader.highlightUnseen}
          onChange={(highlightUnseen) => void patchSetting('reader', { highlightUnseen })}
        />
        <ToggleRow
          title="Mark unseen words as known when I turn the page"
          description="LingQ-style: anything you didn’t tap is treated as known."
          checked={reader.autoKnownOnPageTurn}
          onChange={(autoKnownOnPageTurn) => void patchSetting('reader', { autoKnownOnPageTurn })}
        />
      </div>
    </SettingsSection>
  );
}
