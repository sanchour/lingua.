import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, RotateCcw, X } from 'lucide-react';
import type { CheckItem } from '@/core/text/checks';
import { useApp } from '@/app/context';
import { recordSession } from '@/data/activity';
import { aiBlock } from '@/data/plan';
import { isEditable } from '@/design/hooks/useHotkeys';
import { Button, Kbd } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { storyQuestions } from '@/services/llm/storyQuestions';

const PROMPT: Record<CheckItem['kind'], string> = {
  gap: 'Which word is missing?',
  meaning: 'Which word means…',
  order: 'Put the sentence back in order',
  story: 'About the story',
};

/**
 * "Check yourself" on the end page (5.1-3a): folded until asked for, one question at a time, made
 * from the text itself; with Max and a key, two questions about the story follow. The answers count
 * in Ratio like a round of Ludus.
 */
export function CheckYourself({ lang, refId, words, source }: { lang: string; refId: string; words: CheckItem[]; source: string }) {
  const { settings } = useApp();
  const ai = aiBlock(settings, settings.llm.provider) === null;
  const [open, setOpen] = useState(false);
  const [story, setStory] = useState<CheckItem[]>([]);
  const items = useMemo(() => [...words, ...story], [words, story]);
  const [index, setIndex] = useState(0);
  const [right, setRight] = useState(0);
  const [result, setResult] = useState<boolean | null>(null);
  const startedAt = useRef(0);
  const done = index >= items.length;
  const doneRef = useRef(false);
  doneRef.current = done;

  useEffect(() => {
    if (open && !startedAt.current) startedAt.current = Date.now();
  }, [open]);

  // Asked for as the panel opens; they arrive while you answer the word questions, and are left out
  // if you are through before they come.
  const asked = useRef(false);
  useEffect(() => {
    if (!open || !ai || asked.current) return;
    asked.current = true;
    storyQuestions(lang, source)
      .then((q) => {
        if (!doneRef.current) setStory(q);
      })
      .catch(() => {});
  }, [open, ai, lang, source]);

  const answer = (ok: boolean) => {
    setResult(ok);
    if (ok) setRight((r) => r + 1);
  };
  const next = () => {
    setResult(null);
    if (index + 1 === items.length) void recordSession({ lang, type: 'ludus', refId, startedAt: startedAt.current, endedAt: Date.now(), activeMs: Date.now() - startedAt.current, cards: items.length, correct: right });
    setIndex((i) => i + 1);
  };
  const again = () => {
    startedAt.current = Date.now();
    setIndex(0);
    setRight(0);
  };

  return (
    <div className="mt-10 w-full rounded-3xl border border-line/70 bg-surface text-left">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 rounded-3xl px-5 py-4 text-left transition-colors hover:bg-raised">
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Check yourself</span>
          <span className="block text-[14px] text-ink-soft">
            {words.length} quick questions from this text{ai ? ', and two about the story' : ''}, if you like. They count in Ratio.
          </span>
        </span>
        <ChevronDown size={18} className={cx('shrink-0 text-ink-faint transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring.soft} className="overflow-hidden">
            <div className="border-t border-line/60 px-5 pt-4 pb-5">
              {done ? (
                <div className="py-2 text-center">
                  <p className="font-serif text-[26px] font-semibold tabular-nums">
                    {right} of {items.length}
                  </p>
                  <p className="mt-1 text-ink-soft">{right === items.length ? 'Every one. You read this well.' : right >= items.length * 0.6 ? 'Most of it. Well read.' : 'A second read will make these stick.'}</p>
                  <button type="button" onClick={again} className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-soft hover:text-ink">
                    <RotateCcw size={14} aria-hidden /> Again
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex items-center gap-3">
                    <p className="flex-1 text-[13px] font-semibold text-ink-soft">{PROMPT[items[index].kind]}</p>
                    <span className="text-[12px] text-ink-faint tabular-nums">
                      {index + 1} / {items.length}
                    </span>
                  </div>
                  {items[index].kind === 'order' ? (
                    <OrderQuestion key={index} lang={lang} item={items[index] as Extract<CheckItem, { kind: 'order' }>} answered={result !== null} onAnswer={answer} />
                  ) : (
                    <ChoiceQuestion key={index} lang={lang} item={items[index] as Exclude<CheckItem, { kind: 'order' }>} answered={result !== null} onAnswer={answer} />
                  )}
                  {result !== null && <Feedback ok={result} item={items[index]} onNext={next} last={index + 1 === items.length} />}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChoiceQuestion({ lang, item, answered, onAnswer }: { lang: string; item: Exclude<CheckItem, { kind: 'order' }>; answered: boolean; onAnswer: (ok: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const pick = (i: number) => {
    if (answered) return;
    setPicked(i);
    onAnswer(item.options[i] === item.answer);
  };

  // 1 to 4 pick an answer.
  useEffect(() => {
    if (answered) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      // Not while writing in your own words below.
      if (n >= 1 && n <= item.options.length && !e.metaKey && !e.ctrlKey && !e.altKey && !isEditable(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        pick(n - 1);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  return (
    <>
      {item.kind === 'story' ? (
        <>
          <p lang={lang} className="font-serif text-[20px] leading-snug font-semibold">
            {item.question}
          </p>
          {item.en && <p className="mt-1 text-[14px] text-ink-soft">{item.en}</p>}
        </>
      ) : item.kind === 'gap' ? (
        <p lang={lang} className="font-serif text-[19px] leading-relaxed">
          {item.before}
          <span className={cx('mx-0.5 inline-block min-w-[3.5em] rounded-md border-b-2 px-1 text-center', answered ? (picked !== null && item.options[picked] === item.answer ? 'border-sage text-sage-text' : 'border-accent text-accent-text') : 'border-ink-faint text-transparent')}>
            {answered ? item.answer : '·'}
          </span>
          {item.after}
        </p>
      ) : (
        <p className="font-serif text-[22px] font-semibold">“{item.meaning}”</p>
      )}
      <div className={cx('mt-4 grid gap-2', item.kind === 'story' ? 'grid-cols-1' : 'grid-cols-2')}>
        {item.options.map((o, i) => (
          <button
            key={o}
            type="button"
            disabled={answered}
            onClick={() => pick(i)}
            lang={lang}
            className={cx(
              'flex min-h-12 items-center gap-2 rounded-2xl border px-3 py-2 text-left text-[16px] font-semibold transition-[transform,background-color,border-color] active:scale-[0.98]',
              !answered && 'border-line bg-bg hover:bg-raised',
              answered && o === item.answer && 'border-sage bg-sage-soft text-sage-text',
              answered && i === picked && o !== item.answer && 'border-accent bg-accent-soft text-accent-text',
              answered && o !== item.answer && i !== picked && 'border-line bg-bg opacity-50',
            )}
          >
            <span className="shrink-0">
              <Kbd>{i + 1}</Kbd>
            </span>
            <span className={cx('min-w-0', item.kind !== 'story' && 'truncate')}>{o}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function OrderQuestion({ lang, item, answered, onAnswer }: { lang: string; item: Extract<CheckItem, { kind: 'order' }>; answered: boolean; onAnswer: (ok: boolean) => void }) {
  // Indexes into item.shuffled, in the order they were picked.
  const [order, setOrder] = useState<number[]>([]);
  const place = (i: number) => {
    if (answered || order.includes(i)) return;
    const next = [...order, i];
    setOrder(next);
    if (next.length === item.shuffled.length) onAnswer(next.map((j) => item.shuffled[j]).join(' ') === item.answer.join(' '));
  };
  const ok = order.map((j) => item.shuffled[j]).join(' ') === item.answer.join(' ');

  return (
    <>
      <p lang={lang} className={cx('min-h-[3.25rem] rounded-2xl border border-dashed px-3 py-3 font-serif text-[19px]', answered ? (ok ? 'border-sage text-sage-text' : 'border-accent text-accent-text') : 'border-line-strong')}>
        {order.length ? (
          order.map((j, k) => (
            <Fragment key={j}>
              {k > 0 && item.joiner}
              <button type="button" disabled={answered} onClick={() => setOrder(order.slice(0, k))} className="rounded-md px-0.5 hover:bg-sunken" title="Take back from here">
                {item.shuffled[j]}
              </button>
            </Fragment>
          ))
        ) : (
          <span className="text-[14px] text-ink-faint">Pick the words below, first word first.</span>
        )}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {item.shuffled.map((w, i) => (
          <button
            key={i}
            type="button"
            disabled={answered || order.includes(i)}
            onClick={() => place(i)}
            lang={lang}
            className={cx('h-10 rounded-xl border border-line bg-bg px-3 text-[16px] font-semibold transition-[transform,opacity] hover:bg-raised active:scale-[0.97]', order.includes(i) && 'opacity-30')}
          >
            {w}
          </button>
        ))}
      </div>
    </>
  );
}

function Feedback({ ok, item, last, onNext }: { ok: boolean; item: CheckItem; last: boolean; onNext: () => void }) {
  const solution = ok ? null : item.kind === 'order' ? item.answer.join(item.joiner) : item.answer;

  // Enter goes on.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || isEditable(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      onNext();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onNext]);

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring.snappy} className={cx('mt-4 flex items-center gap-3 rounded-2xl p-3.5', ok ? 'bg-sage-soft text-sage-text' : 'bg-accent-soft text-accent-text')}>
      {ok ? <Check size={18} className="shrink-0" aria-hidden /> : <X size={18} className="shrink-0" aria-hidden />}
      <p className="min-w-0 flex-1 font-semibold">{ok ? 'Right.' : `It’s “${solution}”.`}</p>
      <Button size="sm" variant="secondary" onClick={onNext}>
        {last ? 'See how it went' : 'Next'}
      </Button>
    </motion.div>
  );
}
