import { Check, Moon, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { tokenize } from '@/core/text/tokenizer';
import type { Theme, ThemePref } from '@/data/settings';
import { Card, ToggleRow } from '@/design/primitives';
import { useMediaQuery } from '@/design/hooks/useMediaQuery';
import { resolveTheme } from '@/app/theme';
import { cx } from '@/lib/cx';
import { StepTitle } from './StepTitle';

interface AestheticStepProps {
  pref: ThemePref;
  sample: string;
  lang: string;
  onChange: (pref: ThemePref) => void;
}

const THEMES: Array<{ id: Theme; name: string; blurb: string; icon: LucideIcon }> = [
  { id: 'paper', name: 'Paper', blurb: 'Warm cream pages and espresso ink', icon: Sun },
  { id: 'nocturne', name: 'Nocturne', blurb: 'Charcoal, ivory and amber for the evening', icon: Moon },
];

export function AestheticStep({ pref, sample, lang, onChange }: AestheticStepProps) {
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  const shown = resolveTheme(pref, systemDark);

  return (
    <div>
      <StepTitle title="Choose your study light" body="You can switch any time from the sidebar or Settings." />
      <div role="radiogroup" aria-label="Theme" className="grid gap-3 sm:grid-cols-2">
        {THEMES.map((t) => (
          <ThemePreview key={t.id} theme={t} selected={shown === t.id} sample={sample} lang={lang} onSelect={() => onChange(t.id)} />
        ))}
      </div>
      <Card className="mt-4 py-1">
        <ToggleRow
          title="Follow my device"
          description="Switch between Paper and Nocturne with your system’s light and dark mode."
          checked={pref === 'system'}
          onChange={(on) => onChange(on ? 'system' : shown)}
        />
      </Card>
    </div>
  );
}

function ThemePreview({
  theme,
  selected,
  sample,
  lang,
  onSelect,
}: {
  theme: (typeof THEMES)[number];
  selected: boolean;
  sample: string;
  lang: string;
  onSelect: () => void;
}) {
  const Icon = theme.icon;
  // Highlight one word as "Learning" to show how the reader marks words.
  const tokens = tokenize(sample, lang);
  const learningIndex = tokens.findIndex((t, i) => t.isWord && i > 2 && t.text.length > 3);

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cx(
        'no-callout rounded-[26px] border-2 p-1.5 text-left transition-[transform,border-color] duration-150 active:scale-[0.98]',
        selected ? 'border-accent' : 'border-transparent hover:border-line-strong',
      )}
    >
      {/* Scoped theme: this card always renders in its own palette. */}
      <div data-theme={theme.id} className="rounded-[20px] border border-line bg-bg p-4 text-ink shadow-elev-1">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-surface text-accent-text">
            <Icon size={17} aria-hidden />
          </span>
          <span className="flex-1 text-[15px] font-bold">{theme.name}</span>
          <span
            className={cx(
              'grid size-6 place-items-center rounded-full border',
              selected ? 'border-accent bg-accent-fill text-on-accent' : 'border-line-strong',
            )}
          >
            {selected && <Check size={14} strokeWidth={3} aria-hidden />}
          </span>
        </div>
        <div className="rounded-xl bg-surface p-3.5">
          <p lang={lang} className="font-serif text-[15px] leading-relaxed">
            {tokens.map((t, i) =>
              i === learningIndex ? (
                <span key={i} className="rounded-[3px] bg-[var(--learning-bg)] underline decoration-[var(--learning-line)] decoration-2 underline-offset-[3px]">
                  {t.text}
                </span>
              ) : (
                <span key={i}>{t.text}</span>
              ),
            )}
          </p>
        </div>
        <p className="mt-3 text-[13px] text-ink-soft">{theme.blurb}</p>
      </div>
    </button>
  );
}
