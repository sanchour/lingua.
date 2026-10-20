import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Mic, MicOff, X } from 'lucide-react';
import { PlayBig } from '@/features/lesson/kit';
import { normalizeAnswer } from '@/core/srs/answer';
import type { Exercise, LudusItem } from '@/core/srs/ludus';
import { useLayout } from '@/design/hooks/useLayout';
import { Kbd } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { listenOnce, RecognitionError } from '@/services/speech/recognition';
import { GlossText } from '@/features/codex/reader/GlossText';
import { articleFor } from '../common/words';

export type Phase = 'answer' | 'right' | 'wrong';
type Of<K extends Exercise['kind']> = Extract<Exercise, { kind: K }>;

function Prompt({ children, lang }: { children: ReactNode; lang?: string }) {
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

export function ChoiceExercise({ ex, lang, value, onChange, phase }: { ex: Of<'choose-meaning'> | Of<'choose-term'>; lang: string; value: number | null; onChange: (v: number) => void; phase: Phase }) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        {ex.kind === 'choose-meaning' && (
          <Prompt lang={lang}>
            <TermText item={ex.item} lang={lang} />
          </Prompt>
        )}
        {ex.kind === 'choose-term' && <Prompt>{ex.item.meaning}</Prompt>}
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
          <GlossText text={ex.before} lang={lang} />
          <span
            className={cx(
              'mx-0.5 inline-block min-w-20 rounded-lg border-b-2 px-2 text-center transition-colors',
              phase === 'right' ? 'border-sage bg-sage-soft' : phase === 'wrong' ? 'border-accent bg-accent-soft' : shown ? 'border-ink' : 'border-line-strong',
            )}
          >
            {phase === 'wrong' ? ex.gap : (shown ?? ' ')}
          </span>
          <GlossText text={ex.after} lang={lang} />
        </p>
        {ex.item.example?.translation && <p className="mt-3 text-[15px] text-ink-soft italic">{ex.item.example.translation}</p>}
      </div>
      <Options options={ex.options} value={value} onChange={onChange} phase={phase} answer={ex.answer} lang={lang} />
    </div>
  );
}

// ── Build the sentence ──────────────────────────────────────────────────────

type Buildable = Of<'build'> | Of<'translate'>;
export const builtSentence = (ex: Buildable, picked: number[]) => picked.map((i) => ex.tiles[i]).join(' ');
/** Translations are built in English, so they're compared as English. */
export const buildIsRight = (ex: Buildable, picked: number[], lang: string) => {
  const l = ex.kind === 'translate' ? 'en' : lang;
  return normalizeAnswer(builtSentence(ex, picked), l) === normalizeAnswer(ex.answer.join(' '), l);
};

/** Word-bank exercises: build the sentence (from its translation), or build its translation. */
export function BuildExercise({ ex, lang, value, onChange, phase }: { ex: Buildable; lang: string; value: number[]; onChange: (v: number[]) => void; phase: Phase }) {
  const locked = phase !== 'answer';
  const sentence = ex.item.example?.text ?? ex.item.term;
  // Tiles are in the language being learned, except when building an English translation.
  const tileLang = ex.kind === 'translate' ? undefined : lang;
  return (
    <div className="space-y-8">
      {ex.kind === 'build' && <p className="text-center [font-family:var(--card-font,var(--font-serif))] text-[clamp(1.3rem,4vw,1.7rem)] leading-snug">{ex.translation}</p>}
      {ex.kind === 'translate' && (
        <p lang={lang} className="text-center [font-family:var(--card-font,var(--font-serif))] text-[clamp(1.4rem,4.5vw,1.9rem)] leading-snug">
          <GlossText text={sentence} lang={lang} />
        </p>
      )}
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
              lang={tileLang}
              className="no-callout rounded-xl border border-line bg-raised px-3 py-2 [font-family:var(--card-font,var(--font-serif))] text-[17px] shadow-elev-1"
            >
              {ex.tiles[i]}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
      {phase === 'wrong' && (
        <p lang={tileLang} className="text-center [font-family:var(--card-font,var(--font-serif))] text-lg">
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
              lang={tileLang}
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

export const LETTERS: Record<string, string[]> = {
  es: ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ', '¿', '¡'],
  pt: ['á', 'â', 'ã', 'à', 'ç', 'é', 'ê', 'í', 'ó', 'ô', 'õ', 'ú'],
  fr: ['à', 'â', 'æ', 'ç', 'é', 'è', 'ê', 'ë', 'î', 'ï', 'ô', 'œ', 'ù', 'û', 'ü'],
  de: ['ä', 'ö', 'ü', 'ß'],
  it: ['à', 'è', 'é', 'ì', 'ò', 'ù'],
  sv: ['å', 'ä', 'ö'],
  hu: ['á', 'é', 'í', 'ó', 'ö', 'ő', 'ú', 'ü', 'ű'],
  nl: ['é', 'è', 'ë', 'ï', 'ö', 'ü', 'ĳ'],
  nb: ['æ', 'ø', 'å', 'é'],
  tr: ['ç', 'ğ', 'ı', 'İ', 'ö', 'ş', 'ü', 'â'],
  la: ['ā', 'ē', 'ī', 'ō', 'ū', 'ȳ'],
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

  const choose = (side: 'l' | 'r', id: string) => {
    if (matched.has(id)) return;
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

// ── Which article? ──────────────────────────────────────────────────────────

export function ArticleExercise({ ex, lang, value, onChange, phase }: { ex: Of<'article'>; lang: string; value: number | null; onChange: (v: number) => void; phase: Phase }) {
  const chosen = value === null ? null : ex.options[value];
  return (
    <div className="space-y-8">
      <div className="text-center">
        <Prompt lang={lang}>
          <span
            className={cx(
              'mr-2 inline-block min-w-16 rounded-lg border-b-2 px-2 align-baseline text-center font-normal transition-colors',
              phase === 'right' ? 'border-sage bg-sage-soft' : phase === 'wrong' ? 'border-accent bg-accent-soft' : chosen ? 'border-ink' : 'border-line-strong text-ink-faint',
            )}
          >
            {phase === 'wrong' ? ex.options[ex.answer] : (chosen ?? '…')}
          </span>
          {ex.item.term}
        </Prompt>
        <p className="mt-3 text-[15px] text-ink-soft">{ex.item.meaning}</p>
      </div>
      <Options options={ex.options} value={value} onChange={onChange} phase={phase} answer={ex.answer} lang={lang} />
    </div>
  );
}

// ── Say it out loud ─────────────────────────────────────────────────────────

/** The word to say, a microphone, and what was heard. `onHeard` gets the recogniser's best guesses. */
export function SpeakExercise({ ex, lang, heard, onHeard, phase, onSkip }: { ex: Of<'speak'>; lang: string; heard: string[]; onHeard: (alternatives: string[]) => void; phase: Phase; onSkip: () => void }) {
  const [listening, setListening] = useState(false);
  const [live, setLive] = useState('');
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef<() => void>(() => {});
  const article = articleFor(lang, ex.item.gender, ex.item.term, ex.item.pos);
  useEffect(() => () => stopRef.current(), []);

  const start = () => {
    if (listening) return stopRef.current();
    setError(null);
    setLive('');
    setListening(true);
    const { result, stop } = listenOnce(lang, setLive);
    stopRef.current = stop;
    result
      .then((alternatives) => {
        if (alternatives.length) onHeard(alternatives);
        else setError('Nothing was heard. Try again a little louder.');
      })
      .catch((e: unknown) => setError(e instanceof RecognitionError ? e.message : 'Speech recognition stopped unexpectedly.'))
      .finally(() => setListening(false));
  };

  return (
    <div className="space-y-8 text-center">
      <div>
        <Prompt lang={lang}>
          {article && <span className="font-normal text-ink-faint">{article} </span>}
          {ex.item.term}
        </Prompt>
        <p className="mt-2 text-[15px] text-ink-soft">{ex.item.meaning}</p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <motion.button
          type="button"
          onClick={start}
          disabled={phase !== 'answer'}
          aria-label={listening ? 'Stop listening' : 'Speak now'}
          animate={listening ? { scale: [1, 1.06, 1] } : { scale: 1 }}
          transition={listening ? { duration: 1.2, repeat: Infinity } : spring.snappy}
          className={cx(
            'no-callout grid size-24 place-items-center rounded-full shadow-elev-2 transition-colors disabled:opacity-50',
            listening ? 'bg-accent-fill text-on-accent' : 'bg-inverse text-on-inverse',
          )}
        >
          {listening ? <MicOff size={36} aria-hidden /> : <Mic size={36} aria-hidden />}
        </motion.button>
        <p lang={lang} className="min-h-7 [font-family:var(--card-font,var(--font-serif))] text-xl text-ink-soft">
          {listening ? live || 'Listening…' : heard[0] ? `“${heard[0]}”` : error ? '' : 'Tap the microphone and say the word'}
        </p>
        {error && <p className="text-sm text-accent-text">{error}</p>}
        {phase === 'answer' && (
          <button type="button" onClick={onSkip} className="text-[13px] font-semibold text-ink-faint underline-offset-2 hover:text-ink hover:underline">
            Can’t speak now
          </button>
        )}
      </div>
    </div>
  );
}

// ── Listen, dictation, spelling, right or wrong (3.0-8) ─────────────────────

/** Hear the word; pick it from four written ones. */
export function ListenExercise({ ex, lang, value, onChange, phase }: { ex: Of<'listen'>; lang: string; value: number | null; onChange: (v: number) => void; phase: Phase }) {
  return (
    <div className="space-y-8">
      <PlayBig lang={lang} text={ex.item.term} playKey={ex.key} slower={false} />
      {phase !== 'answer' && <p className="text-center text-[15px] text-ink-soft">{ex.item.meaning}</p>}
      <Options options={ex.options} value={value} onChange={onChange} phase={phase} answer={ex.answer} lang={lang} />
    </div>
  );
}

/** Tap tiles into a line and back; shared by dictation and spelling. */
function TileLine({ tiles, value, onChange, phase, lang, joined }: { tiles: string[]; value: number[]; onChange: (v: number[]) => void; phase: Phase; lang: string; joined?: boolean }) {
  const locked = phase !== 'answer';
  return (
    <>
      <div
        className={cx(
          'flex min-h-[6rem] flex-wrap content-start rounded-2xl border-2 border-dashed p-3 transition-colors',
          joined ? 'justify-center gap-1' : 'gap-2',
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
              initial={{ opacity: 0, scale: 0.85, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
              transition={spring.snappy}
              lang={lang}
              className={cx('no-callout rounded-xl border border-line bg-raised py-2 [font-family:var(--card-font,var(--font-serif))] shadow-elev-1', joined ? 'min-w-10 px-2 text-[22px]' : 'px-3 text-[17px]')}
            >
              {tiles[i]}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {tiles.map((t, i) => {
          const used = value.includes(i);
          return (
            <button
              key={i}
              type="button"
              disabled={locked || used}
              onClick={() => onChange([...value, i])}
              lang={lang}
              className={cx(
                'no-callout rounded-xl border py-2 [font-family:var(--card-font,var(--font-serif))] transition-[opacity,transform] duration-150 active:scale-95',
                joined ? 'min-w-11 px-2 text-[22px]' : 'px-3 text-[17px]',
                used ? 'border-transparent bg-sunken text-transparent' : 'border-line bg-raised shadow-elev-1 hover:border-line-strong',
              )}
            >
              {t}
            </button>
          );
        })}
      </div>
    </>
  );
}

/** Hear the sentence; build it from tiles. */
export function DictationExercise({ ex, lang, value, onChange, phase }: { ex: Of<'dictation'>; lang: string; value: number[]; onChange: (v: number[]) => void; phase: Phase }) {
  return (
    <div className="space-y-7">
      <PlayBig lang={lang} text={ex.item.example?.text ?? ex.item.term} playKey={ex.key} />
      <TileLine tiles={ex.tiles} value={value} onChange={onChange} phase={phase} lang={lang} />
      {phase === 'wrong' && (
        <p lang={lang} className="text-center [font-family:var(--card-font,var(--font-serif))] text-lg">
          {ex.item.example?.text}
        </p>
      )}
    </div>
  );
}

/** The meaning; the word's letters to put in order. */
export function SpellExercise({ ex, lang, value, onChange, phase }: { ex: Of<'spell'>; lang: string; value: number[]; onChange: (v: number[]) => void; phase: Phase }) {
  return (
    <div className="space-y-7">
      <div className="text-center">
        <p className="font-serif text-[clamp(1.4rem,4.5vw,1.9rem)] leading-snug">{ex.item.meaning}</p>
        <p className="mt-2 text-sm text-ink-faint">{ex.answer.length} letters</p>
      </div>
      <TileLine tiles={ex.tiles} value={value} onChange={onChange} phase={phase} lang={lang} joined />
    </div>
  );
}

export const spellIsRight = (ex: Of<'spell'>, picked: number[]) => picked.map((i) => ex.tiles[i]).join('').toLocaleLowerCase() === ex.answer.join('').toLocaleLowerCase();
export const dictationIsRight = (ex: Of<'dictation'>, picked: number[], lang: string) => normalizeAnswer(picked.map((i) => ex.tiles[i]).join(' '), lang) === normalizeAnswer(ex.answer.join(' '), lang);

/** Does this word mean that? Two big buttons. */
export function TrueFalseExercise({ ex, lang, value, onChange, phase }: { ex: Of<'truefalse'>; lang: string; value: number | null; onChange: (v: number) => void; phase: Phase }) {
  const { pointer } = useLayout();
  return (
    <div className="space-y-8">
      <div className="text-center">
        <Prompt lang={lang}>
          <TermText item={ex.item} lang={lang} />
        </Prompt>
        <p className="mt-4 text-[13px] font-bold tracking-[0.12em] text-ink-faint uppercase">means</p>
        <p className="mt-1 font-serif text-[clamp(1.4rem,4.5vw,1.9rem)] leading-snug">{ex.shown}</p>
        {phase !== 'answer' && ex.answer === 1 && <p className="mt-2 text-[15px] text-ink-soft">It means “{ex.item.meaning}”.</p>}
      </div>
      <div role="radiogroup" className="grid grid-cols-2 gap-3">
        {ex.options.map((o, i) => {
          const chosen = value === i;
          const reveal = phase !== 'answer';
          const tone = reveal && i === ex.answer ? 'border-sage bg-sage-soft' : reveal && chosen ? 'border-accent bg-accent-soft' : chosen ? 'border-ink bg-raised' : 'border-line bg-raised hover:border-line-strong';
          return (
            <motion.button
              key={o}
              type="button"
              role="radio"
              aria-checked={chosen}
              disabled={reveal}
              onClick={() => onChange(i)}
              animate={reveal && chosen && i !== ex.answer ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
              transition={{ duration: 0.32 }}
              className={cx('no-callout flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border-2 text-[18px] font-bold transition-colors active:scale-[0.98]', tone)}
            >
              {i === 0 ? <Check size={26} strokeWidth={3} className="text-sage-text" aria-hidden /> : <X size={26} strokeWidth={3} className="text-accent-text" aria-hidden />}
              <span className="flex items-center gap-2">
                {o}
                {pointer === 'fine' && <Kbd>{i + 1}</Kbd>}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
