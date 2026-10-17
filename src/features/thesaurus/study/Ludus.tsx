import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check } from 'lucide-react';
import { checkAnswer } from '@/core/srs/answer';
import type { AnswerCheck } from '@/core/srs/answer';
import { EXERCISE_LABEL, gradeFor, MODE_OF, planLesson, retryOf, seededRandom } from '@/core/srs/ludus';
import type { Exercise, LudusItem } from '@/core/srs/ludus';
import { DEFAULT_SETTINGS, useSettings } from '@/data/settings';
import { answerCard } from '@/data/study';
import { cardLookProps } from '../common/cardLook';
import type { Card, ReviewMode } from '@/data/types';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { useLayout } from '@/design/hooks/useLayout';
import { Button, Kbd } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { recognitionSupported } from '@/services/speech/recognition';
import { ARTICLE_SETS, articleFor } from '../common/words';
import { ArticleExercise, BuildExercise, buildIsRight, ChoiceExercise, ClozeExercise, MatchExercise, SpeakExercise, TypeExercise } from './exercises';
import type { Phase } from './exercises';
import { StudyBar } from './StudyBar';
import type { SummaryStats } from './Summary';

export interface LudusEntry {
  card: Card;
  item: LudusItem;
  /** Due (or new) cards move on the schedule; extra practice is only logged. */
  schedule: boolean;
}

interface Track {
  entry: LudusEntry;
  pending: number;
  mistakes: number;
  failed: boolean;
  ms: number;
  mode: ReviewMode;
}

const PRAISE = ['Lovely', 'Exactly', 'Well done', 'Nicely done', 'Perfect', 'Spot on'];

const ids = (ex: Exercise) => (ex.kind === 'match' ? ex.items.map((i) => i.id) : [ex.item.id]);

/** "der Hund", but "l’ami" (an elided article takes no space). */
const withArticle = (article: string, term: string) => (article.endsWith('’') ? article + term : `${article} ${term}`);

const isBuild = (ex: Exercise): ex is Extract<Exercise, { kind: 'build' | 'translate' }> => ex.kind === 'build' || ex.kind === 'translate';

/** Recognisers often add the article or other words: the last words are compared too. */
function saidIt(heard: string[], term: string, lang: string): boolean {
  const n = term.trim().split(/\s+/).length;
  return heard.some((h) => [h, h.trim().split(/\s+/).slice(-n).join(' ')].some((said) => checkAnswer(said, term, lang).verdict !== 'wrong'));
}

function solution(ex: Exercise): string {
  switch (ex.kind) {
    case 'choose-meaning':
    case 'choose-term':
    case 'cloze':
      return ex.options[ex.answer];
    case 'build':
    case 'translate':
      return ex.answer.join(' ');
    case 'article':
      return withArticle(ex.options[ex.answer], ex.item.term);
    case 'type':
    case 'speak':
      return ex.item.term;
    default:
      return '';
  }
}

interface LudusProps {
  lang: string;
  title: string;
  entries: LudusEntry[];
  pool: LudusItem[];
  onFinish: (stats: SummaryStats) => void;
  onClose: () => void;
  onActive: (ms: number) => void;
}

/** A Duolingo-style lesson over the chosen cards. No hearts, no penalties: mistakes come back once. */
export function Ludus({ lang, title, entries, pool, onFinish, onClose, onActive }: LudusProps) {
  const { pointer } = useLayout();
  const look = useSettings()?.cards ?? DEFAULT_SETTINGS.cards;
  const random = useMemo(() => seededRandom(Date.now() % 2 ** 31), []);
  const plan = useMemo(
    () =>
      planLesson(
        entries.map((e) => e.item),
        pool,
        { random, canSpeak: recognitionSupported(), articleOf: (i) => articleFor(lang, i.gender, i.term, i.pos), articles: ARTICLE_SETS[lang] ?? [] },
      ),
    [entries, pool, random, lang],
  );
  const tracks = useRef<Map<string, Track> | null>(null);
  if (!tracks.current) {
    const map = new Map<string, Track>(entries.map((e) => [e.item.id, { entry: e, pending: 0, mistakes: 0, failed: false, ms: 0, mode: 'mcq' as ReviewMode }]));
    for (const ex of plan) for (const id of ids(ex)) map.get(id)!.pending++;
    tracks.current = map;
  }

  const [queue, setQueue] = useState<Exercise[]>(plan);
  const [answered, setAnswered] = useState(0);
  const [phase, setPhase] = useState<Phase>('answer');
  const [choice, setChoice] = useState<number | null>(null);
  const [typed, setTyped] = useState('');
  const [tiles, setTiles] = useState<number[]>([]);
  const [heard, setHeard] = useState<string[]>([]);
  const [close, setClose] = useState<AnswerCheck | null>(null);
  const [praise, setPraise] = useState(PRAISE[0]);
  const stats = useRef({ first: 0, firstRight: 0, ms: 0 });
  const startedAt = useRef(performance.now());
  const retries = useRef(0);

  const ex = queue[0];
  const progress = answered / Math.max(1, answered + queue.length);

  const settle = (track: Track) => {
    const grade = gradeFor(track.mistakes, track.failed);
    void answerCard(track.entry.card, grade, { lang, mode: track.mode, durationMs: track.ms, affectSchedule: track.entry.schedule });
  };

  /** Records an exercise's outcome on its cards; a first miss earns one retry at the end. */
  const record = (exercise: Exercise, right: boolean, slips?: Map<string, number>) => {
    const ms = Math.min(60_000, performance.now() - startedAt.current);
    onActive(ms);
    stats.current.ms += ms;
    const retry = exercise.key.includes('-r');
    if (!retry) {
      stats.current.first++;
      if (right) stats.current.firstRight++;
    }
    const cardIds = ids(exercise);
    for (const id of cardIds) {
      const t = tracks.current!.get(id);
      if (!t) continue;
      t.ms += ms / cardIds.length;
      t.mode = MODE_OF[exercise.kind];
      const slipped = slips?.get(id) ?? 0;
      t.mistakes += right ? slipped : 1;
      if (right || retry || exercise.kind === 'match') {
        if (!right && retry) t.failed = true;
        t.pending--;
        if (t.pending === 0) settle(t);
      }
    }
    if (!right && !retry && exercise.kind !== 'match') {
      retries.current++;
      setQueue((q) => [...q, retryOf(exercise, random, retries.current)]);
    }
  };

  const ready =
    ex &&
    (ex.kind === 'type' ? typed.trim().length > 0 : isBuild(ex) ? tiles.length > 0 : ex.kind === 'speak' ? heard.length > 0 : ex.kind === 'match' ? false : choice !== null);

  const check = (said = heard) => {
    if (!ex || phase !== 'answer') return;
    if (!ready && !(ex.kind === 'speak' && said.length)) return;
    let right = false;
    let near: AnswerCheck | null = null;
    if (ex.kind === 'type') {
      near = checkAnswer(typed, ex.item.term, lang);
      right = near.verdict !== 'wrong';
    } else if (isBuild(ex)) right = buildIsRight(ex, tiles, lang);
    else if (ex.kind === 'speak') right = saidIt(said, ex.item.term, lang);
    else if (ex.kind !== 'match') right = choice === ex.answer;
    setClose(near?.verdict === 'close' ? near : null);
    setPraise(PRAISE[Math.floor(random() * PRAISE.length)]);
    setPhase(right ? 'right' : 'wrong');
    record(ex, right);
  };

  const next = () => {
    if (phase === 'answer') return;
    setAnswered((n) => n + 1);
    setChoice(null);
    setTyped('');
    setTiles([]);
    setHeard([]);
    setClose(null);
    setPhase('answer');
    startedAt.current = performance.now();
    const rest = queue.slice(1);
    setQueue(rest);
    if (!rest.length) {
      const s = stats.current;
      onFinish({ cards: entries.length, accuracy: s.first ? s.firstRight / s.first : 1, ms: s.ms });
    }
  };

  const onMatched = (slips: Map<string, number>) => {
    if (!ex || ex.kind !== 'match') return;
    const clean = [...slips.values()].every((n) => !n);
    setPraise(clean ? PRAISE[Math.floor(random() * PRAISE.length)] : 'All matched');
    setPhase('right');
    record(ex, true, slips);
  };

  /** A recognised word that matches is checked at once; a mishearing can simply be tried again. */
  const onHeard = (alternatives: string[]) => {
    setHeard(alternatives);
    if (ex?.kind === 'speak' && saidIt(alternatives, ex.item.term, lang)) check(alternatives);
  };

  /** "Can’t speak now": this and the lesson's other speaking exercises become typing ones. */
  const skipSpeaking = () => {
    setHeard([]);
    setQueue((q) => q.map((e): Exercise => (e.kind === 'speak' ? { key: `${e.key}t`, kind: 'type', item: e.item } : e)));
  };

  const choices = ex && 'options' in ex ? ex.options.length : 0;
  useHotkeys({
    enter: () => (phase === 'answer' ? check() : next()),
    ...Object.fromEntries(Array.from({ length: choices }, (_, i) => [String(i + 1), () => phase === 'answer' && setChoice(i)])),
    escape: onClose,
  });

  const item = ex && ex.kind !== 'match' ? ex.item : null;
  return (
    <>
      <StudyBar title={title} progress={progress} onClose={onClose} />
      <main
        className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 84px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 150px)', ...cardLookProps(look).style }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {ex && (
            <motion.section
              key={ex.key}
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -28, transition: { duration: 0.15 } }}
              transition={spring.soft}
              aria-labelledby="exercise-label"
            >
              <p id="exercise-label" className="mb-6 text-[13px] font-bold tracking-[0.12em] text-sage-text uppercase">
                {ex.key.includes('-r') ? 'One more try · ' : ''}
                {EXERCISE_LABEL[ex.kind]}
              </p>
              {(ex.kind === 'choose-meaning' || ex.kind === 'choose-term') && <ChoiceExercise ex={ex} lang={lang} value={choice} onChange={setChoice} phase={phase} />}
              {ex.kind === 'cloze' && <ClozeExercise ex={ex} lang={lang} value={choice} onChange={setChoice} phase={phase} />}
              {isBuild(ex) && <BuildExercise ex={ex} lang={lang} value={tiles} onChange={setTiles} phase={phase} />}
              {ex.kind === 'article' && <ArticleExercise ex={ex} lang={lang} value={choice} onChange={setChoice} phase={phase} />}
              {ex.kind === 'speak' && <SpeakExercise ex={ex} lang={lang} heard={heard} onHeard={onHeard} phase={phase} onSkip={skipSpeaking} />}
              {ex.kind === 'type' && <TypeExercise ex={ex} lang={lang} value={typed} onChange={setTyped} phase={phase} onSubmit={() => (phase === 'answer' ? check() : next())} />}
              {ex.kind === 'match' && <MatchExercise ex={ex} lang={lang} onDone={onMatched} random={random} />}
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Check / feedback bar */}
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
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sage text-bg">
                  <Check size={22} strokeWidth={3} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="font-serif text-xl font-semibold text-sage-text">{praise}</p>
                  {close && (
                    <p className="text-sm text-ink-soft">
                      {close.note === 'accent' ? 'Mind the accents: ' : 'Nearly — it’s spelled '}
                      <span lang={lang} className="font-semibold text-ink">
                        {close.expected}
                      </span>
                    </p>
                  )}
                  {!close && item && ex.kind !== 'choose-meaning' && <p className="truncate text-sm text-ink-soft">{item.term} — {item.meaning}</p>}
                </div>
              </motion.div>
            )}
            {phase === 'wrong' && ex && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring.snappy}>
                <p className="text-[13px] font-bold tracking-wide text-accent-text uppercase">Correct answer</p>
                <p lang={ex.kind === 'choose-meaning' || ex.kind === 'translate' ? undefined : lang} className="font-serif text-xl font-semibold">
                  {solution(ex)}
                </p>
                {item && <p className="truncate text-sm text-ink-soft">{item.term} — {item.meaning}</p>}
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {ex?.kind === 'match' && phase === 'answer' ? (
              <p className="text-sm text-ink-soft">Tap a word, then its meaning</p>
            ) : (
              <Button size="lg" className="min-w-40 flex-1 sm:flex-none" variant={phase === 'answer' ? 'primary' : 'accent'} disabled={phase === 'answer' && !ready} onClick={() => (phase === 'answer' ? check() : next())}>
                {phase === 'answer' ? 'Check' : 'Continue'}
                {pointer === 'fine' && <Kbd tone="inverse">Enter</Kbd>}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
