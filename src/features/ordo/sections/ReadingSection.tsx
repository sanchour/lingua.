import { BookOpenText, Check } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useApp } from '@/app/context';
import { resolveTheme } from '@/app/theme';
import { getLanguage, LANGUAGES, READING_LANGS } from '@/core/lang/languages';
import { TRANSLIT_LANGS } from '@/core/script/reading';
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

const SCRIPT_NAMES: Record<Script, string> = {
  Latn: 'Latin', Cyrl: 'Cyrillic', Grek: 'Greek', Arab: 'Arabic', Hans: 'Chinese', Hant: 'Traditional Chinese', Jpan: 'Japanese', Kore: 'Hangul',
  Deva: 'Devanagari', Thai: 'Thai', Taml: 'Tamil', Geor: 'Georgian', Beng: 'Bengali', Guru: 'Gurmukhi', Hebr: 'Hebrew', Armn: 'Armenian', Mymr: 'Burmese', Khmr: 'Khmer', Ethi: 'Ethiopic',
};
const PREVIEW_SCRIPTS: Script[] = ['Latn', 'Cyrl', 'Grek'];

export function ReadingSection({ reader, lang }: { reader: Settings['reader']; lang: string }) {
  const [size, setSize] = useDraft(reader.sizePx, (sizePx) => void patchSetting('reader', { sizePx }));
  const [lineHeight, setLineHeight] = useDraft(reader.lineHeight, (lh) => void patchSetting('reader', { lineHeight: lh }));
  const [letterSpacing, setLetterSpacing] = useDraft(reader.letterSpacing ?? 0, (ls) => void patchSetting('reader', { letterSpacing: ls }));
  const [wordSpacing, setWordSpacing] = useDraft(reader.wordSpacing ?? 0, (ws) => void patchSetting('reader', { wordSpacing: ws }));
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
        style={{
          ...paperStyle(paper),
          fontFamily: readerFontStack(font, target.code),
          fontSize: size,
          lineHeight,
          letterSpacing: letterSpacing ? `${letterSpacing}em` : undefined,
          wordSpacing: wordSpacing ? `${wordSpacing}em` : undefined,
        } as CSSProperties}
      >
        {target.sample}
      </div>
      {fallback && (
        <p data-hint="" className="mt-2 text-[13px] text-ink-soft">
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

      <div className="mt-4 grid gap-x-8 sm:grid-cols-2">
        <Slider label="Letter spacing" value={letterSpacing} min={0} max={0.2} step={0.01} onChange={setLetterSpacing} format={(v) => `${(v * 100).toFixed(0)}%`} />
        <Slider label="Word spacing" value={wordSpacing} min={0} max={0.4} step={0.02} onChange={setWordSpacing} format={(v) => `${(v * 100).toFixed(0)}%`} />
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

      {(READING_LANGS.has(target.code) || TRANSLIT_LANGS.has(target.code)) && (
        <div className="mt-5">
          <p className="text-[15px] font-semibold">{target.code === 'ja' ? 'Furigana over words' : READING_LANGS.has(target.code) ? 'Pinyin over words' : 'Transliteration over words'}</p>
          <p data-hint="" className="mt-0.5 mb-2 text-[13px] text-ink-soft">
            {target.code === 'ja' ? 'Kana above words written with kanji.' : READING_LANGS.has(target.code) ? 'The pinyin of each word, with its tones, above the characters.' : 'The word in Latin letters above it. Arabic needs the vowel marks to be read.'} “Fading” shows it in full on new words, faintly on words you are learning, and not at all on known ones.
          </p>
          <Segmented
            label="Reading above words"
            value={reader.readings}
            onChange={(readings) => void patchSetting('reader', { readings })}
            options={[
              { value: 'new', label: 'New words' },
              { value: 'fade', label: 'Fading' },
              { value: 'all', label: 'All words' },
              { value: 'off', label: 'Off' },
            ]}
          />
        </div>
      )}

      {target.code === 'ar' && (
        <div className="mt-5">
          <p className="text-[15px] font-semibold">Transliteration letters</p>
          <p data-hint="" className="mt-0.5 mb-2 text-[13px] text-ink-soft">Scholarly keeps ā, ḥ and ʿ; plain drops the marks. With “Fading”, the short vowel marks on Arabic words also fade as you learn them: full on new words, faint while learning, gone once known.</p>
          <Segmented
            label="Transliteration letters"
            value={reader.translit ?? 'scholarly'}
            onChange={(translit) => void patchSetting('reader', { translit })}
            options={[
              { value: 'scholarly', label: 'Scholarly' },
              { value: 'plain', label: 'Plain' },
            ]}
          />
        </div>
      )}

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
        <ToggleRow
          title="Translations that read the sentence"
          description="With an AI key (AI & translation), a word you look up gets the meaning its sentence needs. One small request per sentence, remembered. Without a key, the words around it still help choose."
          checked={reader.contextGlosses}
          onChange={(contextGlosses) => void patchSetting('reader', { contextGlosses })}
        />
      </div>

      <p className="mt-5 text-[15px] font-semibold">At the end of a text</p>
      <div className="divide-y divide-line">
        <ToggleRow
          title="Check yourself"
          description="A few quick questions made from the text: a missing word, a meaning, a sentence to put back in order. They count in Ratio."
          checked={reader.endCheck}
          onChange={(endCheck) => void patchSetting('reader', { endCheck })}
        />
        <ToggleRow
          title="Questions about the story"
          description="With AI, two questions about what happened follow the word questions."
          checked={reader.endStory}
          disabled={!reader.endCheck}
          onChange={(endStory) => void patchSetting('reader', { endStory })}
        />
        <ToggleRow
          title="In your own words"
          description="Retell the text or carry it on in a few lines, checked by AI with a key, and kept in Diarium."
          checked={reader.endOwnWords}
          onChange={(endOwnWords) => void patchSetting('reader', { endOwnWords })}
        />
      </div>
    </SettingsSection>
  );
}
