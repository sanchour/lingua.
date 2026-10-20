// What Ludus and the grammar lessons share (Lingua 3.0-8): the combo streak, sounds and
// vibration, the check bar, Lightning's clock, confetti, the end screen and the setup sheet.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, Flame, Leaf, Loader2, Timer, Trophy, Volume2, Zap } from 'lucide-react';
import { speak, stopSpeaking } from '@/services/speech/voice';
import { useSpeaker } from '@/features/speech/SpeakButton';
import { useApp } from '@/app/context';
import { DEFAULT_SETTINGS, patchSetting } from '@/data/settings';
import type { LessonMode, LessonSettings } from '@/data/settings';
import { useLayout } from '@/design/hooks/useLayout';
import { Button, Drawer, Kbd, Segmented, ToggleRow } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { play } from './sfx';
import type { Cue } from './sfx';

export type Phase = 'answer' | 'right' | 'wrong';

export const PRAISE = ['Lovely', 'Exactly', 'Well done', 'Nicely done', 'Perfect', 'Spot on', 'Brilliant', 'Yes!'];
/** Streaks that earn a burst and a word of their own. */
const MILESTONES: Record<number, string> = { 3: 'On a roll', 5: 'Five in a row', 10: 'Ten in a row!', 15: 'Unstoppable', 20: 'Twenty!', 30: 'Legendary' };

export function useLessonSettings(): LessonSettings {
  const { settings } = useApp();
  return { ...DEFAULT_SETTINGS.lessons, ...settings.lessons };
}

/**
 * The lesson's feel: a combo counter and the cue for each answer. Zen mode keeps it quiet: no
 * sounds and no combo.
 */
export function useLessonFeel() {
  const s = useLessonSettings();
  const zen = s.mode === 'zen';
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [burst, setBurst] = useState<{ n: number; word: string } | null>(null);
  const opts = useMemo(() => ({ sounds: s.sounds && !zen, haptics: s.haptics && !zen }), [s.sounds, s.haptics, zen]);
  const cue = useCallback((c: Cue) => play(c, opts), [opts]);
  const streak = useRef(0);
  const answered = useCallback(
    (right: boolean) => {
      if (!right) {
        streak.current = 0;
        setCombo(0);
        cue('wrong');
        return;
      }
      const n = ++streak.current;
      setCombo(n);
      setBest((b) => Math.max(b, n));
      const word = MILESTONES[n];
      if (word && !zen) {
        setBurst({ n, word });
        cue('combo');
      } else cue('right');
    },
    [cue, zen],
  );
  const clearBurst = useCallback(() => setBurst(null), []);
  return { combo: zen ? 0 : combo, best, burst, clearBurst, answered, cue, zen, settings: s };
}

// ── Combo ───────────────────────────────────────────────────────────────────

/** A flame with the streak, from three right in a row; it flares at each milestone. */
export function ComboBadge({ combo, burst, onBurstEnd }: { combo: number; burst: { n: number; word: string } | null; onBurstEnd: () => void }) {
  useEffect(() => {
    if (!burst) return;
    const t = window.setTimeout(onBurstEnd, 1400);
    return () => window.clearTimeout(t);
  }, [burst, onBurstEnd]);
  return (
    <div className="relative flex items-center">
      <AnimatePresence>
        {combo >= 2 && (
          <motion.span
            key="combo"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={spring.snappy}
            className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-bold tabular-nums', combo >= 5 ? 'bg-accent text-bg' : 'bg-accent-soft text-accent-text')}
            aria-label={`${combo} right in a row`}
          >
            <motion.span key={combo} initial={{ scale: 1.5, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={spring.snappy} className="inline-flex">
              <Flame size={15} aria-hidden />
            </motion.span>
            {combo}
          </motion.span>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {burst && (
          <motion.span
            key={burst.n}
            initial={{ opacity: 0, y: 6, scale: 0.8 }}
            animate={{ opacity: 1, y: 30, scale: 1 }}
            exit={{ opacity: 0, y: 40 }}
            transition={spring.gentle}
            className="pointer-events-none absolute top-0 right-0 rounded-full bg-ink px-3 py-1 text-[12.5px] font-bold whitespace-nowrap text-bg shadow-elev-2"
            role="status"
          >
            {burst.word}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Check bar ───────────────────────────────────────────────────────────────

export interface FeedbackBarProps {
  phase: Phase;
  ready: boolean;
  onCheck: () => void;
  onNext: () => void;
  praise: string;
  /** Under the praise: a note on a nearly right answer, or what was practised. */
  rightNote?: ReactNode;
  /** The correct answer, and why. */
  wrong?: ReactNode;
  /** Shown instead of the button while answering (for exercises that check themselves). */
  hint?: ReactNode;
  /** A quieter way out of this exercise (skip). */
  aside?: ReactNode;
  /** The button while answering, when it isn't a check ("Got it" on a new letter). */
  checkLabel?: string;
}

export function FeedbackBar({ phase, ready, onCheck, onNext, praise, rightNote, wrong, hint, aside, checkLabel = 'Check' }: FeedbackBarProps) {
  const { pointer } = useLayout();
  return (
    <div
      className={cx(
        'fixed inset-x-0 bottom-0 z-20 border-t transition-colors duration-200',
        phase === 'right' ? 'border-sage/40 bg-[color-mix(in_oklab,var(--sage)_14%,var(--bg))]' : phase === 'wrong' ? 'border-accent/40 bg-[color-mix(in_oklab,var(--accent)_12%,var(--bg))]' : 'border-line bg-bg',
      )}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-3 px-5 pt-4 sm:flex-row sm:items-center">
        <div className="min-h-12 min-w-0 flex-1" aria-live="polite">
          {phase === 'right' && (
            <motion.div className="flex items-center gap-3" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring.snappy}>
              <motion.span className="grid size-10 shrink-0 place-items-center rounded-full bg-sage text-bg" initial={{ scale: 0.5, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={spring.snappy}>
                <Check size={22} strokeWidth={3} aria-hidden />
              </motion.span>
              <div className="min-w-0">
                <p className="font-serif text-xl font-semibold text-sage-text">{praise}</p>
                {rightNote}
              </div>
            </motion.div>
          )}
          {phase === 'wrong' && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring.snappy}>
              {wrong}
            </motion.div>
          )}
          {phase === 'answer' && aside}
        </div>
        <div className="flex items-center gap-2">
          {phase === 'answer' && hint ? (
            <p className="text-sm text-ink-soft">{hint}</p>
          ) : (
            <Button size="lg" className="min-w-40 flex-1 sm:flex-none" variant={phase === 'answer' ? 'primary' : 'accent'} disabled={phase === 'answer' && !ready} onClick={() => (phase === 'answer' ? onCheck() : onNext())}>
              {phase === 'answer' ? checkLabel : 'Continue'}
              {pointer === 'fine' && <Kbd tone="inverse">Enter</Kbd>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Lightning ───────────────────────────────────────────────────────────────

export const LIGHTNING_MS = 60_000;

/** Seconds left in a Lightning round, as a pill that turns urgent in the last ten. */
export function LightningClock({ endsAt, onEnd, paused, onTick }: { endsAt: number; onEnd: () => void; paused?: boolean; onTick?: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const ended = useRef(false);
  const lastSecond = useRef(-1);
  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(t);
  }, [paused]);
  const left = Math.max(0, endsAt - now);
  const seconds = Math.ceil(left / 1000);
  useEffect(() => {
    if (left <= 0 && !ended.current) {
      ended.current = true;
      onEnd();
    }
    if (seconds <= 5 && seconds > 0 && seconds !== lastSecond.current) {
      lastSecond.current = seconds;
      onTick?.();
    }
  }, [left, seconds, onEnd, onTick]);
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-bold tabular-nums', seconds <= 10 ? 'bg-accent text-bg' : 'bg-sunken text-ink')} aria-label={`${seconds} seconds left`}>
      <Timer size={14} aria-hidden />
      {seconds}s
    </span>
  );
}

// ── Confetti ────────────────────────────────────────────────────────────────

const COLORS = ['var(--accent)', 'var(--sage)', 'var(--ink)', 'color-mix(in oklab, var(--accent) 50%, var(--bg))', 'color-mix(in oklab, var(--sage) 55%, var(--bg))'];

/** A short burst of paper from the top, for a perfect lesson or a new best. Nothing with reduced motion. */
export function Confetti({ pieces = 46 }: { pieces?: number }) {
  const reduce = useReducedMotion();
  const bits = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        x: Math.random() * 100,
        drift: (Math.random() - 0.5) * 40,
        delay: Math.random() * 0.35,
        spin: (Math.random() - 0.5) * 720,
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 10,
        color: COLORS[i % COLORS.length],
        round: Math.random() < 0.3,
      })),
    [pieces],
  );
  if (reduce) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden" aria-hidden>
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute top-0 block"
          style={{ left: `${b.x}%`, width: b.w, height: b.round ? b.w : b.h, background: b.color, borderRadius: b.round ? 999 : 2 }}
          initial={{ y: -30, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: '105vh', x: `${b.drift}vw`, rotate: b.spin, opacity: [1, 1, 0.8, 0] }}
          transition={{ duration: 2.2 + Math.random() * 1.2, delay: b.delay, ease: [0.2, 0.6, 0.4, 1] }}
        />
      ))}
    </div>
  );
}

// ── The end ─────────────────────────────────────────────────────────────────

export interface LessonResult {
  /** Exercises answered (first tries). */
  answered: number;
  /** 0–1, first tries right. */
  accuracy: number;
  ms: number;
  bestCombo: number;
  /** Lightning: right answers in the minute, and the best before this round. */
  score?: number;
  previousBest?: number;
}

export interface EndAction {
  label: string;
  onClick: () => void;
}

const minutes = (ms: number) => (ms < 60_000 ? `${Math.max(1, Math.round(ms / 1000))} s` : `${Math.round(ms / 60_000)} min`);

/** The end of a lesson: the numbers, kindly, a cheer for a perfect run or a new best, and what next. */
export function LessonEnd({ title, note, result, actions = [], onDone, badge, children }: { title: string; note?: ReactNode; result: LessonResult; actions?: EndAction[]; onDone: () => void; badge?: ReactNode; children?: ReactNode }) {
  const lightning = result.score !== undefined;
  const newBest = lightning && result.score! > 0 && result.score! > (result.previousBest ?? 0);
  const perfect = !lightning && result.answered > 0 && result.accuracy === 1;
  const { cue } = useLessonFeel();
  useEffect(() => {
    cue('finish');
  }, [cue]);
  const tiles: Array<[string, string]> = lightning
    ? [
        ['Right', String(result.score)],
        ['Best', String(Math.max(result.score!, result.previousBest ?? 0))],
        ['Combo', String(result.bestCombo)],
      ]
    : [
        ['Right first time', `${Math.round(result.accuracy * 100)}%`],
        ['Best combo', String(result.bestCombo)],
        ['Time', minutes(result.ms)],
      ];
  return (
    <>
      {(perfect || newBest) && <Confetti />}
      <motion.div className="mx-auto flex max-w-md flex-col items-center px-6 text-center" initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={spring.gentle}>
        <motion.span
          className={cx('mb-6 grid size-20 place-items-center rounded-full', perfect || newBest ? 'bg-accent-soft text-accent-text' : 'bg-sage-soft text-sage-text')}
          initial={{ scale: 0.6, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...spring.gentle, delay: 0.08 }}
        >
          {badge ?? (lightning ? <Zap size={34} aria-hidden /> : perfect ? <Trophy size={34} aria-hidden /> : <Leaf size={34} aria-hidden />)}
        </motion.span>
        <h1 className="font-serif text-3xl font-semibold">{newBest ? 'A new best!' : perfect ? 'Flawless' : title}</h1>
        {note && <div className="mt-2 text-[15px] leading-relaxed text-ink-soft">{note}</div>}
        <dl className="mt-8 grid w-full grid-cols-3 gap-3">
          {tiles.map(([label, value], i) => (
            <motion.div key={label} className="rounded-2xl bg-surface px-2 py-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.soft, delay: 0.15 + i * 0.08 }}>
              <dd className="font-serif text-2xl font-semibold tabular-nums">{value}</dd>
              <dt className="mt-0.5 text-[11.5px] leading-tight font-bold tracking-wide text-ink-faint uppercase">{label}</dt>
            </motion.div>
          ))}
        </dl>
        {children}
        <div className="mt-8 flex w-full flex-col gap-2">
          {actions.map((a, i) => (
            <Button key={a.label} size="lg" variant={i === 0 ? 'primary' : 'secondary'} block onClick={a.onClick}>
              {a.label}
            </Button>
          ))}
          <Button size="lg" variant={actions.length ? 'ghost' : 'primary'} block onClick={onDone}>
            Done
          </Button>
        </div>
      </motion.div>
    </>
  );
}

// ── Setup ───────────────────────────────────────────────────────────────────

const MODES: Array<{ value: LessonMode; label: string; about: string }> = [
  { value: 'classic', label: 'Classic', about: 'A lesson at your pace, with a combo for answers right in a row.' },
  { value: 'zen', label: 'Zen', about: 'No combo, no sounds, no clock. Just the exercises.' },
];

/**
 * The setup sheet: how long a lesson is, its mode, typing, sounds and vibration, and which kinds of
 * exercise it may use (at least one always stays on). Saved for next time.
 */
export function LessonSetup({ open, onClose, kinds, offKey }: { open: boolean; onClose: () => void; kinds: Array<{ id: string; label: string }>; offKey: 'ludusOff' | 'grammarOff' }) {
  const s = useLessonSettings();
  const off = new Set(s[offKey]);
  const set = (patch: Partial<LessonSettings>) => void patchSetting('lessons', patch);
  const toggle = (id: string) => {
    const next = new Set(off);
    if (next.has(id)) next.delete(id);
    else if (kinds.filter((k) => !next.has(k.id)).length > 1) next.add(id);
    set({ [offKey]: [...next] });
  };
  const mode = MODES.find((m) => m.value === s.mode) ?? MODES[0];
  return (
    <Drawer open={open} onClose={onClose} title="Your lessons" description="Saved for every lesson from now on.">
      <div className="space-y-6 pb-2">
        <section>
          <h3 className="mb-2 text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">Mode</h3>
          <Segmented label="Mode" block value={s.mode} onChange={(v) => set({ mode: v })} options={MODES.map((m) => ({ value: m.value, label: m.label }))} />
          <p className="mt-2 text-[13.5px] leading-snug text-ink-soft">{mode.about}</p>
        </section>
        <section>
          <h3 className="mb-2 text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">Length</h3>
          <Segmented
            label="Exercises per lesson"
            block
            value={String(s.length) as '5' | '10' | '15' | '20'}
            onChange={(v) => set({ length: Number(v) as LessonSettings['length'] })}
            options={[
              { value: '5', label: '5 · quick' },
              { value: '10', label: '10' },
              { value: '15', label: '15' },
              { value: '20', label: '20 · long' },
            ].map((o) => ({ ...o, short: o.value }))}
          />
        </section>
        <section>
          <h3 className="mb-2 text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">Exercises</h3>
          <div className="flex flex-wrap gap-2">
            {kinds.map((k) => {
              const on = !off.has(k.id);
              return (
                <button
                  key={k.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(k.id)}
                  className={cx(
                    'no-callout inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[14px] font-semibold transition-colors active:scale-[0.97]',
                    on ? 'border-sage/60 bg-sage-soft text-sage-text' : 'border-line bg-raised text-ink-faint line-through decoration-1',
                  )}
                >
                  {on && <Check size={14} strokeWidth={3} aria-hidden />}
                  {k.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[12.5px] text-ink-faint">An exercise that's off is replaced by a close cousin.</p>
        </section>
        <section className="divide-y divide-line/60">
          <ToggleRow title="Typing" description="Off: forms and words are chosen instead of typed." checked={s.typing} onChange={(v) => set({ typing: v })} />
          <ToggleRow title="Sounds" description="A chime for a right answer, a low note for a miss." checked={s.sounds} onChange={(v) => set({ sounds: v })} />
          <ToggleRow title="Vibration" description="On phones that allow it." checked={s.haptics} onChange={(v) => set({ haptics: v })} />
        </section>
      </div>
    </Drawer>
  );
}

/** Saves a Lightning score as the best for its key when it beats it; returns the previous best. */
export async function recordBest(best: Record<string, number>, key: string, score: number): Promise<number> {
  const previous = best[key] ?? 0;
  if (score > previous) await patchSetting('lessons', { best: { ...best, [key]: score } });
  return previous;
}

// ── Choices ─────────────────────────────────────────────────────────────────

/** Four (or two) answers to tap, with number keys on a keyboard. Right to left where the language is. */
export function Choices({ options, value, onChange, phase, answer, lang, dir, wide }: { options: string[]; value: number | null; onChange: (i: number) => void; phase: Phase; answer: number; lang?: string; dir?: 'rtl'; wide?: boolean }) {
  const { pointer } = useLayout();
  const { cue } = useLessonFeel();
  return (
    <div role="radiogroup" className={cx('grid gap-2.5', !wide && 'sm:grid-cols-2')}>
      {options.map((o, i) => {
        const chosen = value === i;
        const reveal = phase !== 'answer';
        const tone = reveal && i === answer ? 'border-sage bg-sage-soft text-ink' : reveal && chosen ? 'border-accent bg-accent-soft' : chosen ? 'border-ink bg-raised' : 'border-line bg-raised hover:border-line-strong';
        return (
          <motion.button
            key={`${o}-${i}`}
            type="button"
            role="radio"
            aria-checked={chosen}
            disabled={reveal}
            onClick={() => {
              cue('tap');
              onChange(i);
            }}
            animate={reveal && chosen && i !== answer ? { x: [0, -6, 6, -4, 4, 0] } : reveal && i === answer ? { scale: [1, 1.03, 1] } : { x: 0 }}
            transition={{ duration: 0.32 }}
            className={cx('no-callout flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-[16px] font-semibold transition-[background-color,border-color,transform] duration-150 active:scale-[0.98]', tone)}
          >
            {pointer === 'fine' && <Kbd>{i + 1}</Kbd>}
            <span lang={lang} dir={dir ?? 'auto'} className={cx('min-w-0 flex-1', wide && 'font-serif text-[18px] font-normal leading-snug', dir === 'rtl' && 'text-right text-[20px]')}>
              {o}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

// ── Listening ───────────────────────────────────────────────────────────────

/**
 * A big play button that says `text` once on its own when the exercise opens, then on a tap, with a
 * "Slower" link that reads it word by word.
 */
export function PlayBig({ lang, text, playKey, slower = true }: { lang: string; text: string; playKey: string; slower?: boolean }) {
  const { flag } = useSpeaker(lang);
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const say = useCallback(
    (slow = false) => {
      stopSpeaking();
      setState('loading');
      void speak(lang, slow ? text.split(/\s+/).join(', ') : text, { flag, onStart: () => setState('playing') })
        .catch(() => {})
        .finally(() => setState('idle'));
    },
    [lang, text, flag],
  );
  useEffect(() => {
    const t = window.setTimeout(() => say(), 250);
    return () => {
      window.clearTimeout(t);
      stopSpeaking();
    };
    // Once per exercise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playKey]);
  return (
    <div className="flex flex-col items-center gap-3">
      <motion.button type="button" onClick={() => say()} whileTap={{ scale: 0.94 }} className="grid size-24 place-items-center rounded-full bg-sage text-bg shadow-elev-2" aria-label="Play it again">
        {state === 'loading' ? <Loader2 size={34} className="animate-spin" aria-hidden /> : <Volume2 size={38} className={cx(state === 'playing' && 'animate-pulse')} aria-hidden />}
      </motion.button>
      {slower && (
        <button type="button" onClick={() => say(true)} className="text-[13px] font-semibold text-ink-soft underline decoration-line-strong underline-offset-4">
          Slower
        </button>
      )}
    </div>
  );
}
