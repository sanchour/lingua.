import { UiText, useUi } from '@/design/i18n/UiText';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus, X } from 'lucide-react';
import { getLanguage } from '@/core/lang/languages';
import type { CefrLevel } from '@/data/types';
import { LanguageFlag } from '@/design/flags';
import { spring } from '@/design/motion';
import { SearchInput, searchKey } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { StepTitle } from './StepTitle';

/** A language the learner already speaks: native, or a level. */
export interface Spoken {
  /** An ISO 639 code (Lingua's own where it has the language). */
  code: string;
  level: 'native' | Exclude<CefrLevel, 'A0'>;
}

/** The levels below native, as signal bars from A1 up. */
const BARS: Array<Exclude<Spoken['level'], 'native'>> = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const LEVEL_NAME: Record<Spoken['level'], string> = {
  A1: 'Beginner',
  A2: 'Elementary',
  B1: 'Intermediate',
  B2: 'Upper intermediate',
  C1: 'Advanced',
  C2: 'Mastery',
  native: 'Native',
};

/** "Hello" in the languages people speak most; the others show their name. */
const HELLO: Record<string, string> = {
  en: 'Hello', nl: 'Hallo', de: 'Hallo', fr: 'Bonjour', es: 'Hola', it: 'Ciao', pt: 'Olá', ru: 'Привет', uk: 'Привіт', pl: 'Cześć', cs: 'Ahoj', sk: 'Ahoj',
  sv: 'Hej', da: 'Hej', nb: 'Hei', no: 'Hei', fi: 'Hei', is: 'Halló', el: 'Γειά σου', hu: 'Szia', ro: 'Salut', bg: 'Здравей', hr: 'Bok', sr: 'Здраво', sl: 'Živjo',
  tr: 'Merhaba', ar: 'مرحبا', he: 'שלום', fa: 'سلام', ur: 'سلام', hi: 'नमस्ते', bn: 'নমস্কার', zh: '你好', yue: '你好', ja: 'こんにちは', ko: '안녕하세요',
  vi: 'Xin chào', th: 'สวัสดี', id: 'Halo', ms: 'Helo', tl: 'Kumusta', sw: 'Jambo', af: 'Hallo', ca: 'Hola', eu: 'Kaixo', gl: 'Ola', ga: 'Dia duit', cy: 'Helo', lt: 'Labas', lv: 'Sveiki', et: 'Tere',
};
const RTL = new Set(['ar', 'he', 'fa', 'ur', 'yi', 'ps']);

/** One click to add, for the languages people speak most. */
const QUICK = ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ru', 'zh', 'ar', 'hi', 'ja', 'tr', 'pl', 'sv', 'ko'];

/** What a count of languages makes you. */
function polyglot(n: number): string {
  return n <= 1 ? 'Monolingual, for now' : n === 2 ? 'Bilingual' : n === 3 ? 'Trilingual' : 'Polyglot';
}

// Every ISO 639-1 language, named by the browser: the "You speak" search isn't limited to Lingua's languages.
const ISO_639_1 =
  'aa ab af ak am an ar as av ay az ba be bg bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi vo wa wo xh yi yo za zh zu yue';

const displayNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['en'], { type: 'language' }) : null;

/** A language's English name: Lingua's own, else the browser's. */
export function spokenName(code: string): string {
  const own = getLanguage(code)?.name;
  if (own) return own;
  try {
    return displayNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

const ALL = ISO_639_1.split(' ')
  .map((code) => ({ code, name: spokenName(code) }))
  .filter((l) => l.name && l.name !== l.code)
  .sort((a, b) => a.name.localeCompare(b.name));

/** Lingua's flag for the language, or its code on a small tag. */
function Mark({ code, width }: { code: string; width: number }) {
  return getLanguage(code) ? (
    <LanguageFlag lang={code} width={width} />
  ) : (
    <span className="grid place-items-center rounded-[4px] bg-sunken text-[10px] font-bold text-ink-faint uppercase" style={{ width, height: Math.round(width * 0.68) }}>
      {code}
    </span>
  );
}

interface SpeakStepProps {
  spoken: Spoken[];
  /** The language being learned: not offered here. */
  target: string | null;
  onSpoken: (spoken: Spoken[]) => void;
}

/**
 * Which languages do you already speak (5.1-2b), in one centred column: each language a card saying
 * hello in it, with its level as signal bars or native; the device's language is there first. Under
 * them, adding one: a search of every language or one-click flags, and straight away how well. They
 * go into Tabula, and the first native language Lingua knows becomes the language translations are
 * given in.
 */
export function SpeakStep({ spoken, target, onSpoken }: SpeakStepProps) {
  const translateUi = useUi();
  const [query, setQuery] = useState('');
  /** The language being added, waiting for its level. */
  const [pending, setPending] = useState<string | null>(null);
  const q = searchKey(query.trim());
  const taken = (code: string) => code === target || spoken.some((s) => s.code === code);
  const found = useMemo(() => (q ? ALL.filter((l) => !taken(l.code) && searchKey(l.name).includes(q)).slice(0, 6) : []), [q, spoken, target]);
  const quick = QUICK.filter((code) => !taken(code)).slice(0, 10);

  const setLevel = (code: string, level: Spoken['level']) => onSpoken(spoken.map((s) => (s.code === code ? { ...s, level } : s)));
  const remove = (code: string) => onSpoken(spoken.filter((s) => s.code !== code));
  const pick = (code: string) => {
    setPending(code);
    setQuery('');
  };
  const add = (level: Spoken['level']) => {
    if (pending) onSpoken([...spoken, { code: pending, level }]);
    setPending(null);
  };

  return (
    <div>
      <StepTitle center title={translateUi('Which languages do you already speak?')} body="Your mother tongue and any others. Bragging is allowed." />

      <div className="mb-3 flex items-baseline justify-center gap-3">
        <h2 className="text-[12px] font-bold tracking-[0.08em] text-ink-faint uppercase"><UiText source={'You speak'} /></h2>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={polyglot(spoken.length)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={spring.snappy} className="font-serif text-[15px] font-semibold text-accent-text italic">
            {polyglot(spoken.length)}
          </motion.span>
        </AnimatePresence>
      </div>
      <ul className="flex flex-wrap justify-center gap-3">
        <AnimatePresence initial={false}>
          {spoken.map((s) => {
            const name = spokenName(s.code);
            const native = s.level === 'native';
            const at = s.level === 'native' ? BARS.length : BARS.indexOf(s.level) + 1;
            return (
              <motion.li
                key={s.code}
                layout
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={spring.snappy}
                className="group relative w-[calc(50%-0.375rem)] rounded-[22px] border border-line bg-raised p-4"
              >
                <button
                  type="button"
                  onClick={() => remove(s.code)}
                  aria-label={translateUi('Remove {0}', [name])}
                  className="absolute top-2.5 right-2.5 grid size-7 place-items-center rounded-lg text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface hover:text-ink focus-visible:opacity-100"
                >
                  <X size={15} aria-hidden />
                </button>
                <div className="flex items-center gap-3">
                  <Mark code={s.code} width={34} />
                  <div className="min-w-0">
                    <p lang={s.code} dir={RTL.has(s.code) ? 'rtl' : undefined} className="truncate font-serif text-[22px] leading-tight font-semibold">
                      {HELLO[s.code] ?? name}
                      {HELLO[s.code] && <span className="text-accent-text">!</span>}
                    </p>
                    <p className="truncate text-[12.5px] text-ink-faint">{name}</p>
                  </div>
                </div>
                <div className="mt-3.5 flex items-end gap-3">
                  {/* The level as signal bars, A1 to C2; native fills them all. */}
                  <div role="radiogroup" aria-label={translateUi('How well you speak {0}', [name])} className="flex items-end gap-1">
                    {BARS.map((level, i) => (
                      <button
                        key={level}
                        type="button"
                        role="radio"
                        aria-checked={s.level === level}
                        aria-label={`${level}, ${LEVEL_NAME[level]}`}
                        title={`${level} · ${LEVEL_NAME[level]}`}
                        onClick={() => setLevel(s.code, level)}
                        className="flex h-6 w-3.5 items-end"
                      >
                        <span className={cx('block w-full rounded-[3px] transition-colors duration-200', i < at ? (native ? 'bg-sage' : 'bg-accent') : 'bg-line-strong/70 hover:bg-line-strong')} style={{ height: 8 + i * 3.2 }} />
                      </button>
                    ))}
                  </div>
                  <p className="min-w-0 flex-1 truncate text-[12.5px] leading-tight">
                    <span className="font-semibold">{native ? translateUi('Native') : s.level}</span>
                    {!native && <span className="text-ink-soft"> · {LEVEL_NAME[s.level]}</span>}
                  </p>
                  <button
                    type="button"
                    aria-pressed={native}
                    onClick={() => setLevel(s.code, native ? 'C1' : 'native')}
                    className={cx('h-7 shrink-0 rounded-full border px-2.5 text-[12px] font-semibold transition-colors', native ? 'border-sage bg-sage text-on-accent' : 'border-line text-ink-soft hover:border-line-strong')}
                  ><UiText source={'Native'} /></button>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      {/* Adding one: pick a language, then straight away how well. */}
      <div className="mt-4 rounded-[22px] border border-dashed border-line-strong p-4">
        <AnimatePresence mode="wait" initial={false}>
          {pending ? (
            <motion.div key="level" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={spring.snappy}>
              <div className="flex items-center gap-3">
                <Mark code={pending} width={28} />
                <p className="min-w-0 flex-1 text-[15px]"><UiText source={'How well do you speak {0}?'} values={[<span className="font-semibold">{spokenName(pending)}</span>]} /></p>
                <button type="button" onClick={() => setPending(null)} aria-label={translateUi('Cancel')} className="grid size-8 place-items-center rounded-lg text-ink-faint hover:bg-surface hover:text-ink">
                  <X size={16} aria-hidden />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-7 gap-1.5">
                {[...BARS, 'native' as const].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => add(level)}
                    className="no-callout flex flex-col items-center rounded-xl border border-line bg-raised px-1 py-2 transition-[transform,border-color,background-color] duration-150 hover:-translate-y-0.5 hover:border-accent hover:bg-accent-soft active:scale-[0.97]"
                  >
                    <span className="text-[14px] font-bold">{level === 'native' ? translateUi('Native') : level}</span>
                    <span className="mt-0.5 truncate text-[11px] text-ink-faint">{level === 'native' ? translateUi('From birth') : LEVEL_NAME[level]}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="add" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={spring.snappy}>
              <div className="relative">
                <SearchInput value={query} onChange={setQuery} placeholder={translateUi('Add a language: any language in the world')} />
                {found.length > 0 && (
                  <ul className="absolute inset-x-0 top-full z-10 mt-1.5 overflow-hidden rounded-2xl border border-line bg-raised py-1 shadow-elev-2">
                    {found.map((l) => (
                      <li key={l.code}>
                        <button type="button" onClick={() => pick(l.code)} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[14.5px] hover:bg-surface">
                          <Plus size={15} className="text-ink-faint" aria-hidden />
                          {l.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {quick.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => pick(code)}
                    className="no-callout inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-raised pr-3 pl-1.5 text-[13px] transition-[transform,border-color] duration-150 hover:-translate-y-0.5 hover:border-line-strong active:scale-[0.97]"
                  >
                    <Mark code={code} width={20} />
                    {spokenName(code)}
                    <Plus size={13} className="text-ink-faint" aria-hidden />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="mt-3 text-center text-[12.5px] text-ink-faint"><UiText source={'These go into Tabula, in Ratio, where you can add how you learned them and your certificates later.'} /></p>
    </div>
  );
}
