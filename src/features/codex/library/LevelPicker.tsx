import { Sparkles } from 'lucide-react';
import { CEFR_LEVELS } from '@/core/lang/levels';
import type { Cefr } from '@/core/lang/levels';
import { cx } from '@/lib/cx';

/** Reading level chips: none chosen means Lingua's own guess (`guess`) is shown instead. */
export function LevelPicker({ value, guess, onChange }: { value: Cefr | undefined; guess?: Cefr; onChange: (level: Cefr | undefined) => void }) {
  const chip = (on: boolean) =>
    cx(
      'no-callout inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13.5px] font-bold transition-[transform,background-color,border-color] duration-150 active:scale-[0.96]',
      on ? 'border-accent bg-accent-soft text-accent-text' : 'border-line bg-raised text-ink-soft hover:border-line-strong hover:text-ink',
    );
  return (
    <div role="radiogroup" aria-label="Reading level" className="flex flex-wrap gap-1.5">
      <button type="button" role="radio" aria-checked={!value} onClick={() => onChange(undefined)} className={chip(!value)}>
        <Sparkles size={13} aria-hidden />
        {guess ? `Lingua’s guess · ${guess}` : 'Let Lingua guess'}
      </button>
      {CEFR_LEVELS.map((l) => (
        <button key={l} type="button" role="radio" aria-checked={value === l} onClick={() => onChange(l)} className={cx(chip(value === l), 'tabular-nums')}>
          {l}
        </button>
      ))}
    </div>
  );
}
