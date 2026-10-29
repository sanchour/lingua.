import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Settings2, Zap } from 'lucide-react';
import { judge, solutionOf as engineSolution } from '@/core/exercise';
import type { TransformSpec } from '@/core/exercise';
import { checkAnswer } from '@/core/srs/answer';
import type { AnswerCheck } from '@/core/srs/answer';
import { EXERCISE_LABEL, gradeFor, MODE_OF, planLesson, planLightning, retryOf, seededRandom } from '@/core/srs/ludus';
import type { Exercise, ExerciseKind, LudusItem } from '@/core/srs/ludus';
import { DEFAULT_SETTINGS, useSettings } from '@/data/settings';
import { answerCard } from '@/data/study';
import { cardLookProps } from '../common/cardLook';
import type { Card, ReviewMode } from '@/data/types';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { IconButton } from '@/design/primitives';
import { spring } from '@/design/motion';
import { recognitionSupported } from '@/services/speech/recognition';
import { useSpeaker } from '@/features/speech/SpeakButton';
import { ComboBadge, FeedbackBar, LIGHTNING_MS, LightningClock, PRAISE, useLessonFeel } from '@/features/lesson/kit';
import type { LessonResult, Phase } from '@/features/lesson/kit';
import { ARTICLE_SETS, articleFor } from '../common/words';
import {
  ArticleExercise,
  BuildExercise,
  buildIsRight,
  ChoiceExercise,
  ClozeExercise,
  DictationExercise,
  dictationIsRight,
  ListenExercise,
  MatchExercise,
  SpeakExercise,
  SpellExercise,
  spellIsRight,
  TrueFalseExercise,
  TypeExercise,
} from './exercises';
import { TransformView } from '@/features/exercise/TransformView';
import { StudyBar } from './StudyBar';

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

/** Languages written in characters or joined script: no spelling from letter tiles. */
const NO_SPELL = new Set(['zh', 'ja', 'ko', 'ar']);

const ids = (ex: Exercise) => (ex.kind === 'match' ? ex.items.map((i) => i.id) : [ex.item.id]);

/** "der Hund", but "l’ami" (an elided article takes no space). */
const withArticle = (article: string, term: string) => (article.endsWith('’') ? article + term : `${article} ${term}`);

const isBuild = (ex: Exercise): ex is Extract<Exercise, { kind: 'build' | 'translate' }> => ex.kind === 'build' || ex.kind === 'translate';
const usesTiles = (ex: Exercise) => isBuild(ex) || ex.kind === 'dictation' || ex.kind === 'spell';

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
    case 'listen':
      return ex.options[ex.answer];
    case 'build':
    case 'translate':
      return ex.answer.join(' ');
    case 'dictation':
      return ex.item.example?.text ?? ex.answer.join(' ');
    case 'article':
      return withArticle(ex.options[ex.answer], ex.item.term);
    case 'truefalse':
      return `${ex.item.term} = ${ex.item.meaning}`;
    case 'transform':
      return engineSolution(ex.spec);
    case 'type':
    case 'speak':
    case 'spell':
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
  onFinish: (result: LessonResult) => void;
  onClose: () => void;
  onActive: (ms: number) => void;
  /** Opens the setup sheet. */
  onSetup?: () => void;
  /** Lightning: a minute of quick choices; logged as practice, never moving a schedule. */
  lightning?: boolean;
  /** Exercises the deck's own settings leave out. */
  deckOff?: string[];
  /** Cards with a form to change into another, by card id (made from their dictionary paradigm). */
  transforms?: ReadonlyMap<string, TransformSpec>;
}

/**
 * A Duolingo-style lesson over the chosen cards. No hearts, no penalties: mistakes come back once.
 * Right answers in a row build a combo; Lightning races the clock instead.
 */
export function Ludus({ lang, title, entries, pool, onFinish, onClose, onActive, onSetup, lightning = false, deckOff, transforms }: LudusProps) {
  const look = useSettings()?.cards ?? DEFAULT_SETTINGS.cards;
  const feel = useLessonFeel();
  const { speaker } = useSpeaker(lang);
  const canHear = Boolean(speaker && speaker.kind !== 'none');
  const random = useMemo(() => seededRandom(Date.now() % 2 ** 31), []);
  // Made once, with the voice as it was found by then: a lesson isn't remade when it settles.
  const setup = useRef(feel.settings);
  const hearAtStart = useRef(canHear);
  const plan = useMemo(
    () =>
      lightning
        ? planLightning(
            entries.map((e) => e.item),
            pool,
            random,
          )
        : planLesson(
            entries.map((e) => e.item),
            pool,
            {
              random,
              canSpeak: recognitionSupported(),
              articleOf: (i) => articleFor(lang, i.gender, i.term, i.pos),
              articles: ARTICLE_SETS[lang] ?? [],
              canHear: hearAtStart.current,
              canSpell: !NO_SPELL.has(lang),
              typing: setup.current.typing,
              off: new Set([...setup.current.ludusOff, ...(deckOff ?? [])] as ExerciseKind[]),
              transforms,
            },
          ),
    [entries, pool, random, lang, lightning, deckOff, transforms],
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
  /** What to say about a transformation: the near miss, or which part was wrong. */
  const [note, setNote] = useState<string | null>(null);
  const [praise, setPraise] = useState(PRAISE[0]);
  const stats = useRef({ first: 0, firstRight: 0, ms: 0 });
  const startedAt = useRef(performance.now());
  const retries = useRef(0);
  const finished = useRef(false);
  const [endsAt] = useState(() => (lightning ? Date.now() + LIGHTNING_MS : 0));
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    if (!lightning) return;
    const t = window.setInterval(() => setTick(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [lightning]);

  const ex = queue[0];
  const progress = lightning ? 1 - Math.max(0, endsAt - tick) / LIGHTNING_MS : answered / Math.max(1, answered + queue.length);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    const s = stats.current;
    onFinish({ answered: s.first, accuracy: s.first ? s.firstRight / s.first : 1, ms: s.ms, bestCombo: feel.best, score: lightning ? s.firstRight : undefined });
  }, [onFinish, feel.best, lightning]);

  const settle = (track: Track) => {
    const grade = gradeFor(track.mistakes, track.failed);
    void answerCard(track.entry.card, grade, { lang, mode: track.mode, durationMs: track.ms, affectSchedule: track.entry.schedule && !lightning });
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
    feel.answered(right);
    const cardIds = ids(exercise);
    for (const id of cardIds) {
      const t = tracks.current!.get(id);
      if (!t) continue;
      t.ms += ms / cardIds.length;
      t.mode = MODE_OF[exercise.kind];
      const slipped = slips?.get(id) ?? 0;
      t.mistakes += right ? slipped : 1;
      // Lightning goes round the cards again and again: each answer is logged on its own.
      if (lightning) {
        void answerCard(t.entry.card, right ? 3 : 1, { lang, mode: t.mode, durationMs: ms, affectSchedule: false });
        continue;
      }
      if (right || retry || exercise.kind === 'match') {
        if (!right && retry) t.failed = true;
        t.pending--;
        if (t.pending === 0) settle(t);
      }
    }
    if (!right && !retry && !lightning && exercise.kind !== 'match') {
      retries.current++;
      setQueue((q) => [...q, retryOf(exercise, random, retries.current)]);
    }
  };

  const ready = Boolean(ex) && (ex.kind === 'type' || ex.kind === 'transform' ? typed.trim().length > 0 : usesTiles(ex) ? tiles.length > 0 : ex.kind === 'speak' ? heard.length > 0 : ex.kind === 'match' ? false : choice !== null);

  const next = () => {
    setAnswered((n) => n + 1);
    setChoice(null);
    setTyped('');
    setTiles([]);
    setHeard([]);
    setClose(null);
    setNote(null);
    setPhase('answer');
    startedAt.current = performance.now();
    setQueue((q) => {
      const rest = q.slice(1);
      if (!rest.length) window.setTimeout(finish, 0);
      return rest;
    });
  };

  const check = (said = heard, picked = choice) => {
    if (!ex || phase !== 'answer' || ex.kind === 'match') return;
    if (usesTiles(ex) && !tiles.length) return;
    let right = false;
    let near: AnswerCheck | null = null;
    if (ex.kind === 'type') {
      if (!typed.trim()) return;
      near = checkAnswer(typed, ex.item.term, lang);
      right = near.verdict !== 'wrong';
    } else if (ex.kind === 'transform') {
      if (!typed.trim()) return;
      const j = judge(ex.spec.check, typed, lang);
      right = j.outcome === 'right' || j.outcome === 'close';
      setNote(j.message ?? (j.outcome === 'close' ? `Right: ${j.expected}` : null));
    } else if (isBuild(ex)) right = buildIsRight(ex, tiles, lang);
    else if (ex.kind === 'dictation') right = dictationIsRight(ex, tiles, lang);
    else if (ex.kind === 'spell') right = spellIsRight(ex, tiles);
    else if (ex.kind === 'speak') {
      if (!said.length) return;
      right = saidIt(said, ex.item.term, lang);
    } else {
      if (picked === null) return;
      right = picked === ex.answer;
    }
    setClose(near?.verdict === 'close' ? near : null);
    setPraise(PRAISE[Math.floor(random() * PRAISE.length)]);
    setPhase(right ? 'right' : 'wrong');
    record(ex, right);
    if (lightning) window.setTimeout(next, right ? 380 : 1300);
  };

  const onChoose = (i: number) => {
    setChoice(i);
    if (lightning) check(heard, i);
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
    enter: () => (phase === 'answer' ? check() : !lightning && next()),
    ...Object.fromEntries(Array.from({ length: choices }, (_, i) => [String(i + 1), () => phase === 'answer' && onChoose(i)])),
    escape: onClose,
  });

  const item = ex && ex.kind !== 'match' ? ex.item : null;
  return (
    <>
      <StudyBar title={title} progress={progress} onClose={onClose}>
        {lightning ? <LightningClock endsAt={endsAt} onEnd={finish} onTick={() => feel.cue('tick')} /> : <ComboBadge combo={feel.combo} burst={feel.burst} onBurstEnd={feel.clearBurst} />}
        {!lightning && onSetup && <IconButton icon={Settings2} label="Lesson settings" size="sm" onClick={onSetup} />}
      </StudyBar>
      <main
        className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 72px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 104px)', ...cardLookProps(look).style }}
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
              <p id="exercise-label" className="mb-6 flex items-center gap-2 text-[13px] font-bold tracking-[0.12em] text-sage-text uppercase">
                {lightning && <Zap size={14} aria-hidden />}
                {ex.key.includes('-r') ? 'One more try · ' : ''}
                {EXERCISE_LABEL[ex.kind]}
              </p>
              {(ex.kind === 'choose-meaning' || ex.kind === 'choose-term') && <ChoiceExercise ex={ex} lang={lang} value={choice} onChange={onChoose} phase={phase} />}
              {ex.kind === 'cloze' && <ClozeExercise ex={ex} lang={lang} value={choice} onChange={onChoose} phase={phase} />}
              {isBuild(ex) && <BuildExercise ex={ex} lang={lang} value={tiles} onChange={setTiles} phase={phase} />}
              {ex.kind === 'article' && <ArticleExercise ex={ex} lang={lang} value={choice} onChange={onChoose} phase={phase} />}
              {ex.kind === 'speak' && <SpeakExercise ex={ex} lang={lang} heard={heard} onHeard={onHeard} phase={phase} onSkip={skipSpeaking} />}
              {ex.kind === 'type' && <TypeExercise ex={ex} lang={lang} value={typed} onChange={setTyped} phase={phase} onSubmit={() => (phase === 'answer' ? check() : next())} />}
              {ex.kind === 'transform' && <TransformView spec={ex.spec} lang={lang} value={typed} onChange={setTyped} phase={phase} onSubmit={() => (phase === 'answer' ? check() : next())} />}
              {ex.kind === 'match' && <MatchExercise ex={ex} lang={lang} onDone={onMatched} random={random} />}
              {ex.kind === 'listen' && <ListenExercise ex={ex} lang={lang} value={choice} onChange={onChoose} phase={phase} />}
              {ex.kind === 'dictation' && <DictationExercise ex={ex} lang={lang} value={tiles} onChange={setTiles} phase={phase} />}
              {ex.kind === 'spell' && <SpellExercise ex={ex} lang={lang} value={tiles} onChange={setTiles} phase={phase} />}
              {ex.kind === 'truefalse' && <TrueFalseExercise ex={ex} lang={lang} value={choice} onChange={onChoose} phase={phase} />}
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <FeedbackBar
        phase={phase}
        ready={ready}
        onCheck={() => check()}
        onNext={next}
        praise={praise}
        hint={ex?.kind === 'match' ? 'Tap a word, then its meaning' : lightning && ex && 'options' in ex ? 'Tap an answer' : undefined}
        rightNote={
          ex?.kind === 'transform' ? (
            <p className="text-sm text-ink-soft">{note ?? ex.spec.feedback?.why}</p>
          ) : close ? (
            <p className="text-sm text-ink-soft">
              {close.note === 'accent' ? 'Mind the accents: ' : 'Nearly — it’s spelled '}
              <span lang={lang} className="font-semibold text-ink">
                {close.expected}
              </span>
            </p>
          ) : item && ex.kind !== 'choose-meaning' ? (
            <p className="truncate text-sm text-ink-soft">
              {item.term} — {item.meaning}
            </p>
          ) : null
        }
        wrong={
          ex && (
            <>
              <p className="text-[13px] font-bold tracking-wide text-accent-text uppercase">Correct answer</p>
              <p lang={ex.kind === 'choose-meaning' || ex.kind === 'translate' || ex.kind === 'truefalse' ? undefined : lang} className="font-serif text-xl font-semibold">
                {solution(ex)}
              </p>
              {ex.kind === 'transform' && (
                <p className="text-sm text-ink-soft">
                  {note && <span className="font-semibold text-ink">{note} </span>}
                  {ex.spec.feedback?.why}
                </p>
              )}
              {item && ex.kind !== 'truefalse' && ex.kind !== 'transform' && (
                <p className="truncate text-sm text-ink-soft">
                  {item.term} — {item.meaning}
                </p>
              )}
            </>
          )
        }
      />
    </>
  );
}
