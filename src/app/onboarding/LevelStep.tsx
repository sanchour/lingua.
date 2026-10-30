import { UiText, useUi } from '@/design/i18n/UiText';
import { getLanguage } from '@/core/lang/languages';
import { getLevel } from '@/core/lang/levels';
import type { Level } from '@/core/lang/levels';
import levelSentences from '@/data/levelSentences.json';
import { Switch } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { StepTitle } from './StepTitle';

interface LevelSentence {
  level: Exclude<Level, 'A0'>;
  text: string;
  en: string;
  /** The sentence in parts, each word with its frequency rank (0 between words). */
  parts: Array<[string, number]>;
}

const SENTENCES = levelSentences as unknown as Record<string, LevelSentence[]>;

/** What each level means, said as what you can read. */
const CAN: Record<Level, string> = {
  A0: 'Starting from the very first word.',
  A1: 'You know a few everyday words and phrases.',
  A2: 'You can follow simple everyday sentences.',
  B1: 'You can read easy books and follow the gist of shows.',
  B2: 'You read articles and talk easily about familiar things.',
  C1: 'You read novels; now it’s nuance and range.',
};

interface LevelStepProps {
  lang: string;
  level: Level;
  seedKnown: boolean;
  onLevel: (level: Level) => void;
  onSeedKnown: (value: boolean) => void;
}

/**
 * How much can you read already (5.1-2b): five sentences in the language, A1 to C1, stacked like lines
 * on a page. Clicking the last one you understand inks it and those above it and fades the rest. The
 * line chosen shows its new words as the reader would, so skipping the common words shows on it.
 */
export function LevelStep({ lang, level, seedKnown, onLevel, onSeedKnown }: LevelStepProps) {
  const translateUi = useUi();
  const lines = SENTENCES[lang] ?? [];
  const chosen = lines.findIndex((s) => s.level === level);
  const top = getLevel(level).seedKnownTopN;
  const name = getLanguage(lang)?.name ?? lang;

  return (
    <div>
      <StepTitle title={translateUi('So, how far along are you?')} body={`Click the last line you understand without help. Real ${name}, easiest first. No peeking at a dictionary.`} />

      <div role="radiogroup" aria-label={translateUi('Your level')} className="rounded-3xl border border-line bg-raised px-4 py-3 shadow-elev-1">
        {[null, ...lines].map((s, i) => {
          // Row 0 is "starting from zero"; the others are the sentences, A1 up.
          const code: Level = s ? s.level : 'A0';
          const on = level === code;
          const at = i - 1;
          const inked = chosen >= 0 && at <= chosen;
          return (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onLevel(code)}
              className={cx(
                'flex w-full items-center gap-4 rounded-2xl px-3 py-2.5 text-left transition-[opacity,background-color] duration-200',
                on ? 'bg-accent-soft' : 'hover:bg-surface',
                s && chosen >= 0 && !inked && 'opacity-40 hover:opacity-80',
              )}
            >
              <span className={cx('grid h-7 w-10 shrink-0 place-items-center rounded-full text-[12.5px] font-bold tabular-nums transition-colors', on ? 'bg-accent-fill text-on-accent' : 'bg-surface text-ink-soft')}>{code}</span>
              <span className="min-w-0 flex-1">
                {s ? (
                  <span lang={lang} dir={getLanguage(lang)?.rtl ? 'rtl' : undefined} className={cx('block font-serif text-[19px] leading-snug', inked ? 'text-ink' : 'text-ink-soft')}>
                    {on && top > 0
                      ? // The line chosen, as the reader would show it: new words marked, the common ones known when skipped.
                        s.parts.map(([part, rank], k) =>
                          rank ? (
                            <span key={k} className="relative">
                              <span
                                className={cx('absolute -inset-x-0.5 inset-y-0 rounded-[3px] bg-[var(--learning-bg)] transition-opacity duration-300', seedKnown && rank <= top ? 'opacity-0' : 'opacity-100')}
                                aria-hidden
                              />
                              <span className="relative">{part}</span>
                            </span>
                          ) : (
                            <span key={k}>{part}</span>
                          ),
                        )
                      : s.text}
                  </span>
                ) : (
                  <span className={cx('block font-serif text-[19px] leading-snug', on ? 'text-ink' : 'text-ink-soft')}><UiText source={'Nothing yet: I’m starting from zero'} /></span>
                )}
                {s && on && s.en && <span className="mt-0.5 block text-[13px] text-ink-faint">{s.en}</span>}
              </span>
              <span className={cx('grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors', on ? 'border-accent-fill bg-accent-fill' : 'border-line-strong')} aria-hidden>
                {on && <span className="size-2 rounded-full bg-on-accent" />}
              </span>
            </button>
          );
        })}

        <div className="mt-2 flex min-h-[52px] items-center gap-5 border-t border-line/70 px-3 pt-3">
          <p className="min-w-0 flex-1 text-[15px]">
            <span className="font-semibold text-accent-text">{level}</span>
            <span className="text-ink-soft"> · {CAN[level]}</span>
          </p>
          {top > 0 && (
            <div className="flex shrink-0 items-center gap-3" title={translateUi('You can unmark any word while reading.')}>
              <span className="text-right">
                <span className="block text-[14px] font-semibold"><UiText source={'Skip the {0} most common words'} values={[top.toLocaleString()]} /></span>
                <span className="block text-[12px] text-ink-faint"><UiText source={'Only new words stay marked'} /></span>
              </span>
              <Switch checked={seedKnown} onChange={onSeedKnown} label={translateUi('Mark the {0} most common words as known', [top.toLocaleString()])} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
