import { UiText, useUi } from '@/design/i18n/UiText';
import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, Check, MousePointerClick, X } from 'lucide-react';
import { getLanguage, LANGUAGES, TIERS } from '@/core/lang/languages';
import type { LanguageInfo, Tier } from '@/core/lang/languages';
import { languagesIn, STATUS_NAME } from '@/data/territories';
import type { PlaceStatus } from '@/data/territories';
import { Flag, LanguageFlag } from '@/design/flags';
import { spring } from '@/design/motion';
import { SearchInput, searchKey } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { LanguageMap, placeName } from './LanguageMap';

interface LanguageStepProps {
  target: string | null;
  onTarget: (code: string) => void;
}

/** What each tier includes, short enough for a line; the full sentence is the hover title. */
const SHORT: Record<Tier, string> = {
  1: 'Everything: grammar, the alphabet, a full dictionary, natural voices.',
  2: 'Every room, grammar and the alphabet. No course.',
  3: 'Reading, word packs, podcasts and music. No grammar yet.',
  4: 'Reading, your own words, radio and podcasts.',
  x: 'Machine translation where it exists.',
};
const TIER_ORDER: Tier[] = [1, 2, 3, 4, 'x'];
/** The panel's width, and how much of the map it covers with its margin. */
const PANEL = 340;
const COVER = PANEL + 12;

/**
 * Which language to learn (Lingua 5.1-2b): the world first, big and wide. Clicking a country centres it
 * and opens a panel with its languages, best supported first; the panel's other tab has every language,
 * and a search opens it too. Under the map the six core languages are one click away, and below them,
 * peeking in at the bottom of the screen, every language by tier. The language chosen stays named on
 * the map, and choosing one flies the map to where it is spoken.
 */
export function LanguageStep({ target, onTarget }: LanguageStepProps) {
  const translateUi = useUi();
  const [place, setPlace] = useState<string | null>(null);
  const [panel, setPanel] = useState<'place' | 'all' | null>(null);
  const [query, setQuery] = useState('');
  const [hovered, setHovered] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const q = searchKey(query.trim());
  const matches = (l: LanguageInfo) => !q || searchKey(`${l.name} ${l.endonym}`).includes(q);
  const core = LANGUAGES.filter((l) => l.tier === 1);
  const chosen = target ? getLanguage(target) : undefined;
  const open = panel !== null;

  const hoverProps = (l: LanguageInfo) => ({
    onPointerEnter: () => setHovered(l.code),
    onPointerLeave: () => setHovered((h) => (h === l.code ? null : h)),
    onFocus: () => setHovered(l.code),
    onBlur: () => setHovered((h) => (h === l.code ? null : h)),
  });

  const pickPlace = (code: string | null) => {
    setPlace(code);
    setPanel(code ? 'place' : null);
  };
  const close = () => {
    setPanel(null);
    setPlace(null);
  };

  /** A language as a row in the panel: flag, its own name, where it stands there, and what Lingua has. */
  const row = (l: LanguageInfo, status?: PlaceStatus) => (
    <button
      key={l.code}
      type="button"
      role="radio"
      aria-checked={target === l.code}
      aria-disabled={l.soon || undefined}
      title={l.soon ? translateUi('{0} is coming. Pick another language for now.', [l.name]) : TIERS[l.tier].includes}
      onClick={() => !l.soon && onTarget(l.code)}
      {...hoverProps(l)}
      className={cx(
        'no-callout flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-[background-color,border-color,transform] duration-150',
        target === l.code ? 'border-accent bg-accent-soft' : 'border-transparent hover:border-line hover:bg-surface',
        l.soon ? 'cursor-default opacity-50' : 'active:scale-[0.98]',
      )}
    >
      <LanguageFlag lang={l.code} width={28} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span lang={l.code} dir={l.rtl ? 'rtl' : undefined} className="truncate font-serif text-[16.5px] font-semibold">
            {l.endonym}
          </span>
          <span className="truncate text-[12px] text-ink-faint">{l.name}</span>
        </span>
        <span className="block truncate text-[11.5px] text-ink-soft">
          {status ? `${STATUS_NAME[status]} · ` : ''}
          {l.soon ? translateUi('Coming') : TIERS[l.tier].name}
        </span>
      </span>
      {target === l.code ? (
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-fill text-on-accent">
          <Check size={14} strokeWidth={3.2} aria-hidden />
        </span>
      ) : (
        l.tier === 1 && <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-accent-text uppercase"><UiText source={'Core'} /></span>
      )}
    </button>
  );

  /** A language as a chip, in the core strip and the list below; the one chosen is filled. */
  const chip = (l: LanguageInfo, big = false) => {
    const on = target === l.code;
    return (
      <button
        key={l.code}
        type="button"
        role="radio"
        aria-checked={on}
        aria-disabled={l.soon || undefined}
        title={l.soon ? translateUi('{0} is coming. Pick another language for now.', [l.name]) : `${l.name} · ${l.endonym}`}
        onClick={() => !l.soon && onTarget(l.code)}
        {...hoverProps(l)}
        className={cx(
          'no-callout inline-flex items-center rounded-full border transition-[transform,background-color,border-color,color] duration-150',
          big ? 'h-9 gap-2 pr-3.5 pl-2' : 'h-8 gap-1.5 pr-3 pl-1.5 text-[13px]',
          on ? 'border-accent-fill bg-accent-fill font-semibold text-on-accent shadow-elev-1' : 'border-line bg-raised',
          l.soon ? 'cursor-default opacity-45' : !on && 'hover:-translate-y-0.5 hover:border-line-strong active:scale-[0.97]',
        )}
      >
        <LanguageFlag lang={l.code} width={big ? 22 : 20} />
        <span lang={big ? l.code : undefined} dir={big && l.rtl ? 'rtl' : undefined} className={big ? 'font-serif text-[15px] font-semibold' : undefined}>
          {big ? l.endonym : l.name}
        </span>
        {on && <Check size={14} strokeWidth={3.2} aria-hidden />}
      </button>
    );
  };

  const here = place
    ? languagesIn(place).flatMap(({ lang, status }) => {
        const l = getLanguage(lang);
        return l && matches(l) ? [{ l, status }] : [];
      })
    : [];

  return (
    <div>
      <div className="mb-3 flex items-end gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-[30px] leading-tight font-semibold tracking-tight"><UiText source={'What language will it be?'} /></h1>
          <p className="mt-1 text-[14.5px] text-ink-soft"><UiText source={'Click a country to see what’s spoken there, or scroll down for all of them. Commitment issues welcome: you can add more later.'} /></p>
        </div>
        <SearchInput
          value={query}
          onChange={(v) => {
            setQuery(v);
            if (v.trim() && panel !== 'all') setPanel('all');
          }}
          placeholder={translateUi('Search all languages')}
          className="w-72"
        />
      </div>

      <div className="relative overflow-hidden rounded-3xl shadow-elev-2" style={{ height: 'clamp(320px, calc(100dvh - 340px), 640px)' }}>
        <LanguageMap highlight={hovered ?? target} selected={target} place={place} onPlace={pickPlace} inset={open ? COVER : 0} />

        {/* Top of the map: how to begin, then which language was chosen. */}
        <div className="pointer-events-none absolute top-4 z-10 flex justify-center" style={{ left: 0, right: open ? COVER : 0 }}>
          <AnimatePresence mode="popLayout" initial={false}>
            {chosen ? (
              <motion.p
                key={chosen.code}
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={spring.snappy}
                className="flex items-center gap-2.5 rounded-full border border-accent/40 bg-raised py-1.5 pr-2 pl-3 shadow-elev-2"
              >
                <span className="text-[12.5px] text-ink-soft"><UiText source={'You’re learning'} /></span>
                <LanguageFlag lang={chosen.code} width={22} />
                <span lang={chosen.code} dir={chosen.rtl ? 'rtl' : undefined} className="font-serif text-[16px] font-semibold">
                  {chosen.endonym}
                </span>
                <span className="grid size-6 place-items-center rounded-full bg-accent-fill text-on-accent">
                  <Check size={14} strokeWidth={3.2} aria-hidden />
                </span>
              </motion.p>
            ) : (
              !open && (
                <motion.p key="hint" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={spring.gentle} className="flex items-center gap-2 rounded-full border border-line bg-raised/95 px-4 py-2 text-[13.5px] font-semibold shadow-elev-1"><UiText source={'{0} Click a country to begin'} values={[<MousePointerClick size={16} className="text-accent-text" aria-hidden />]} /></motion.p>
              )
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {open && (
            <motion.aside
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 28 }}
              transition={spring.snappy}
              aria-label={translateUi('Languages')}
              className="absolute top-3 right-3 bottom-3 z-20 flex flex-col overflow-hidden rounded-[20px] border border-line bg-raised shadow-elev-3"
              style={{ width: PANEL }}
            >
              <div className="flex items-center gap-1 border-b border-line px-2 pt-2">
                {place && (
                  <button type="button" onClick={() => setPanel('place')} className={cx('-mb-px flex items-center gap-2 border-b-2 px-3 pb-2 text-[13.5px] font-semibold', panel === 'place' ? 'border-accent text-ink' : 'border-transparent text-ink-soft hover:text-ink')}>
                    <Flag code={place.toLowerCase()} width={18} /> {placeName(place)}
                  </button>
                )}
                <button type="button" onClick={() => setPanel('all')} className={cx('-mb-px border-b-2 px-3 pb-2 text-[13.5px] font-semibold', panel === 'all' ? 'border-accent text-ink' : 'border-transparent text-ink-soft hover:text-ink')}><UiText source={'All languages'} /></button>
                <button type="button" onClick={close} aria-label={translateUi('Close')} className="mb-1.5 ml-auto grid size-7 place-items-center rounded-lg text-ink-faint hover:bg-surface hover:text-ink">
                  <X size={16} aria-hidden />
                </button>
              </div>

              <div role="radiogroup" aria-label={panel === 'place' && place ? translateUi('Languages in {0}', [placeName(place)]) : translateUi('All languages')} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
                {panel === 'place' && place && (
                  <>
                    <p className="px-2 pt-1 pb-2 text-[12.5px] text-ink-soft">
                      {here.length ? translateUi('{0} you can learn, spoken in {1}.', [here.length === 1 ? 'One language' : `${here.length} languages`, placeName(place)]) : translateUi('None of Lingua’s languages is spoken in {0} yet.', [placeName(place)])}
                    </p>
                    {here.map(({ l, status }) => row(l, status))}
                  </>
                )}
                {panel === 'all' &&
                  TIER_ORDER.map((tier) => {
                    const langs = LANGUAGES.filter((l) => l.tier === tier && matches(l));
                    if (!langs.length) return null;
                    return (
                      <section key={tier} className="mb-2">
                        <h2 className="px-2 pt-2 text-[11.5px] font-bold tracking-[0.08em] text-ink-faint uppercase">{TIERS[tier].name}</h2>
                        <p className="px-2 pb-1 text-[11.5px] text-ink-soft">{SHORT[tier]}</p>
                        {langs.map((l) => row(l))}
                      </section>
                    );
                  })}
                {panel === 'all' && !LANGUAGES.some(matches) && <p className="px-2 py-6 text-center text-[13.5px] text-ink-soft"><UiText source={'No language matches “{0}”.'} values={[query.trim()]} /></p>}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* The six core languages, one click away, and the way down to every language. */}
      <div role="radiogroup" aria-label={translateUi('Core languages')} className="mt-3 flex items-center gap-2">
        <span className="mr-1 text-[11.5px] font-bold tracking-[0.08em] text-ink-faint uppercase" title={TIERS[1].includes}>
          {TIERS[1].name}
        </span>
        {core.map((l) => chip(l, true))}
        <button
          type="button"
          onClick={() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13.5px] font-semibold text-accent-text hover:bg-accent-soft"
        ><UiText source={'All {0} languages {1}'} values={[LANGUAGES.length, <ArrowDown size={15} aria-hidden />]} /></button>
      </div>

      {/* Every language by tier, peeking in at the bottom of the screen. */}
      <div ref={listRef} className="mt-7 scroll-mt-6 divide-y divide-line/70 border-t border-line/70 pb-6">
        {TIER_ORDER.slice(1).map((tier) => (
          <div key={tier} role="radiogroup" aria-label={translateUi('{0} languages', [TIERS[tier].name])} className="grid grid-cols-[190px_minmax(0,1fr)] gap-5 py-4">
            <div title={TIERS[tier].includes}>
              <h2 className="text-[12px] font-bold tracking-[0.08em] text-ink-faint uppercase">{TIERS[tier].name}</h2>
              <p className="mt-1 text-[12px] leading-snug text-ink-soft">{SHORT[tier]}</p>
            </div>
            <div className="flex flex-wrap content-start gap-1.5">{LANGUAGES.filter((l) => l.tier === tier).map((l) => chip(l))}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
