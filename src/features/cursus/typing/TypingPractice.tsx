import { UiText, useUi } from '@/design/i18n/UiText';
// Cursus › Typing (5.1-4a): keybr's way for the core languages. A line of words made of the letters
// unlocked so far, typed on the language's own layout read from the physical keys (or the learner's
// installed one); a wrong key is counted and the right one still has to be found. After each line the
// progress is kept, and the next letter joins once every letter is at the target speed.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Lock, Sparkles } from 'lucide-react';
import { getReaderFont, readerFontStack } from '@/design/fonts';
import { fingerFor, howToType, keysFor, LANG_LAYOUT, layoutName, pressKey } from '@/core/typing/layouts';
import { focusLetter, letterReady, lineOfSyllables, lineOfWords, MIN_HITS, nextUnlock, recordPress, trigrams, unlockedLetters, wpmOf } from '@/core/typing/lesson';
import type { TypingData } from '@/core/typing/types';
import { recordTyping, saveTyping } from '@/data/typing';
import { useSettings } from '@/data/settings';
import type { TypingRow } from '@/data/types';
import { Card, Segmented, Select } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { CharacterPractice } from './CharacterPractice';
import { Keyboard } from './Keyboard';

interface Run {
  items: Array<{ text: string; hint?: string }>;
  text: string;
  pos: number;
  /** Places where a wrong key was pressed. */
  wrong: Set<number>;
  dead: string | null;
  lastAt: number | null;
  startedAt: number;
  activeMs: number;
  presses: number;
  misses: number;
}

const TARGETS = ['20', '25', '30', '35', '40', '50'] as const;

/** Keys that type nothing here and are left to the browser. */
const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

export function TypingPractice({ lang, data, saved }: { lang: string; data: TypingData; saved: TypingRow }) {
  const translateUi = useUi();
  const settings = useSettings();
  const [row, setRow] = useState(saved);
  const rowRef = useRef(row);
  /** Keys change the progress many times a second: kept in the ref at once, drawn on the next render. */
  const update = (p: TypingRow) => {
    rowRef.current = p;
    setRow(p);
  };
  const layout = LANG_LAYOUT[lang];
  const zh = lang === 'zh';
  const rtl = lang === 'ar';
  const model = useMemo(() => trigrams(data.words), [data]);
  const focus = focusLetter(data, row);

  const newRun = (p: TypingRow): Run => {
    const have = unlockedLetters(data, p);
    const f = focusLetter(data, p);
    const items = zh ? lineOfSyllables(data, have, f, 10) : lineOfWords(data, model, have, f, rtl ? 7 : 9).map((text) => ({ text }));
    return { items, text: items.map((i) => i.text).join(' '), pos: 0, wrong: new Set(), dead: null, lastAt: null, startedAt: Date.now(), activeMs: 0, presses: 0, misses: 0 };
  };
  const run = useRef<Run>(newRun(row));
  const [, setTick] = useState(0);
  const [last, setLast] = useState<{ wpm: number; acc: number } | null>(null);
  const [unlocked, setUnlocked] = useState<string | null>(null);
  const [miss, setMiss] = useState(0);

  const finishLine = () => {
    const r = run.current;
    const minutes = r.activeMs / 60_000;
    setLast({ wpm: minutes > 0 ? Math.round(r.text.length / 5 / minutes) : 0, acc: r.presses ? Math.round(((r.presses - r.misses) / r.presses) * 100) : 100 });
    let p = rowRef.current;
    const joined = nextUnlock(data, p);
    if (joined) {
      p = { ...p, unlocked: unlockedLetters(data, p).length + 1 };
      setUnlocked(joined);
    }
    update(p);
    void saveTyping(p);
    void recordTyping(lang, r.startedAt, r.activeMs);
    run.current = newRun(p);
  };

  useEffect(() => {
    if (zh && row.zhMode === 'chars') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || e.repeat) return;
      const r = run.current;
      let char: string | undefined;
      if (rowRef.current.ownLayout) {
        if (e.key === 'Dead') return e.preventDefault();
        if (e.key.length !== 1) return;
        char = e.key === 'v' && zh ? 'ü' : e.key;
      } else {
        const typed = pressKey(layout, e.code, e.shiftKey, r.dead);
        if (typed.char === undefined && typed.dead === r.dead) return;
        r.dead = typed.dead;
        char = typed.char;
        if (char === undefined) {
          e.preventDefault();
          setTick((t) => t + 1);
          return;
        }
      }
      e.preventDefault();
      const expected = r.text[r.pos];
      const now = performance.now();
      const gap = r.lastAt === null ? null : now - r.lastAt;
      if (gap !== null) r.activeMs += Math.min(gap, 3000);
      r.presses++;
      if (char === expected) {
        const p = rowRef.current;
        if (expected !== ' ') update({ ...p, stats: { ...p.stats, [expected]: recordPress(p.stats[expected], true, r.wrong.has(r.pos) ? null : gap) } });
        r.pos++;
        r.lastAt = now;
        if (r.pos >= r.text.length) finishLine();
      } else {
        r.misses++;
        const p = rowRef.current;
        if (!r.wrong.has(r.pos) && expected !== ' ') update({ ...p, stats: { ...p.stats, [expected]: recordPress(p.stats[expected], false, null) } });
        r.wrong.add(r.pos);
        setMiss((m) => m + 1);
      }
      setTick((t) => t + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // The run and the row are read through refs; the listener only changes with the mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, zh, row.zhMode]);

  const setOption = (patch: Partial<TypingRow>) => {
    const p = { ...rowRef.current, ...patch };
    update(p);
    void saveTyping(p);
    if ('zhMode' in patch) run.current = newRun(p);
  };

  const r = run.current;
  const expected = r.text[r.pos] ?? ' ';
  const keys = keysFor(layout, expected);
  const nextKey = r.dead && keys.length > 1 ? keys[1] : keys[0];
  const fontStyle = { fontFamily: settings ? readerFontStack(getReaderFont(settings.reader.font), lang) : undefined } as CSSProperties;

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-4">
        <LetterStrip data={data} row={row} focus={focus} />
        {zh && (
          <Segmented
            label={translateUi('What to practise')}
            value={row.zhMode ?? 'pinyin'}
            onChange={(zhMode) => setOption({ zhMode })}
            options={[
              { value: 'pinyin', label: translateUi('Pinyin, letter by letter') },
              { value: 'chars', label: translateUi('Characters: type pinyin, pick 1–5') },
            ]}
          />
        )}
        <AnimatePresence>
          {unlocked && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring.soft}>
              <Card className="flex items-start gap-4 p-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent font-serif text-2xl font-semibold text-on-accent" lang={lang}>
                  {unlocked}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-[14px] font-semibold"><UiText source={'{0} A new letter joins: {1}'} values={[<Sparkles size={15} className="text-accent-text" aria-hidden />, unlocked]} /></p>
                  <p className="mt-0.5 text-[13px] text-ink-soft">{howToType(layout, unlocked) ?? 'It turns up more often for a while, until it’s as quick as the rest.'}</p>
                </div>
                <button type="button" onClick={() => setUnlocked(null)} className="text-[13px] font-semibold text-ink-soft hover:text-ink"><UiText source={'Got it'} /></button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
        {zh && row.zhMode === 'chars' ? (
          <CharacterPractice data={data} lang={lang} />
        ) : (
          <>
            <Card className="px-6 py-5 sm:py-6">
              <motion.p
                key={miss}
                lang={lang}
                dir={rtl ? 'rtl' : undefined}
                animate={miss ? { x: [0, -4, 4, -2, 0] } : undefined}
                transition={{ duration: 0.22 }}
                className={cx('flex flex-wrap gap-y-4 text-[28px] leading-tight', zh ? 'gap-x-5' : 'gap-x-[0.35em]')}
                style={fontStyle}
                aria-label={r.text}
              >
                {(() => {
                  let at = 0;
                  return r.items.map((item, w) => {
                    const start = at;
                    at += item.text.length + 1;
                    return (
                      <span key={w} className="inline-flex flex-col items-center">
                        {item.hint && <span className="mb-0.5 font-serif text-[17px] text-ink-faint">{item.hint}</span>}
                        <span>
                          {[...item.text].map((c, i) => {
                            const p = start + i;
                            return (
                              <span
                                key={i}
                                className={cx(
                                  'rounded-[3px]',
                                  p < r.pos ? (r.wrong.has(p) ? 'text-accent-text' : 'text-ink-faint') : p === r.pos ? 'bg-accent-soft text-ink underline decoration-accent decoration-2 underline-offset-[6px]' : 'text-ink',
                                )}
                              >
                                {c}
                              </span>
                            );
                          })}
                          {r.pos === start + item.text.length && w < r.items.length - 1 && <span className="ml-0.5 inline-block w-3 rounded-[3px] bg-accent-soft align-middle">&nbsp;</span>}
                        </span>
                      </span>
                    );
                  });
                })()}
              </motion.p>
              <p className="mt-4 text-[13px] text-ink-faint">
                {expected === ' ' ? translateUi('Space') : translateUi('Next: {0}', [expected])}
                {nextKey && !row.ownLayout ? translateUi(' · {0} finger{1}{2}', [fingerFor(nextKey.code), nextKey.shift ? ', with shift' : '', keys.length > 1 && !r.dead ? ' (two keys: the accent first)' : '']) : ''}
                {last ? translateUi(' · last line {0} wpm, {1}% right', [last.wpm, last.acc]) : translateUi(' · just start typing')}
              </p>
            </Card>
            {!row.ownLayout && <Keyboard layout={layout} next={nextKey?.code ?? null} shift={Boolean(nextKey?.shift)} rtl={rtl} />}
          </>
        )}
      </div>
      <aside className="space-y-4 xl:sticky xl:top-6">
        <Card className="space-y-4 p-5">
          <Segmented
            label={translateUi('Keyboard')}
            block
            value={row.ownLayout ? 'own' : 'lingua'}
            onChange={(v) => setOption({ ownLayout: v === 'own' })}
            options={[
              { value: 'lingua', label: translateUi('Lingua’s map') },
              { value: 'own', label: translateUi('I have this layout') },
            ]}
          />
          <p className="text-[12.5px] leading-snug text-ink-soft">
            {row.ownLayout
              ? translateUi('Your computer’s own layout types the letters; switch it on in your system’s keyboard settings.')
              : translateUi('Your keys type the {0} layout, whatever your keyboard says, so you can practise before installing it.', [layoutName(layout)])}
          </p>
          <Select label={translateUi('Target speed')} value={String(row.target) as (typeof TARGETS)[number]} onChange={(v) => setOption({ target: Number(v) })} options={TARGETS.map((t) => ({ value: t, label: `${t} words a minute` }))} />
        </Card>
        <LetterBars data={data} row={row} focus={focus} lang={lang} />
      </aside>
    </div>
  );
}

/** Every letter of the language: the ones unlocked (ready ones in sage, the focus ringed) and the ones still to come. */
function LetterStrip({ data, row, focus }: { data: TypingData; row: TypingRow; focus: string }) {
  const have = unlockedLetters(data, row);
  return (
    <div className="flex flex-wrap items-center gap-1.5" lang={data.lang} dir={data.lang === 'ar' ? 'rtl' : undefined}>
      {data.letters.map(([c], i) => {
        const open = i < have.length;
        const ready = letterReady(row.stats[c], row.target);
        return (
          <span
            key={c}
            title={open ? (ready ? `${c}: at the target speed` : `${c}: practising`) : `${c}: unlocks later`}
            className={cx(
              'grid size-8 place-items-center rounded-lg text-[15px] font-semibold',
              !open ? 'bg-sunken text-ink-faint/60' : ready ? 'bg-sage-soft text-sage-text' : 'bg-raised text-ink shadow-elev-1',
              c === focus && 'ring-2 ring-accent',
            )}
          >
            {open || i > have.length ? c : <Lock size={12} aria-label={`${c}, next`} />}
          </span>
        );
      })}
    </div>
  );
}

/** Each unlocked letter's speed against the target and its accuracy. */
function LetterBars({ data, row, focus, lang }: { data: TypingData; row: TypingRow; focus: string; lang: string }) {
  const have = unlockedLetters(data, row);
  return (
    <Card className="p-5">
      <p className="text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase"><UiText source={'Your letters'} /></p>
      <ul className="mt-3 space-y-2" lang={lang}>
        {have.map((c) => {
          const s = row.stats[c];
          const wpm = s && s.hits >= 3 ? Math.round(wpmOf(s.ms)) : 0;
          return (
            <li key={c} className="flex items-center gap-2.5 text-[13px]">
              <span className={cx('w-5 text-center text-[16px] font-semibold', c === focus && 'text-accent-text')}>{c}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
                <span className={cx('block h-full origin-left rounded-full', letterReady(s, row.target) ? 'bg-sage' : 'bg-accent')} style={{ transform: `scaleX(${Math.min(1, wpm / row.target)})` }} />
              </span>
              <span className="w-16 text-right text-ink-faint tabular-nums">{s && s.hits >= MIN_HITS ? `${wpm} · ${Math.round(s.acc * 100)}%` : s ? `${s.hits}/${MIN_HITS}` : '—'}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[12px] leading-snug text-ink-faint"><UiText source={'A new letter joins when every one is at {0} words a minute and 95% right.'} values={[row.target]} /></p>
    </Card>
  );
}
