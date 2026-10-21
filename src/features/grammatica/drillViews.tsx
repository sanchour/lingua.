// The grammar lesson's exercises, one view per kind (core/grammar/drills.ts makes them).
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { bare, joinTiles } from '@/core/grammar/drills';
import type { Drill } from '@/core/grammar/drills';
import { splitFocus } from '@/core/grammar/types';
import { isRtl } from '@/core/lang/languages';
import { useLayout } from '@/design/hooks/useLayout';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { LETTERS } from '@/features/thesaurus/study/exercises';
import { Choices, PlayBig, useLessonFeel } from '@/features/lesson/kit';
import type { Phase } from '@/features/lesson/kit';

type Of<K extends Drill['kind']> = Extract<Drill, { kind: K }>;

const serif = '[font-family:var(--card-font,var(--font-serif))]';

/** The sentence in the language, sized for a lesson, right to left where the language is. */
function Sentence({ lang, children, className }: { lang: string; children: ReactNode; className?: string }) {
  const rtl = isRtl(lang);
  return (
    <p lang={lang} dir={rtl ? 'rtl' : undefined} className={cx(serif, 'text-center leading-relaxed', rtl ? 'text-[clamp(1.6rem,5vw,2.1rem)]' : 'text-[clamp(1.4rem,4.5vw,1.9rem)]', className)}>
      {children}
    </p>
  );
}

const English = ({ children }: { children: ReactNode }) => <p className="mt-3 text-center text-[15px] text-ink-soft italic">{children}</p>;

/** The gap in a sentence: empty, the chosen form, or the answer once checked. */
function Gap({ shown, phase, answer, lang }: { shown: string | null; phase: Phase; answer: string; lang: string }) {
  return (
    <motion.span
      key={phase === 'answer' ? (shown ?? 'empty') : 'answer'}
      initial={{ scale: 0.92, opacity: 0.6 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={spring.snappy}
      lang={lang}
      className={cx(
        'mx-0.5 inline-block min-w-20 rounded-lg border-b-2 px-2 text-center transition-colors',
        phase === 'right' ? 'border-sage bg-sage-soft' : phase === 'wrong' ? 'border-accent bg-accent-soft' : shown ? 'border-ink' : 'border-line-strong',
      )}
    >
      {phase === 'answer' ? (shown ?? ' ') : answer}
    </motion.span>
  );
}

// ── 1 · Which sentence is right? ────────────────────────────────────────────

export function RecogniseView({ d, lang, value, onChange, phase }: { d: Of<'recognise'>; lang: string; value: number | null; onChange: (v: number) => void; phase: Phase }) {
  return (
    <div className="space-y-6">
      <p className="text-center font-serif text-[clamp(1.25rem,4vw,1.6rem)] leading-snug">{d.item.en}</p>
      <Choices options={d.options} value={value} onChange={onChange} phase={phase} answer={d.answer} lang={lang} dir={isRtl(lang) ? 'rtl' : undefined} wide />
    </div>
  );
}

// ── 1 · Which form do you hear? ─────────────────────────────────────────────

/** Plays the sentence (once on its own, then on a tap); the forms to choose from below. */
export function HearView({ d, lang, value, onChange, phase }: { d: Of<'hear'>; lang: string; value: number | null; onChange: (v: number) => void; phase: Phase }) {
  const { before, focus, after } = splitFocus(d.item.s);
  return (
    <div className="space-y-7">
      <PlayBig lang={lang} text={d.item.s.replace(/[[\]]/g, '')} playKey={d.key} />
      {phase === 'answer' ? (
        <English>{d.item.en}</English>
      ) : (
        <div>
          <Sentence lang={lang}>
            {before}
            <Gap shown={null} phase={phase} answer={bare(focus, lang)} lang={lang} />
            {after}
          </Sentence>
          <English>{d.item.en}</English>
        </div>
      )}
      <Choices options={d.options} value={value} onChange={onChange} phase={phase} answer={d.answer} lang={lang} />
    </div>
  );
}

// ── 2 · Fill the gap ────────────────────────────────────────────────────────

export function PickView({ d, lang, value, onChange, phase }: { d: Of<'pick'>; lang: string; value: number | null; onChange: (v: number) => void; phase: Phase }) {
  return (
    <div className="space-y-7">
      <div>
        <Sentence lang={lang}>
          {d.before}
          <Gap shown={value === null ? null : d.options[value]} phase={phase} answer={d.options[d.answer]} lang={lang} />
          {d.after}
        </Sentence>
        <English>{d.item.en}</English>
      </div>
      <Choices options={d.options} value={value} onChange={onChange} phase={phase} answer={d.answer} lang={lang} />
    </div>
  );
}

// ── 2 · Complete the table ──────────────────────────────────────────────────

export function TableGapView({ d, lang, value, onChange, phase }: { d: Of<'table'>; lang: string; value: number | null; onChange: (v: number) => void; phase: Phase }) {
  const { table } = d;
  const shown = value === null ? null : d.options[value];
  return (
    <div className="space-y-7">
      <div className="overflow-x-auto rounded-2xl border border-line/70 bg-surface">
        {table.title && <p className="border-b border-line/60 px-4 py-2.5 text-[13px] font-bold text-ink-soft">{table.title}</p>}
        <table className="w-full border-collapse text-left text-[15.5px]">
          {table.columns && (
            <thead>
              <tr>
                {table.columns.map((c, i) => (
                  <th key={i} dir="auto" className="border-b border-line/60 px-3.5 py-2 text-[12px] font-bold tracking-wide text-ink-faint uppercase">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {table.rows.map((r, ri) => (
              <tr key={ri} className="border-b border-line/40 last:border-0">
                {r.map((cell, ci) => {
                  const hidden = ri === d.row && ci === d.col;
                  return ci === 0 ? (
                    <th key={ci} dir="auto" scope="row" className="px-3.5 py-2 font-semibold text-ink-soft">
                      {cell}
                    </th>
                  ) : (
                    <td key={ci} dir="auto" lang={lang} className={cx('px-3.5 py-2', serif)}>
                      {hidden ? <Gap shown={shown} phase={phase} answer={d.options[d.answer]} lang={lang} /> : cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Choices options={d.options} value={value} onChange={onChange} phase={phase} answer={d.answer} lang={lang} />
    </div>
  );
}

// ── 3 · Type the form ───────────────────────────────────────────────────────

export function BuildView({ d, lang, value, onChange, phase, onSubmit }: { d: Of<'build'>; lang: string; value: string; onChange: (v: string) => void; phase: Phase; onSubmit: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const { pointer } = useLayout();
  useEffect(() => {
    const t = window.setTimeout(() => input.current?.focus(), 140);
    return () => window.clearTimeout(t);
  }, [d.key]);
  const insert = (ch: string) => {
    const el = input.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + ch + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + ch.length, start + ch.length);
    });
  };
  const { focus } = splitFocus(d.item.s);
  const rtl = isRtl(lang);
  return (
    <div className="space-y-6">
      <div>
        <Sentence lang={lang}>
          {d.before}
          <Gap shown={value.trim() ? value : null} phase={phase} answer={focus} lang={lang} />
          {d.after}
        </Sentence>
        <English>{d.item.en}</English>
      </div>
      {(d.item.base || d.item.cue) && (
        <div className="flex flex-wrap justify-center gap-2">
          {d.item.base && (
            <span lang={lang} dir="auto" className="rounded-full bg-sunken px-3 py-1 font-serif text-[16px]">
              {d.item.base}
            </span>
          )}
          {d.item.cue && <span className="rounded-full bg-sage-soft px-3 py-1 text-[14px] font-semibold text-sage-text">{d.item.cue}</span>}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <input
          ref={input}
          lang={lang}
          dir={rtl ? 'rtl' : undefined}
          value={value}
          readOnly={phase !== 'answer'}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type the missing form"
          aria-label="The missing form"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className={cx(
            'h-16 w-full rounded-2xl border-2 bg-raised px-5 text-center text-2xl outline-none transition-colors placeholder:font-sans placeholder:text-base placeholder:text-ink-faint',
            serif,
            phase === 'right' ? 'border-sage' : phase === 'wrong' ? 'border-accent' : 'border-line focus:border-ink',
          )}
        />
      </form>
      {phase === 'answer' && LETTERS[lang] && pointer === 'fine' && (
        <div className="flex flex-wrap justify-center gap-1.5" aria-label="Special letters">
          {LETTERS[lang].map((ch) => (
            <button
              key={ch}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insert(ch)}
              className={cx('grid size-9 place-items-center rounded-lg border border-line bg-raised text-lg transition-colors hover:border-line-strong', serif)}
            >
              {ch}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 1 · Match the pairs ─────────────────────────────────────────────────────

/** Tap a label, then its form. Matched pairs settle into sage, a wrong pair shakes; done when all match. */
export function PairsView({ d, lang, onDone, random }: { d: Of<'pairs'>; lang: string; onDone: (mistakes: number) => void; random: () => number }) {
  const left = d.pairs.map((p) => p[0]);
  const right = useMemo(() => [...d.pairs].sort(() => random() - 0.5).map((p) => p[1]), [d.pairs, random]);
  const [pick, setPick] = useState<{ side: 'l' | 'r'; i: number } | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [shake, setShake] = useState<string[]>([]);
  const mistakes = useRef(0);
  const { cue } = useLessonFeel();
  const pairOf = (side: 'l' | 'r', i: number) => (side === 'l' ? i : d.pairs.findIndex((p) => p[1] === right[i]));

  const choose = (side: 'l' | 'r', i: number) => {
    const pair = pairOf(side, i);
    if (matched.has(pair)) return;
    if (!pick || pick.side === side) {
      cue('tap');
      setPick({ side, i });
      return;
    }
    if (pairOf(pick.side, pick.i) === pair) {
      const next = new Set(matched).add(pair);
      setMatched(next);
      setPick(null);
      cue('right');
      if (next.size === d.pairs.length) window.setTimeout(() => onDone(mistakes.current), 300);
    } else {
      mistakes.current++;
      cue('wrong');
      setShake([`${pick.side}:${pick.i}`, `${side}:${i}`]);
      setPick(null);
      window.setTimeout(() => setShake([]), 360);
    }
  };

  const cell = (side: 'l' | 'r', i: number, text: string) => {
    const pair = pairOf(side, i);
    const done = matched.has(pair);
    const picked = pick?.side === side && pick.i === i;
    return (
      <motion.button
        key={`${side}${i}`}
        type="button"
        disabled={done}
        onClick={() => choose(side, i)}
        animate={shake.includes(`${side}:${i}`) ? { x: [0, -6, 6, -4, 4, 0] } : done ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.32 }}
        lang={side === 'r' ? lang : undefined}
        dir="auto"
        className={cx(
          'no-callout min-h-14 rounded-2xl border-2 px-3 py-2.5 text-[16px] font-semibold transition-colors',
          side === 'r' && serif,
          done ? 'border-sage/50 bg-sage-soft text-sage-text opacity-70' : picked ? 'border-ink bg-raised' : 'border-line bg-raised hover:border-line-strong',
        )}
      >
        {text}
      </motion.button>
    );
  };
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <div className="grid gap-2.5">{left.map((t, i) => cell('l', i, t))}</div>
      <div className="grid gap-2.5">{right.map((t, i) => cell('r', i, t))}</div>
    </div>
  );
}

// ── 4/5 · Tiles ─────────────────────────────────────────────────────────────

/** Tap tiles into the line (or back out). Right to left for Arabic; no spaces for Mandarin. */
export function TilesView({ d, lang, value, onChange, phase }: { d: Of<'order'> | Of<'say'>; lang: string; value: number[]; onChange: (v: number[]) => void; phase: Phase }) {
  const locked = phase !== 'answer';
  const rtl = isRtl(lang);
  const { cue } = useLessonFeel();
  return (
    <div className="space-y-7">
      {d.kind === 'say' ? (
        <p className="text-center font-serif text-[clamp(1.3rem,4vw,1.7rem)] leading-snug">{d.item.en}</p>
      ) : (
        <p className="text-center text-[15px] text-ink-soft italic">{d.item.en}</p>
      )}
      <div
        dir={rtl ? 'rtl' : undefined}
        className={cx(
          'flex min-h-[7.5rem] flex-wrap content-start gap-2 rounded-2xl border-2 border-dashed p-3 transition-colors',
          phase === 'right' ? 'border-sage bg-sage-soft' : phase === 'wrong' ? 'border-accent bg-accent-soft' : 'border-line',
        )}
      >
        <AnimatePresence initial={false}>
          {value.map((i) => (
            <motion.button
              layout
              key={i}
              type="button"
              disabled={locked}
              onClick={() => {
                cue('tap');
                onChange(value.filter((v) => v !== i));
              }}
              initial={{ opacity: 0, scale: 0.85, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
              transition={spring.snappy}
              lang={lang}
              className={cx('no-callout rounded-xl border border-line bg-raised px-3 py-2 text-[18px] shadow-elev-1', serif)}
            >
              {d.tiles[i]}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
      {phase === 'wrong' && (
        <Sentence lang={lang} className="!text-lg">
          {joinTiles(d.answer, lang)}
        </Sentence>
      )}
      <div dir={rtl ? 'rtl' : undefined} className="flex flex-wrap justify-center gap-2">
        {d.tiles.map((t, i) => {
          const used = value.includes(i);
          return (
            <button
              key={i}
              type="button"
              disabled={locked || used}
              onClick={() => {
                cue('tap');
                onChange([...value, i]);
              }}
              lang={lang}
              className={cx(
                'no-callout rounded-xl border px-3 py-2 text-[18px] transition-[opacity,transform] duration-150 active:scale-95',
                serif,
                used ? 'border-transparent bg-sunken text-transparent' : 'border-line bg-raised shadow-elev-1 hover:border-line-strong',
              )}
            >
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── 4 · Tap the wrong word ──────────────────────────────────────────────────

export function SpotView({ d, lang, value, onChange, phase }: { d: Of<'spot'>; lang: string; value: number | null; onChange: (v: number) => void; phase: Phase }) {
  const rtl = isRtl(lang);
  // Without spaces between words, each word gets a faint frame so the words can be told apart.
  const unspaced = lang === 'zh' || lang === 'ja';
  const sep = unspaced ? 'gap-x-1' : 'gap-x-0.5';
  const { cue } = useLessonFeel();
  const right = bare(splitFocus(d.item.s).focus, lang);
  return (
    <div className="space-y-7">
      <p className="text-center text-[15px] text-ink-soft italic">{d.item.en}</p>
      <div dir={rtl ? 'rtl' : undefined} className={cx('flex flex-wrap justify-center gap-y-3', sep)}>
        {d.tokens.map((t, i) => {
          const chosen = value === i;
          const reveal = phase !== 'answer';
          const isWrong = i === d.wrongAt;
          return (
            <motion.button
              key={i}
              type="button"
              disabled={reveal}
              onClick={() => {
                cue('tap');
                onChange(i);
              }}
              animate={reveal && chosen && !isWrong ? { x: [0, -5, 5, -3, 3, 0] } : {}}
              transition={{ duration: 0.3 }}
              lang={lang}
              className={cx(
                'no-callout relative rounded-xl border-2 px-1.5 py-1 text-[clamp(1.3rem,4.4vw,1.7rem)] transition-colors',
                serif,
                reveal && isWrong ? 'border-accent bg-accent-soft' : chosen ? 'border-ink bg-raised' : unspaced ? 'border-line/70 bg-raised/60 hover:border-line-strong' : 'border-transparent hover:border-line hover:bg-raised',
              )}
            >
              {reveal && isWrong ? (
                <>
                  <span className="text-ink-faint line-through decoration-accent decoration-2">{t}</span>{' '}
                  <span className="font-semibold text-sage-text">{right}</span>
                </>
              ) : (
                t
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ── 5 · Your own sentence (with an AI key) ──────────────────────────────────

/** A sentence of the learner's own using the topic; the AI checks it. One real example as a model. */
export function OwnView({
  d,
  topic,
  lang,
  value,
  onChange,
  phase,
  checking,
  error,
  onSubmit,
}: {
  d: Of<'own'>;
  topic: { title: string; summary: string };
  lang: string;
  value: string;
  onChange: (v: string) => void;
  phase: Phase;
  checking: boolean;
  error?: string;
  onSubmit: () => void;
}) {
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const t = window.setTimeout(() => area.current?.focus(), 140);
    return () => window.clearTimeout(t);
  }, [d.key]);
  const rtl = isRtl(lang);
  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="font-serif text-[clamp(1.25rem,4vw,1.6rem)] leading-snug">Write a sentence of your own with {topic.title.toLowerCase().startsWith('the ') ? topic.title.toLowerCase() : `“${topic.title}”`}.</p>
        <p className="mt-2 text-[14px] text-ink-soft">For example:</p>
        <p lang={lang} dir={rtl ? 'rtl' : undefined} className={cx(serif, 'mt-1 text-[18px]')}>
          {d.example.s.replace(/[[\]]/g, '')}
        </p>
      </div>
      <textarea
        ref={area}
        lang={lang}
        dir={rtl ? 'rtl' : 'auto'}
        value={value}
        readOnly={phase !== 'answer' || checking}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
          }
        }}
        rows={3}
        placeholder="Your sentence"
        aria-label="Your sentence"
        spellCheck={false}
        className={cx(
          'w-full resize-none rounded-2xl border-2 bg-raised px-5 py-4 text-xl outline-none transition-colors placeholder:font-sans placeholder:text-base placeholder:text-ink-faint',
          serif,
          phase === 'right' ? 'border-sage' : phase === 'wrong' ? 'border-accent' : 'border-line focus:border-ink',
        )}
      />
      <p className="min-h-5 text-center text-[13.5px] text-ink-soft" aria-live="polite">
        {checking ? 'Reading your sentence…' : error ? <span className="text-accent-text">{error}</span> : phase === 'answer' ? 'Checked by your AI (Settings › AI). It doesn’t move your schedule.' : ''}
      </p>
    </div>
  );
}
