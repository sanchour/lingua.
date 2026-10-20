import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { AVAILABLE_LANGUAGES, LANGUAGES, TIERS } from '@/core/lang/languages';
import type { LanguageInfo, Tier } from '@/core/lang/languages';
import { LanguageFlag } from '@/design/flags';
import { Select } from '@/design/primitives';
import { SearchInput, searchKey } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { LanguageMap, placeName, placesOf } from './LanguageMap';
import { StepTitle } from './StepTitle';

interface LanguageStepProps {
  target: string | null;
  native: string;
  onTarget: (code: string | null) => void;
  onNative: (code: string) => void;
}

const label = 'text-[12px] font-bold uppercase tracking-[0.08em] text-ink-faint';

export function LanguageStep({ target, native, onTarget, onNative }: LanguageStepProps) {
  const [place, setPlace] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  /** A language planned but not yet available: shown on the map, not chosen. */
  const [preview, setPreview] = useState<string | null>(null);
  const shown = target ?? preview;
  const selected = LANGUAGES.find((l) => l.code === shown);

  const pick = (lang: LanguageInfo) => {
    if (lang.soon) {
      setPreview(lang.code);
      onTarget(null);
      return;
    }
    setPreview(null);
    onTarget(lang.code);
  };

  const q = searchKey(query.trim());
  const matches = (l: LanguageInfo) => !q || searchKey(`${l.name} ${l.endonym}`).includes(q);
  const inPlace = useMemo(() => (place ? LANGUAGES.filter((l) => placesOf(l).includes(place)) : []), [place]);

  const button = (lang: LanguageInfo, size: 'large' | 'card' | 'row') => {
    const isSelected = shown === lang.code;
    return (
      <button
        key={lang.code}
        type="button"
        role="radio"
        aria-checked={isSelected}
        disabled={!lang.soon && native === lang.code}
        onClick={() => pick(lang)}
        className={cx(
          'no-callout flex min-w-0 items-center gap-3 border text-left transition-[transform,background-color,border-color] duration-150 active:scale-[0.98] disabled:opacity-35',
          size === 'large' ? 'rounded-2xl px-3.5 py-4' : size === 'card' ? 'rounded-2xl px-3 py-2.5' : 'rounded-xl px-2.5 py-2',
          isSelected ? 'border-accent bg-accent-soft' : 'border-line bg-raised hover:border-line-strong',
          lang.soon && !isSelected && 'bg-transparent',
        )}
      >
        <LanguageFlag lang={lang.code} width={size === 'large' ? 36 : size === 'card' ? 30 : 26} />
        <span className="min-w-0 flex-1">
          <span lang={lang.code} dir={lang.rtl ? 'rtl' : undefined} className={cx('block truncate font-serif font-semibold', size === 'large' ? 'text-[19px]' : size === 'card' ? 'text-[16px]' : 'text-[15px]')}>
            {lang.endonym}
          </span>
          <span className="block truncate text-xs text-ink-faint">{lang.name}</span>
        </span>
        {size === 'row' && <span className="shrink-0 rounded-full bg-sunken px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-ink-faint uppercase">{lang.soon ? 'Soon' : TIERS[lang.tier].name}</span>}
        {size !== 'row' && lang.soon && <span className="shrink-0 text-[11px] font-bold tracking-wide text-ink-faint uppercase">Soon</span>}
      </button>
    );
  };

  const tier = (t: Tier) => LANGUAGES.filter((l) => l.tier === t && matches(l));
  const section = (title: string, note: string, children: ReactNode, count: number) =>
    count > 0 && (
      <div className="mt-6 first:mt-0">
        <h3 className={label}>{title}</h3>
        <p className="mt-1 mb-2.5 text-[13px] leading-snug text-ink-soft">{note}</p>
        {children}
      </div>
    );

  const core = tier(1);
  const full = tier(2);
  const more = LANGUAGES.filter((l) => l.tier !== 1 && l.tier !== 2 && matches(l));
  const none = !core.length && !full.length && !more.length;

  return (
    <div>
      <StepTitle title="What will you read?" body="Pick the language you’re learning, on the map or in the list. You can add more later." />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-7">
        <div className="h-[230px] sm:h-[300px] lg:sticky lg:top-6 lg:h-[min(600px,calc(100dvh-14rem))] lg:self-start">
          <LanguageMap languages={LANGUAGES} selected={shown} place={place} onPlace={setPlace} />
        </div>

        <div role="radiogroup" aria-label="Language to learn" className="min-w-0">
          <SearchInput value={query} onChange={setQuery} placeholder="Search the languages" className="mb-4" />

          {place && (
            <div className="mb-5 rounded-2xl border border-accent/40 bg-accent-soft/50 p-3">
              <div className="mb-2 flex items-center gap-2">
                <h3 className="flex-1 text-[14px] font-semibold">Spoken in {placeName(place)}</h3>
                <button type="button" aria-label="Show all languages" onClick={() => setPlace(null)} className="grid size-7 place-items-center rounded-lg text-ink-soft hover:bg-surface">
                  <X size={15} aria-hidden />
                </button>
              </div>
              {inPlace.length ? <div className="grid gap-1.5 sm:grid-cols-2">{inPlace.map((l) => button(l, 'row'))}</div> : <p className="text-[13px] text-ink-soft">No language of Lingua’s is placed here yet.</p>}
            </div>
          )}

          {section('Core', TIERS[1].includes, <div className="grid grid-cols-2 gap-2">{core.map((l) => button(l, 'large'))}</div>, core.length)}
          {section('Full', TIERS[2].includes, <div className="grid grid-cols-2 gap-2">{full.map((l) => button(l, 'card'))}</div>, full.length)}
          {section(
            'More languages',
            'Beta, Basics and Experimental: less is built by hand for them. Some are on the way.',
            <div className="grid gap-1.5 sm:grid-cols-2">{more.map((l) => button(l, 'row'))}</div>,
            more.length,
          )}
          {none && <p className="py-6 text-center text-[14px] text-ink-soft">No language matches “{query.trim()}”.</p>}
        </div>
      </div>

      {/* A page from the chosen language, so the choice feels like opening a book. */}
      <div className="mt-4 min-h-[92px]">
        <AnimatePresence mode="wait" initial={false}>
          {selected && (
            <motion.p
              key={selected.code}
              lang={selected.sample ? selected.code : undefined}
              dir={selected.rtl ? 'rtl' : undefined}
              className="rounded-2xl border border-line/70 bg-surface px-5 py-4 font-serif text-[17px] leading-relaxed text-ink-soft"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={spring.soft}
            >
              {selected.soon ? `${selected.name} is on the way (${TIERS[selected.tier].name}). Pick another language for now.` : selected.sample}
            </motion.p>
          )}
        </AnimatePresence>
        {selected && !selected.soon && selected.tier !== 1 && <p className="mt-2 px-1 text-[13px] leading-snug text-ink-soft">{TIERS[selected.tier].includes}</p>}
      </div>

      <div className="mt-4 max-w-sm">
        <Select
          label="I already speak"
          value={native}
          onChange={onNative}
          options={AVAILABLE_LANGUAGES.map((l) => ({ value: l.code, label: `${l.name} · ${l.endonym}` }))}
        />
        <p className="mt-2 text-[13px] leading-snug text-ink-soft">
          {target === 'en' ? 'English words come with English definitions.' : 'Instant translations are shown in English.'}
        </p>
      </div>
    </div>
  );
}
