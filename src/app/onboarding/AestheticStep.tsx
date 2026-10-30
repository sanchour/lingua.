import { UiText, useUi } from '@/design/i18n/UiText';
import { Check, Moon, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { tokenize } from '@/core/text/tokenizer';
import { patchSetting, setSetting } from '@/data/settings';
import type { Settings, Theme, ThemePref } from '@/data/settings';
import { NOCTURNE_PALETTES, PAPER_PALETTES } from '@/design/palettes';
import type { Palette } from '@/design/palettes';
import { useMediaQuery } from '@/design/hooks/useMediaQuery';
import { Switch } from '@/design/primitives';
import { resolveTheme } from '@/app/theme';
import { cx } from '@/lib/cx';
import { StepTitle } from './StepTitle';

interface AestheticStepProps {
  pref: ThemePref;
  palette: Settings['palette'];
  sample: string;
  lang: string;
}

const LIGHTS: Array<{ theme: Theme; name: string; note: string; when: string; icon: LucideIcon; list: Palette[] }> = [
  { theme: 'paper', name: 'Light', note: 'Paper, for daylight', when: 'By day', icon: Sun, list: PAPER_PALETTES },
  { theme: 'nocturne', name: 'Dark', note: 'Nocturne, for the evening', when: 'At night', icon: Moon, list: NOCTURNE_PALETTES },
];

/**
 * Choose your study light (5.1-2b): Light and Dark as two big pages of the app, each drawn in its own
 * light and palette. Choosing one opens its palettes under it; following the device opens both, one
 * for the day and one for the night. Choosing changes the whole screen at once.
 */
export function AestheticStep({ pref, palette, sample, lang }: AestheticStepProps) {
  const translateUi = useUi();
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  const shown = resolveTheme(pref, systemDark);
  const follow = pref === 'system';
  // Show one word marked "learning", as the reader does.
  const tokens = tokenize(sample, lang);
  const learning = tokens.findIndex((t, i) => t.isWord && i > 2 && t.text.length > 3);

  return (
    <div>
      <div className="flex items-start gap-6">
        <div className="min-w-0 flex-1">
          <StepTitle title={translateUi('Choose your study light')} body="We have a fine selection of cute colour themes to choose from. Change it any time in Settings." />
        </div>
        <div className="mt-2 flex shrink-0 items-center gap-3 rounded-2xl border border-line bg-raised py-2.5 pr-3 pl-4">
          <span className="text-right">
            <span className="block text-[14px] font-semibold"><UiText source={'Follow my device'} /></span>
            <span className="block text-[12px] text-ink-faint"><UiText source={'Light by day, dark at night'} /></span>
          </span>
          <Switch checked={follow} onChange={(on) => void setSetting('theme', on ? 'system' : shown)} label={translateUi('Follow my device’s light and dark mode')} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {LIGHTS.map(({ theme, name, note, when, icon: Icon, list }) => {
          const on = follow || pref === theme;
          return (
            <div key={theme}>
              <button
                type="button"
                role="radio"
                aria-checked={pref === theme}
                onClick={() => void setSetting('theme', theme)}
                className={cx(
                  'no-callout block w-full rounded-[26px] border-2 p-1.5 text-left transition-[transform,border-color] duration-200 hover:-translate-y-0.5',
                  on ? 'border-accent' : 'border-line hover:border-line-strong',
                )}
              >
                {/* Scoped light and palette: the page is drawn in its own colours. */}
                <div data-theme={theme} data-palette={palette[theme]} className="flex h-[176px] overflow-hidden rounded-[20px] border border-line bg-bg text-ink">
                  <div className="w-12 shrink-0 space-y-2.5 border-r border-line bg-surface px-3 pt-3.5">
                    <span className="block size-6 rounded-lg bg-accent-fill" />
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className={cx('block size-6 rounded-lg', i === 0 ? 'bg-accent-soft' : 'bg-line/70')} />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1 px-5 pt-4">
                    <span className="block h-2 w-24 rounded-full bg-line-strong" />
                    <p lang={lang} className="mt-3 line-clamp-3 font-serif text-[16px] leading-relaxed">
                      {tokens.map((t, i) =>
                        i === learning ? (
                          <span key={i} className="rounded-[3px] bg-[var(--learning-bg)] underline decoration-[var(--learning-line)] decoration-[1.5px] underline-offset-[3px]">
                            {t.text}
                          </span>
                        ) : (
                          <span key={i}>{t.text}</span>
                        ),
                      )}
                    </p>
                    <div className="mt-3.5 flex gap-2">
                      <span className="h-7 w-20 rounded-full bg-accent-fill" />
                      <span className="h-7 w-14 rounded-full border border-line-strong" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-3 pt-3 pb-2">
                  <Icon size={18} className={on ? 'text-accent-text' : 'text-ink-faint'} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-semibold">{name}</span>
                    <span className="block text-[12.5px] text-ink-soft">{note}</span>
                  </span>
                  {follow ? (
                    <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[12px] font-semibold text-accent-text">{when}</span>
                  ) : (
                    <span className={cx('grid size-6 place-items-center rounded-full border-2', on ? 'border-accent bg-accent-fill text-on-accent' : 'border-line-strong')}>
                      {on && <Check size={13} strokeWidth={3.4} aria-hidden />}
                    </span>
                  )}
                </div>
              </button>

              {/* The palettes open under the light chosen (both when following the device); the space stays, so nothing jumps. */}
              <div
                role="radiogroup"
                aria-label={translateUi('{0} palettes', [name])}
                inert={!on}
                className={cx('mt-3 grid grid-cols-6 gap-2 px-1 transition-[opacity,transform] duration-300', on ? 'opacity-100' : 'pointer-events-none -translate-y-1 opacity-0')}
              >
                {list.map((p) => {
                  const picked = palette[theme] === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={picked}
                      onClick={() => void patchSetting('palette', { [theme]: p.id } as Partial<Settings['palette']>)}
                      className="no-callout group flex flex-col items-center gap-1.5 rounded-xl text-center"
                    >
                      <span
                        className={cx('grid h-11 w-full place-items-center rounded-xl border transition-[box-shadow,transform] duration-150 group-hover:-translate-y-0.5', picked ? 'border-transparent ring-2 ring-accent' : 'border-line')}
                        style={{ background: p.swatch[0] }}
                      >
                        <span className="size-3.5 rounded-full" style={{ background: p.swatch[1] }} />
                      </span>
                      <span className={cx('text-[11.5px] leading-none', picked ? 'font-semibold text-ink' : 'text-ink-soft')}>{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
