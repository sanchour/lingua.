import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Volume2 } from 'lucide-react';
import { normalizeAnswer } from '@/core/srs/answer';
import type { Exercise, LudusItem } from '@/core/srs/ludus';
import { useSettings } from '@/data/settings';
import { useLayout } from '@/design/hooks/useLayout';
import { Kbd } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { speak } from '@/services/speech/tts';
import { articleFor } from '../common/words';

export type Phase = 'answer' | 'right' | 'wrong';
type Of<K extends Exercise['kind']> = Extract<Exercise, { kind: K }>;

export function useSpeak(lang: string) {
  const settings = useSettings();
  return (text: string, slow = false) => speak(text, lang, { rate: (settings?.speech.rate ?? 0.95) * (slow ? 0.7 : 1), voiceUri: settings?.speech.voices[lang] });
}

function Prompt({ children, lang }: { children: React.ReactNode; lang?: string }) {
  return (
    <p lang={lang} className="[font-family:var(--card-font,var(--font-serif))] text-[clamp(1.9rem,6vw,2.8rem)] leading-tight font-semibold break-words">
      {children}
    </p>
  );
}

function TermText({ item, lang }: { item: LudusItem; lang: string }) {
  const article = articleFor(lang, item.gender, item.term, item.pos);
  return (
    <>
      {article && <span className="font-normal text-ink-faint">{article} </span>}
      {item.term}
    </>
  );
}

// ── Choice (meaning, word, listening, gap) ──────────────────────────────────

function Options({ options, value, onChange, phase, answer, lang }: { options: string[]; value: number | null; onChange: (i: number) => void; phase: Phase; answer: number; lang?: string }) {
  const { pointer } = useLayout();
  return (
    <div role="radiogroup" className="grid gap-2.5 sm:grid-cols-2">
      {options.map((o, i) => {
        const chosen = value === i;
        const reveal = phase !== 'answer';
        const tone = reveal && i === answer ? 'border-sage bg-sage-soft text-ink' : reveal && chosen ? 'border-accent bg-accent-soft' : chosen ? 'border-ink bg-raised' : 'border-line bg-raised hover:border-line-strong';
        return (
          <motion.button
            key={o}
            type="button"
            role="radio"
            aria-checked={chosen}
            disabled={reveal}
            onClick={() => onChange(i)}
            animate={reveal && chosen && i !== answer ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.32 }}
            className={cx('no-callout flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-[16px] font-semibold transition-[background-color,border-color,transform] duration-150 active:scale-[0.98]', tone)}
          >
            {pointer === 'fine' && <Kbd>{i + 1}</Kbd>}
            <span lang={lang} className="min-w-0 flex-1">
              {o}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

export function ChoiceExercise({ ex, lang, value, onChange, phase }: { ex: Of<'choose-meaning'> | Of<'choose-term'> | Of<'listen'>; lang: string; value: number | null; onChange: (v: number) => void; phase: Phase }) {
  const say = useSpeak(lang);
  useEffect(() => {
    if (ex.kind === 'listen') void say(ex.item.term);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex.key]);

  return (
    <div className="space-y-8">
      <div className="text-center">
        {ex.kind === 'choose-meaning' && (
          <Prompt lang={lang}>
            <TermText item={ex.item} lang={lang} />
          </Prompt>
        )}
        {ex.kind === 'choose-term' && <Prompt>{ex.item.meaning}</Prompt>}
        {ex.kind === 'listen' && (
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              aria-label="Play again"
              onClick={() => void say(ex.item.term)}
              className="no-callout grid size-24 place-items-center rounded-[28px] bg-accent-fill text-on-accent shadow-elev-2 transition-transform active:scale-95"
            >
              <Volume2 size={40} aria-hidden />
            </button>
            <button type="button" onClick={() => void say(ex.item.term, true)} className="rounded-xl px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-surface">
              Slower
            </button>
          </div>
        )}
      </div>
      <Options options={ex.options} value={value} onChange={onChange} phase={phase} answer={ex.answer} lang={ex.kind === 'choose-term' ? lang : undefined} />
    </div>
  );
}

export function ClozeExercise({ ex, lang, value, onChange, phase }: { ex: Of<'cloze'>; lang: string; value: number | null; onChange: (v: number) => void; phase: Phase }) {
  const shown = value === null ? null : ex.options[value];
  return (
    <div className="space-y-8">
      <div className="text-center">
        <p lang={lang} className="[font-family:var(--card-font,var(--font-serif))] text-[clamp(1.4rem,4.5vw,1.9rem)] leading-relaxed">
          {ex.before}
          <span
            className={cx(
              'mx-0.5 inline-block min-w-20 rounded-lg border-b-2 px-2 text-center transition-colors',
              phase === 'right' ? 'border-sage bg-sage-soft' : phase === 'wrong' ? 'border-accent bg-accent-soft' : shown ? 'border-ink' : 'border-line-strong',
            )}
          >
            {phase === 'wrong' ? ex.gap : (shown ?? ' ')}
          </span>
          {ex.after}
        </p>
        {ex.item.example?.translation && <p className="mt-3 text-[15px] text-ink-soft italic">{ex.item.example.translation}</p>}
      </div>
      <Options options={ex.options} value={value} onChange={onChange} phase={phase} answer={ex.answer} lang={lang} />
    </div>
  );
}

// ── Build the sentence ──────────────────────────────────────────────────────

export const builtSentence = (ex: Of<'build'>, picked: number[]) => picked.map((i) => ex.tiles[i]).join(' ');
export const buildIsRight = (ex: Of<'build'>, picked: number[], lang: string) => normalizeAnswer(builtSentence(ex, picked), lang) === normalizeAnswer(ex.answer.join(' '), lang);

export function BuildExercise({ ex, lang, value, onChange, phase }: { ex: Of<'build'>; lang: string; value: number[]; onChange: (v: number[]) => void; phase: Phase }) {
  const locked = phase !== 'answer';
  return (
    <div className="space-y-8">
      <p className="text-center [font-family:var(--card-font,var(--font-serif))] text-[clamp(1.3rem,4vw,1.7rem)] leading-snug">{ex.translation}</p>
      <div
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
              onClick={() => onChange(value.filter((v) => v !== i))}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
              transition={spring.snappy}
              lang={lang}
              className="no-callout rounded-xl border border-line bg-raised px-3 py-2 [font-family:var(--card-font,var(--font-serif))] text-[17px] shadow-elev-1"
            >
              {ex.tiles[i]}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
      {phase === 'wrong' && (
        <p lang={lang} className="text-center [font-family:var(--card-font,var(--font-serif))] text-lg">
          {ex.answer.join(' ')}
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        {ex.tiles.map((t, i) => {
          const used = value.includes(i);
          return (
            <button
              key={i}
              type="button"
              disabled={locked || used}
              onClick={() => onChange([...value, i])}
              lang={lang}
              className={cx(
                'no-callout rounded-xl border px-3 py-2 [font-family:var(--card-font,var(--font-serif))] text-[17px] transition-[opacity,transform] duration-150 active:scale-95',
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

// ── Type the word ───────────────────────────────────────────────────────────

const LETTERS: Record<string, string[]> = {
  es: ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ', '¿', '¡'],
  pt: ['á', 'â', 'ã', 'à', 'ç', 'é', 'ê', 'í', 'ó', 'ô', 'õ', 'ú'],
  fr: ['à', 'â', 'æ', 'ç', 'é', 'è', 'ê', 'ë', 'î', 'ï', 'ô', 'œ', 'ù', 'û', 'ü'],
  de: ['ä', 'ö', 'ü', 'ß'],
  it: ['à', 'è', 'é', 'ì', 'ò', 'ù'],
  sv: ['å', 'ä', 'ö'],
  hu: ['á', 'é', 'í', 'ó', 'ö', 'ő', 'ú', 'ü', 'ű'],
};

export function TypeExercise({ ex, lang, value, onChange, phase, onSubmit }: { ex: Of<'type'>; lang: string; value: string; onChange: (v: string) => void; phase: Phase; onSubmit: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const { pointer } = useLayout();
  useEffect(() => {
    const t = window.setTimeout(() => input.current?.focus(), 120);
    return () => window.clearTimeout(t);
  }, [ex.key]);
  const article = articleFor(lang, ex.item.gender, ex.item.term, ex.item.pos);

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

  return (
    <div className="space-y-8">
      <div className="text-center">
        <Prompt>{ex.item.meaning}</Prompt>
        {article && <p className="mt-2 text-sm text-ink-faint">a noun · {article} …</p>}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <input
          ref={input}
          lang={lang}
          value={value}
          readOnly={phase !== 'answer'}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type it in the language you’re learning"
          aria-label="Your answer"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className={cx(
            'h-16 w-full rounded-2xl border-2 bg-raised px-5 text-center [font-family:var(--card-font,var(--font-serif))] text-2xl outline-none transition-colors placeholder:font-sans placeholder:text-base placeholder:text-ink-faint',
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
              className="grid size-9 place-items-center rounded-lg border border-line bg-raised [font-family:var(--card-font,var(--font-serif))] text-lg transition-colors hover:border-line-strong"
            >
              {ch}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Match the pairs ─────────────────────────────────────────────────────────

/** Tap a word, then its meaning. Matched pairs settle into sage; a wrong pair shakes. */
export function MatchExercise({ ex, lang, onDone, random }: { ex: Of<'match'>; lang: string; onDone: (mistakes: Map<string, number>) => void; random: () => number }) {
  const left = ex.items;
  const right = useMemo(() => [...ex.items].sort(() => random() - 0.5), [ex.items, random]);
  const [pick, setPick] = useState<{ side: 'l' | 'r'; id: string } | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [shake, setShake] = useState<string[]>([]);
  const mistakes = useRef(new Map<string, number>());
  const say = useSpeak(lang);

  const choose = (side: 'l' | 'r', id: string) => {
    if (matched.has(id)) return;
    if (side === 'l') void say(ex.items.find((i) => i.id === id)!.term);
    if (!pick || pick.side === side) {
      setPick({ side, id });
      return;
    }
    if (pick.id === id) {
      const next = new Set(matched).add(id);
      setMatched(next);
      setPick(null);
      if (next.size === left.length) window.setTimeout(() => onDone(mistakes.current), 280);
    } else {
      for (const k of [pick.id, id]) mistakes.current.set(k, (mistakes.current.get(k) ?? 0) + 1);
      setShake([`${pick.side}:${pick.id}`, `${side}:${id}`]);
      setPick(null);
      window.setTimeout(() => setShake([]), 360);
    }
  };

  const cell = (side: 'l' | 'r', item: LudusItem) => {
    const done = matched.has(item.id);
    const selected = pick?.side === side && pick.id === item.id;
    const shaking = shake.includes(`${side}:${item.id}`);
    return (
      <motion.button
        key={`${side}${item.id}`}
        type="button"
        disabled={done}
        onClick={() => choose(side, item.id)}
        animate={shaking ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0, opacity: done ? 0.55 : 1 }}
        transition={{ duration: shaking ? 0.32 : 0.2 }}
        lang={side === 'l' ? lang : undefined}
        className={cx(
          'no-callout min-h-14 rounded-2xl border-2 px-3 py-2.5 text-[16px] font-semibold transition-[background-color,border-color] duration-150',
          side === 'l' && '[font-family:var(--card-font,var(--font-serif))] text-[18px]',
          done ? 'border-sage bg-sage-soft' : shaking ? 'border-accent bg-accent-soft' : selected ? 'border-ink bg-raised' : 'border-line bg-raised hover:border-line-strong',
        )}
      >
        {side === 'l' ? item.term : item.meaning}
      </motion.button>
    );
  };

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
      <div className="flex flex-col gap-2.5 sm:gap-3">{left.map((i) => cell('l', i))}</div>
      <div className="flex flex-col gap-2.5 sm:gap-3">{right.map((i) => cell('r', i))}</div>
    </div>
  );
}
