import { useUi } from '@/design/i18n/UiText';
import { Sparkles } from 'lucide-react';
import { CEFR_LEVELS } from '@/core/lang/levels';
import type { Cefr } from '@/core/lang/levels';
import { cx } from '@/lib/cx';

/**
 * The reading level on a small scale, A1 to C2 joined like a ruler (5.1-3a); none chosen means
 * Lingua's own guess (`guess`) is shown instead.
 */
export function LevelPicker({ value, guess, onChange }: { value: Cefr | undefined; guess?: Cefr; onChange: (level: Cefr | undefined) => void }) {
  const translateUi = useUi();
  const step = (on: boolean) =>
    cx(
      'no-callout inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-bold transition-[background-color,color,box-shadow] duration-150',
      on ? 'bg-surface text-accent-text shadow-elev-1' : 'text-ink-soft hover:text-ink',
    );
  return (
    <div role="radiogroup" aria-label={translateUi('Reading level')} className="inline-flex flex-wrap items-center gap-0.5 rounded-full border border-line bg-sunken p-0.5">
      <button type="button" role="radio" aria-checked={!value} onClick={() => onChange(undefined)} className={step(!value)}>
        <Sparkles size={13} aria-hidden />
        {guess ? translateUi('Guess · {0}', [guess]) : translateUi('Guess')}
      </button>
      <span className="mx-1 h-4 w-px bg-line-strong" aria-hidden />
      {CEFR_LEVELS.map((l) => (
        <button key={l} type="button" role="radio" aria-checked={value === l} onClick={() => onChange(l)} className={cx(step(value === l), 'w-10 px-0 tabular-nums')} title={guess === l && !value ? translateUi('Lingua’s guess') : undefined}>
          {l}
        </button>
      ))}
    </div>
  );
}
