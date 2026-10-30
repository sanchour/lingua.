// Hangman-style spelling (6-21, F0172 and F1196): five of the learner's words, each asked by its meaning. Typed with the keyboard or
// clicked on the letters; a hint shows a letter and costs a star. The word counts in the learner's record, never in a card's schedule.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Lightbulb, RotateCcw, Star } from 'lucide-react';
import { Link } from 'react-router';
import { clock } from '@/core/games/bests';
import type { Best } from '@/core/games/bests';
import type { GameDef } from '@/core/games/defs';
import { guess, hideIn, hint, isShown, MAX_HINTS, MAX_MISTAKES, MAX_STARS, startHangman, starsOf } from '@/core/games/hangman';
import type { HangmanState } from '@/core/games/hangman';
import { alphabetFor, graphemes, letterKey } from '@/core/games/letters';
import { usable } from '@/core/games/source';
import type { GameItem } from '@/core/games/source';
import { getLanguage, isRtl } from '@/core/lang/languages';
import { seededRandom, shuffle } from '@/core/srs/ludus';
import { recordGameWord, saveRound } from '@/data/games';
import { buttonClasses, Kbd, ToggleRow } from '@/design/primitives';
import { isEditable } from '@/design/hooks/useHotkeys';
import { cx } from '@/lib/cx';
import { useLessonFeel } from '@/features/lesson/kit';
import { GameFrame, Stat } from './GameFrame';
import { HangmanFigure } from './HangmanFigure';

interface Entry {
  item: GameItem;
  state: HangmanState;
}

const Stars = ({ n, of = MAX_STARS }: { n: number; of?: number }) => (
  <span className="inline-flex gap-0.5 text-accent-text" aria-label={`${n} of ${of} stars`}>
    {Array.from({ length: of }, (_, i) => (
      <Star key={i} size={15} aria-hidden className={i < n ? 'fill-current' : 'opacity-30'} />
    ))}
  </span>
);

export function Hangman({ lang, def, items, best }: { lang: string; def: GameDef; items: GameItem[]; best?: Best }) {
  const { answered, cue } = useLessonFeel();
  const rtl = isRtl(lang);
  const accents = getLanguage(lang)?.script === 'Latn';
  const [exact, setExact] = useState(false);
  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready');
  const [words, setWords] = useState<Entry[]>([]);
  const [at, setAt] = useState(0);
  const [, tick] = useState(0);
  const [outcome, setOutcome] = useState<{ beat: boolean; stars: number; ms: number } | null>(null);
  const random = useRef(seededRandom(1));
  const wordStart = useRef(0);
  const spent = useRef(0);
  const logged = useRef(-1);
  const nextButton = useRef<HTMLButtonElement>(null);

  const cur = words[at];
  const over = !!cur && cur.state.status !== 'playing';
  const alphabet = useMemo(() => alphabetFor(lang, words.flatMap((w) => w.state.keys)), [lang, words]);

  const start = () => {
    random.current = seededRandom(Date.now() % 2 ** 31);
    const picked = shuffle(usable(def, items, lang), random.current)
      .slice(0, def.round)
      .flatMap((item) => {
        const state = startHangman(item.term, { lang, exact });
        return state ? [{ item, state }] : [];
      });
    setWords(picked);
    setAt(0);
    setOutcome(null);
    logged.current = -1;
    spent.current = 0;
    wordStart.current = performance.now();
    setPhase('playing');
  };

  const change = useCallback((f: (s: HangmanState) => HangmanState) => setWords((ws) => ws.map((w, i) => (i === at ? { ...w, state: f(w.state) } : w))), [at]);

  const press = useCallback(
    (key: string) => {
      if (!cur || cur.state.status !== 'playing' || cur.state.guessed.includes(key) || cur.state.wrong.includes(key)) return;
      cue(cur.state.keys.includes(key) ? 'tap' : 'wrong');
      change((s) => guess(s, key));
    },
    [cur, cue, change],
  );

  const useHint = useCallback(() => {
    if (cur?.state.status === 'playing' && cur.state.hints < MAX_HINTS) change((s) => hint(s, random.current));
  }, [cur, change]);

  const next = useCallback(() => {
    if (at + 1 < words.length) {
      setAt(at + 1);
      wordStart.current = performance.now();
      return;
    }
    const stars = words.reduce((n, w) => n + starsOf(w.state), 0);
    const ms = Math.round(spent.current);
    setPhase('done');
    cue('finish');
    void saveRound(lang, def.id, { stars, of: words.length * MAX_STARS, ms, at: Date.now() }).then((r) => setOutcome({ beat: r.beat, stars, ms }));
  }, [at, words, cue, lang, def.id]);

  // A word that has ended is kept once: its time, a sound, and a line in the learner's record.
  useEffect(() => {
    if (phase !== 'playing' || !cur || cur.state.status === 'playing' || logged.current === at) return;
    logged.current = at;
    spent.current += performance.now() - wordStart.current;
    tick((n) => n + 1);
    const won = cur.state.status === 'won';
    answered(won);
    void recordGameWord(lang, cur.item.term, def.id, won, cur.state.hints > 0).catch(() => undefined);
    nextButton.current?.focus();
  }, [phase, cur, at, answered, lang, def.id]);

  // The clock runs while a word is being played, not while its answer is read.
  useEffect(() => {
    if (phase !== 'playing' || over) return;
    const t = window.setInterval(() => tick((n) => n + 1), 500);
    return () => window.clearInterval(t);
  }, [phase, over]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey || isEditable(e.target)) return;
      const onButton = e.target instanceof HTMLElement && !!e.target.closest('button, a');
      if (phase === 'ready' && e.key === 'Enter' && !onButton) return start();
      if (phase !== 'playing' || !cur) return;
      if (over) {
        if ((e.key === 'Enter' || e.key === ' ') && !onButton) {
          e.preventDefault();
          next();
        }
        return;
      }
      if (e.key === '1') return useHint();
      const marks = graphemes(e.key, lang);
      const key = marks.length === 1 ? letterKey(marks[0], { lang, exact }) : null;
      if (key && alphabet.includes(key)) press(key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const elapsed = spent.current + (phase === 'playing' && !over ? performance.now() - wordStart.current : 0);
  const earned = words.slice(0, phase === 'done' ? words.length : at + (over ? 1 : 0)).reduce((n, w) => n + starsOf(w.state), 0);
  const bestLine = best ? `${best.stars} stars in ${clock(best.ms)} · ${best.plays} ${best.plays === 1 ? 'round' : 'rounds'}` : 'None yet';

  const side = (
    <>
      <p className="text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">This round</p>
      <div className="space-y-2">
        <Stat label="Word">{phase === 'ready' ? `0 of ${def.round}` : `${Math.min(at + 1, words.length)} of ${words.length}`}</Stat>
        <Stat label="Stars">{earned}</Stat>
        <Stat label="Time">{clock(elapsed)}</Stat>
        <Stat label="Best">{bestLine}</Stat>
      </div>
      {phase === 'playing' && cur && (
        <button
          type="button"
          onClick={useHint}
          disabled={over || cur.state.hints >= MAX_HINTS}
          className={buttonClasses('secondary', 'md', true) + ' disabled:opacity-50'}
        >
          <Lightbulb size={16} aria-hidden /> Show a letter <Kbd>1</Kbd>
        </button>
      )}
      {phase === 'playing' && cur && <p className="text-[12.5px] text-ink-faint">A hint costs a star. {MAX_HINTS - cur.state.hints} left for this word.</p>}
      <div className="border-t border-line/70 pt-4 text-[13px] leading-relaxed text-ink-soft">
        <p>Type a letter or click it. Six wrong letters and the word is lost. A word is worth up to three stars: a hint costs one, so do three wrong letters.</p>
        <p className="mt-2">
          Playing here never changes when a card comes back. <Kbd>Enter</Kbd> goes on.
        </p>
      </div>
    </>
  );

  if (phase === 'ready')
    return (
      <GameFrame
        title="Hangman"
        eyebrow="Word game"
        side={side}
        main={
          <div className="max-w-xl">
            <p className="font-serif text-xl leading-snug">Five of your words, each asked by its meaning. Name the letters before the drawing is done.</p>
            {accents && (
              <div className="mt-5 rounded-2xl border border-line/70 bg-surface p-4">
                <ToggleRow
                  title="Accents count"
                  description={exact ? 'é and e are different letters: pick the accented ones from the letters.' : 'A plain letter also fills the accented ones, as when typing without accents.'}
                  checked={exact}
                  onChange={setExact}
                />
              </div>
            )}
            <button type="button" onClick={start} className={buttonClasses('primary', 'lg') + ' mt-6'}>
              Start
            </button>
          </div>
        }
      />
    );

  if (phase === 'done')
    return (
      <GameFrame
        title="Hangman"
        eyebrow="Round finished"
        side={side}
        main={
          <div>
            <p className="font-serif text-3xl font-semibold">
              {words.reduce((n, w) => n + starsOf(w.state), 0)} of {words.length * MAX_STARS} stars
            </p>
            <p className="mt-1 text-ink-soft">
              {clock(Math.round(spent.current))}
              {outcome?.beat ? ' · A new best.' : ''}
            </p>
            <ul className="mt-5 divide-y divide-line/70 rounded-2xl border border-line/70 bg-surface">
              {words.map((w, i) => (
                <li key={i} className="flex items-center gap-4 px-4 py-3">
                  <Stars n={starsOf(w.state)} />
                  <span className="font-serif text-lg font-semibold" lang={lang} dir={rtl ? 'rtl' : undefined}>
                    {w.item.term}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[14px] text-ink-soft">{w.item.meaning}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={start} className={buttonClasses('primary', 'lg')}>
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

  const s = cur.state;
  const example = cur.item.example && (over ? cur.item.example : s.wrong.length >= 2 ? hideIn(cur.item.example, cur.item.term, lang) : null);
  return (
    <GameFrame
      title="Hangman"
      eyebrow={`Word ${at + 1} of ${words.length}`}
      side={side}
      main={
        <div>
          <div className="rounded-3xl border border-line/70 bg-surface p-6">
            <p className="text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">Meaning</p>
            <p className="mt-1 font-serif text-2xl leading-snug">{cur.item.meaning}</p>
            {example && (
              <p className="mt-3 text-[15px] leading-snug text-ink-soft" lang={lang} dir={rtl ? 'rtl' : undefined}>
                {example}
              </p>
            )}
          </div>
          <div className="mt-6 flex items-center gap-8">
            <HangmanFigure wrong={s.wrong.length} max={MAX_MISTAKES} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-x-1.5 gap-y-3" lang={lang} dir={rtl ? 'rtl' : undefined} aria-live="polite" aria-label={over ? cur.item.term : `${s.keys.filter((k) => k !== null).length} letters`}>
                {s.marks.map((mark, i) =>
                  s.keys[i] === null ? (
                    <span key={i} className="grid h-12 min-w-3 place-items-end pb-1 font-serif text-3xl text-ink-soft">
                      {mark.trim() ? mark : ''}
                    </span>
                  ) : (
                    <span key={i} className={cx('grid h-12 w-10 place-items-center border-b-[3px] font-serif text-3xl font-semibold', isShown(s, i) ? 'border-ink' : 'border-line-strong', s.status === 'lost' && !s.guessed.includes(s.keys[i]!) && 'text-accent-text')}>
                      {isShown(s, i) ? mark : ''}
                    </span>
                  ),
                )}
              </div>
              <p className="mt-4 min-h-6 text-[14px] text-ink-soft">
                {s.wrong.length ? (
                  <>
                    Wrong: <bdi lang={lang}>{s.wrong.join('  ')}</bdi> ({s.wrong.length} of {MAX_MISTAKES})
                  </>
                ) : (
                  'No wrong letters yet.'
                )}
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-1.5" dir={rtl ? 'rtl' : undefined} lang={lang} role="group" aria-label="Letters">
            {alphabet.map((k) => {
              const right = s.guessed.includes(k);
              const wrong = s.wrong.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  disabled={right || wrong || over}
                  onClick={() => press(k)}
                  className={cx(
                    'grid size-10 place-items-center rounded-xl border text-lg font-semibold uppercase transition-colors',
                    right ? 'border-sage-text/30 bg-sage-soft text-sage-text' : wrong ? 'border-transparent bg-accent-soft text-accent-text opacity-60' : 'border-line bg-raised hover:border-line-strong hover:bg-surface',
                  )}
                >
                  {k}
                </button>
              );
            })}
          </div>
          {over && (
            <div className="mt-6 flex items-center gap-4 rounded-2xl border border-line/70 bg-surface p-4" role="status">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {s.status === 'won' ? 'Right: ' : 'It was '}
                  <span className="font-serif text-lg" lang={lang}>
                    {cur.item.term}
                  </span>
                </p>
                <Stars n={starsOf(s)} />
              </div>
              <button ref={nextButton} type="button" onClick={next} className={buttonClasses('primary', 'md')}>
                {at + 1 < words.length ? 'Next word' : 'See the round'} <Kbd tone="inverse">Enter</Kbd>
              </button>
            </div>
          )}
        </div>
      }
    />
  );
}
