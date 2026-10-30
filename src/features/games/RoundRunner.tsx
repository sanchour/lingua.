// A round of a game (6-21): the ready screen, the entries one after another (words, puzzles or passages), the clock, the reveal after
// each, the end with its stars, the best kept and a line in the learner's record for every word. A game only draws its board.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { RotateCcw, Star } from 'lucide-react';
import { Link } from 'react-router';
import { clock } from '@/core/games/bests';
import type { Best } from '@/core/games/bests';
import type { GameDef } from '@/core/games/defs';
import { MAX_STARS } from '@/core/games/hangman';
import { seededRandom } from '@/core/srs/ludus';
import { recordGameWord, saveRound } from '@/data/games';
import { isEditable } from '@/design/hooks/useHotkeys';
import { buttonClasses, Kbd } from '@/design/primitives';
import { useLessonFeel } from '@/features/lesson/kit';
import { GameFrame, Stat } from './GameFrame';

/** What a board reports when its entry is over. */
export interface Settled {
  won: boolean;
  stars: number;
  hints: number;
  /** The line after it: 'Right: gato', 'Found 5 of 7'. */
  message: string;
  /** Words of the entry that were missed, for the record. */
  wrong?: string[];
}

export interface BoardProps<E> {
  entry: E;
  lang: string;
  random: () => number;
  settle: (r: Settled) => void;
}

export const Stars = ({ n, of = MAX_STARS }: { n: number; of?: number }) => (
  <span className="inline-flex gap-0.5 text-accent-text" aria-label={`${n} of ${of} stars`}>
    {Array.from({ length: of }, (_, i) => (
      <Star key={i} size={15} aria-hidden className={i < n ? 'fill-current' : 'opacity-30'} />
    ))}
  </span>
);

interface RunnerProps<E> {
  lang: string;
  def: GameDef;
  best?: Best;
  /** What one entry is called: Word, Puzzle, Passage. */
  unit: string;
  intro: ReactNode;
  /** On the ready screen, above Start. */
  options?: ReactNode;
  /** Made when Start is pressed. An empty list shows `empty` instead. */
  make: (random: () => number) => E[] | Promise<E[]>;
  empty?: string;
  /** The learner's words an entry is about, for the record. */
  terms: (e: E) => string[];
  /** How an entry reads in the list at the end. */
  label: (e: E, i: number) => { title: string; detail?: string };
  Board: ComponentType<BoardProps<E>>;
  rules: ReactNode;
  rtl?: boolean;
}

export function RoundRunner<E>({ lang, def, best, unit, intro, options, make, empty, terms, label, Board, rules, rtl }: RunnerProps<E>) {
  const { answered, cue } = useLessonFeel();
  const [phase, setPhase] = useState<'ready' | 'making' | 'playing' | 'done' | 'empty'>('ready');
  const [entries, setEntries] = useState<E[]>([]);
  const [results, setResults] = useState<Array<Settled | null>>([]);
  const [at, setAt] = useState(0);
  const [, tick] = useState(0);
  const random = useRef(seededRandom(1));
  const entryStart = useRef(0);
  const spent = useRef(0);
  const nextButton = useRef<HTMLButtonElement>(null);
  const [outcome, setOutcome] = useState<{ beat: boolean } | null>(null);

  const result = results[at] ?? null;
  const stars = results.reduce((n, r) => n + (r?.stars ?? 0), 0);

  const start = async () => {
    random.current = seededRandom(Date.now() % 2 ** 31);
    setPhase('making');
    const made = await make(random.current);
    if (!made.length) return setPhase('empty');
    setEntries(made);
    setResults(made.map(() => null));
    setAt(0);
    setOutcome(null);
    spent.current = 0;
    entryStart.current = performance.now();
    setPhase('playing');
  };

  const settle = useCallback(
    (r: Settled) => {
      if (results[at]) return;
      spent.current += performance.now() - entryStart.current;
      setResults((rs) => rs.map((x, i) => (i === at ? r : x)));
      answered(r.won);
      for (const term of terms(entries[at])) void recordGameWord(lang, term, def.id, r.won && !r.wrong?.includes(term), r.hints > 0).catch(() => undefined);
    },
    [results, at, answered, terms, entries, lang, def.id],
  );

  useEffect(() => {
    if (result) nextButton.current?.focus();
  }, [result]);

  const next = useCallback(() => {
    if (at + 1 < entries.length) {
      setAt(at + 1);
      entryStart.current = performance.now();
      return;
    }
    const total = results.reduce((n, r) => n + (r?.stars ?? 0), 0);
    const ms = Math.round(spent.current);
    setPhase('done');
    cue('finish');
    void saveRound(lang, def.id, { stars: total, of: entries.length * MAX_STARS, ms, at: Date.now() }).then((r) => setOutcome({ beat: r.beat }));
  }, [at, entries.length, results, cue, lang, def.id]);

  // The clock runs while an entry is being played, not while its answer is read.
  useEffect(() => {
    if (phase !== 'playing' || result) return;
    const t = window.setInterval(() => tick((n) => n + 1), 500);
    return () => window.clearInterval(t);
  }, [phase, result]);

  const latest = useRef({ phase, result, next, start });
  useEffect(() => {
    latest.current = { phase, result, next, start };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey || isEditable(e.target) || (e.key !== 'Enter' && e.key !== ' ')) return;
      if (e.target instanceof HTMLElement && e.target.closest('button, a')) return;
      const l = latest.current;
      if (l.phase === 'ready' && e.key === 'Enter') void l.start();
      else if (l.phase === 'playing' && l.result) {
        e.preventDefault();
        l.next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const elapsed = spent.current + (phase === 'playing' && !result ? performance.now() - entryStart.current : 0);
  const bestLine = best ? `${best.stars} stars in ${clock(best.ms)} · ${best.plays} ${best.plays === 1 ? 'round' : 'rounds'}` : 'None yet';
  const shown = phase === 'playing' ? Math.min(at + 1, entries.length) : phase === 'done' ? entries.length : 0;

  const side = (
    <>
      <p className="text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">This round</p>
      <div className="space-y-2">
        <Stat label={unit}>{phase === 'ready' || phase === 'making' || phase === 'empty' ? '–' : `${shown} of ${entries.length}`}</Stat>
        <Stat label="Stars">{stars}</Stat>
        <Stat label="Time">{clock(elapsed)}</Stat>
        <Stat label="Best">{bestLine}</Stat>
      </div>
      <div className="border-t border-line/70 pt-4 text-[13px] leading-relaxed text-ink-soft">
        {rules}
        <p className="mt-2">
          Playing here never changes when a card comes back. <Kbd>Enter</Kbd> goes on.
        </p>
      </div>
    </>
  );

  if (phase === 'ready' || phase === 'making' || phase === 'empty')
    return (
      <GameFrame
        title={def.title}
        eyebrow="Word game"
        side={side}
        main={
          <div className="max-w-xl">
            <p className="font-serif text-xl leading-snug">{intro}</p>
            {options && <div className="mt-5 rounded-2xl border border-line/70 bg-surface p-4">{options}</div>}
            {phase === 'empty' && (
              <p className="mt-5 text-[14px] text-accent-text" role="status">
                {empty ?? 'This could not be made from what you have yet.'}
              </p>
            )}
            <button type="button" onClick={() => void start()} disabled={phase === 'making'} className={buttonClasses('primary', 'lg') + ' mt-6'}>
              {phase === 'making' ? 'Getting it ready…' : 'Start'}
            </button>
          </div>
        }
      />
    );

  if (phase === 'done')
    return (
      <GameFrame
        title={def.title}
        eyebrow="Round finished"
        side={side}
        main={
          <div>
            <p className="font-serif text-3xl font-semibold">
              {stars} of {entries.length * MAX_STARS} stars
            </p>
            <p className="mt-1 text-ink-soft">
              {clock(Math.round(spent.current))}
              {outcome?.beat ? ' · A new best.' : ''}
            </p>
            <ul className="mt-5 divide-y divide-line/70 rounded-2xl border border-line/70 bg-surface">
              {entries.map((e, i) => {
                const l = label(e, i);
                return (
                  <li key={i} className="flex items-center gap-4 px-4 py-3">
                    <Stars n={results[i]?.stars ?? 0} />
                    <span className="font-serif text-lg font-semibold" lang={lang} dir={rtl ? 'rtl' : undefined}>
                      {l.title}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[14px] text-ink-soft">{l.detail}</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => void start()} className={buttonClasses('primary', 'lg')}>
                <RotateCcw size={16} aria-hidden /> Play again
              </button>
              <Link to="/thesaurus/games" className={buttonClasses('secondary', 'lg')}>
                All games
              </Link>
            </div>
          </div>
        }
      />
    );

  return (
    <GameFrame
      title={def.title}
      eyebrow={`${unit} ${at + 1} of ${entries.length}`}
      side={side}
      main={
        <div>
          <Board key={at} entry={entries[at]} lang={lang} random={random.current} settle={settle} />
          {result && (
            <div className="mt-6 flex items-center gap-4 rounded-2xl border border-line/70 bg-surface p-4" role="status">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{result.message}</p>
                <Stars n={result.stars} />
              </div>
              <button ref={nextButton} type="button" onClick={next} className={buttonClasses('primary', 'md')}>
                {at + 1 < entries.length ? `Next ${unit.toLowerCase()}` : 'See the round'} <Kbd tone="inverse">Enter</Kbd>
              </button>
            </div>
          )}
        </div>
      }
    />
  );
}

/** Calls `settle` once, when a board's state has ended. */
export function useSettleOnce(over: boolean, settle: () => void): void {
  const done = useRef(false);
  useEffect(() => {
    if (!over || done.current) return;
    done.current = true;
    settle();
  });
}
