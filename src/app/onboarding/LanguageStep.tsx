import { AnimatePresence, motion } from 'motion/react';
import { BETA_INCLUDES, LANGUAGES } from '@/core/lang/languages';
import type { LanguageInfo } from '@/core/lang/languages';
import { LanguageFlag } from '@/design/flags';
import { Select } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { StepTitle } from './StepTitle';

interface LanguageStepProps {
  target: string | null;
  native: string;
  onTarget: (code: string) => void;
  onNative: (code: string) => void;
}

export function LanguageStep({ target, native, onTarget, onNative }: LanguageStepProps) {
  const selected = LANGUAGES.find((l) => l.code === target);
  const choice = (lang: LanguageInfo) => {
    const isSelected = target === lang.code;
    return (
      <button
        key={lang.code}
        type="button"
        role="radio"
        aria-checked={isSelected}
        disabled={native === lang.code}
        onClick={() => onTarget(lang.code)}
        className={cx(
          'no-callout flex min-w-0 items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-[transform,background-color,border-color] duration-150 active:scale-[0.97] disabled:opacity-35',
          isSelected ? 'border-accent bg-accent-soft' : 'border-line bg-raised hover:border-line-strong',
        )}
      >
        <LanguageFlag lang={lang.code} width={30} />
        <span className="min-w-0">
          <span lang={lang.code} dir={lang.rtl ? 'rtl' : undefined} className="block truncate font-serif text-[17px] font-semibold">
            {lang.endonym}
          </span>
          <span className="block truncate text-xs text-ink-faint">{lang.name}</span>
        </span>
      </button>
    );
  };
  return (
    <div>
      <StepTitle title="What will you read?" body="Pick the language you’re learning. You can add more later." />

      <div role="radiogroup" aria-label="Language to learn" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {LANGUAGES.filter((l) => l.tier !== 2).map(choice)}
      </div>

      {/* Beta languages: everything that is built automatically, nothing picked by hand. */}
      <div className="mt-6">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink-faint">More languages · Beta</h3>
        <p className="mt-1 mb-3 text-[13px] leading-snug text-ink-soft">{BETA_INCLUDES}</p>
        <div role="radiogroup" aria-label="Beta language to learn" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {LANGUAGES.filter((l) => l.tier === 2).map(choice)}
        </div>
      </div>

      {/* A page from the chosen language, so the choice feels like opening a book. */}
      <div className="mt-4 min-h-[92px]">
        <AnimatePresence mode="wait" initial={false}>
          {selected && (
            <motion.p
              key={selected.code}
              lang={selected.code}
              dir={selected.rtl ? 'rtl' : undefined}
              className="rounded-2xl border border-line/70 bg-surface px-5 py-4 font-serif text-[17px] leading-relaxed text-ink-soft"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={spring.soft}
            >
              {selected.sample}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 max-w-sm">
        <Select
          label="I already speak"
          value={native}
          onChange={onNative}
          options={LANGUAGES.map((l) => ({ value: l.code, label: `${l.name} · ${l.endonym}` }))}
        />
        <p className="mt-2 text-[13px] leading-snug text-ink-soft">
          {target === 'en' ? 'English words come with English definitions.' : 'Instant translations are shown in English.'}
        </p>
      </div>
    </div>
  );
}
