import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, Keyboard, Settings2, Zap } from 'lucide-react';
import { checkForm, DRILL_LABEL, hasItem, itemDrill, retryDrill, solutionOf, tilesMatch } from '@/core/grammar/drills';
import type { Drill, DrillKind, FormCheck } from '@/core/grammar/drills';
import type { Step } from '@/core/grammar/progress';
import { gradeFor } from '@/core/srs/ludus';
import type { Item, Topic } from '@/core/grammar/types';
import { answerGrammarItem } from '@/data/grammar';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { IconButton } from '@/design/primitives';
import { spring } from '@/design/motion';
import { StudyBar } from '@/features/thesaurus/study/StudyBar';
import { SpeakButton } from '@/features/speech/SpeakButton';
import { ComboBadge, FeedbackBar, LIGHTNING_MS, LightningClock, PRAISE, useLessonFeel } from '@/features/lesson/kit';
import type { LessonResult, Phase } from '@/features/lesson/kit';
import type { OwnSentenceCheck } from '@/services/llm/grammar';
import { BuildView, HearView, OwnView, PairsView, PickView, RecogniseView, SpotView, TableGapView, TilesView } from './drillViews';
import { LessonSide, RuleSheet, SeeIt } from './lessonParts';
import { Rich, SentenceLine } from './parts';

interface Track {
  topic: string;
  item: Item;
  pending: number;
  mistakes: number;
  failed: boolean;
  ms: number;
}

const trackKey = (topic: string, item: Item) => `${topic}|${item.s}`;

export interface Missed {
  topic: string;
  item: Item;
}

export interface GrammarLessonOutcome {
  result: LessonResult;
  /** First tries per topic: how many, how many right (for passing a step). */
  byTopic: Map<string, { n: number; right: number }>;
  /** Items missed on the first try, for the end's short review. */
  missed: Missed[];
}

interface Props {
  lang: string;
  title: string;
  drills: Drill[];
  topics: Map<string, Topic>;
  random: () => number;
  /** Lightning: the round ends at this time; no retries, choices check themselves. */
  endsAt?: number;
  /** Logged without moving any schedule. */
  practice?: boolean;
  /** A missed exercise comes back once at the end (not in the placement check). */
  retries?: boolean;
  /** Examples first: the whole "See it" (a topic's first lesson), a short one, or none. */
  intro?: { topic: Topic; full: boolean };
  /** The step this lesson can pass, for the side column. */
  step?: Step | null;
  onFinish: (o: GrammarLessonOutcome) => void;
  onClose: () => void;
  onActive: (ms: number) => void;
  onSetup: () => void;
  /** Other titles for some kinds of exercise (the course's words: "Which word is it?"). */
  labels?: Partial<Record<DrillKind, string>>;
}

/**
 * A grammar lesson: examples first, then the drills one by one, a missed one back once at the end
 * (Lightning has no retries), the topic's reason and its whole rule a tap away on a mistake, and each
 * item graded into its FSRS card when it is done with (no mistake Good, right on the retry Hard,
 * missed twice Again).
 */
export function GrammarLesson({ lang, title, drills, topics, random, endsAt, practice, retries: allowRetries = true, intro, step, onFinish, onClose, onActive, onSetup, labels }: Props) {
  const lightning = endsAt !== undefined;
  const feel = useLessonFeel();
  const tracks = useRef<Map<string, Track> | null>(null);
  if (!tracks.current) {
    const map = new Map<string, Track>();
    for (const d of drills) {
      if (!hasItem(d)) continue;
      const k = trackKey(d.topic, d.item);
      const t = map.get(k) ?? { topic: d.topic, item: d.item, pending: 0, mistakes: 0, failed: false, ms: 0 };
      t.pending++;
      map.set(k, t);
    }
    tracks.current = map;
  }

  const [seeing, setSeeing] = useState(Boolean(intro));
  const [queue, setQueue] = useState<Drill[]>(drills);
  const [done, setDone] = useState(0);
  const [phase, setPhase] = useState<Phase>('answer');
  const [choice, setChoice] = useState<number | null>(null);
  const [typed, setTyped] = useState('');
  const [tiles, setTiles] = useState<number[]>([]);
  const [near, setNear] = useState<FormCheck | null>(null);
  const [own, setOwn] = useState<{ checking: boolean; result?: OwnSentenceCheck; error?: string }>({ checking: false });
  const [praise, setPraise] = useState(PRAISE[0]);
  const [rule, setRule] = useState<Topic | null>(null);
  const stats = useRef({ first: 0, firstRight: 0, ms: 0, byTopic: new Map<string, { n: number; right: number }>(), missed: [] as Missed[] });
  const startedAt = useRef(performance.now());
  const retries = useRef(0);
  const finished = useRef(false);

  const d = queue[0];
  // Lightning's bar is the clock running down; a lesson's is the share of exercises done.
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    if (!lightning) return;
    const t = window.setInterval(() => setTick(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [lightning]);
  const progress = lightning && endsAt ? 1 - Math.max(0, endsAt - tick) / LIGHTNING_MS : done / Math.max(1, done + queue.length);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    const s = stats.current;
    onFinish({
      result: { answered: s.first, accuracy: s.first ? s.firstRight / s.first : 1, ms: s.ms, bestCombo: feel.best, score: lightning ? s.firstRight : undefined },
      byTopic: s.byTopic,
      missed: s.missed,
    });
  }, [onFinish, feel.best, lightning]);

  const settle = (t: Track) => {
    void answerGrammarItem({ lang, topic: t.topic, item: t.item, grade: gradeFor(t.mistakes, t.failed), durationMs: t.ms, practice: practice || lightning });
  };

  /** Records an exercise's outcome; a first miss earns one retry at the end. */
  const record = (drill: Drill, right: boolean) => {
    const ms = Math.min(60_000, performance.now() - startedAt.current);
    onActive(ms);
    stats.current.ms += ms;
    const retry = drill.key.includes('-r');
    // The AI's own-sentence exercise is practice: it counts for the combo, not the step.
    if (!retry && drill.kind !== 'own') {
      stats.current.first++;
      if (right) stats.current.firstRight++;
      const t = stats.current.byTopic.get(drill.topic) ?? { n: 0, right: 0 };
      t.n++;
      if (right) t.right++;
      stats.current.byTopic.set(drill.topic, t);
      if (!right && hasItem(drill) && !stats.current.missed.some((m) => m.item.s === drill.item.s)) stats.current.missed.push({ topic: drill.topic, item: drill.item });
    }
    feel.answered(right);
    if (hasItem(drill)) {
      const t = tracks.current!.get(trackKey(drill.topic, drill.item));
      if (t) {
        t.ms += ms;
        if (!right) t.mistakes++;
        if (right || retry || lightning || !allowRetries) {
          if (!right && retry) t.failed = true;
          t.pending--;
          if (t.pending === 0) settle(t);
        }
      }
    }
    if (!right && !retry && !lightning && allowRetries && drill.kind !== 'pairs' && drill.kind !== 'own') {
      retries.current++;
      setQueue((q) => [...q, retryDrill(drill, random, retries.current)]);
    }
  };

  const ready =
    Boolean(d) &&
    (d.kind === 'build' || d.kind === 'own' ? typed.trim().length > 0 && !own.checking : d.kind === 'order' || d.kind === 'say' ? tiles.length > 0 : d.kind === 'pairs' ? false : choice !== null);

  /** The AI reads the learner's own sentence; a failure leaves the exercise open to try again or skip. */
  const checkOwn = async (drill: Extract<Drill, { kind: 'own' }>) => {
    const topic = topics.get(drill.topic);
    if (!topic) return;
    setOwn({ checking: true });
    try {
      const { checkOwnSentence } = await import('@/services/llm/grammar');
      const result = await checkOwnSentence(lang, topic, typed);
      setOwn({ checking: false, result });
      const right = result.correct && result.usesTopic;
      setPraise(right ? PRAISE[Math.floor(random() * PRAISE.length)] : 'Nearly');
      setPhase(right ? 'right' : 'wrong');
      record(drill, right);
    } catch (e) {
      setOwn({ checking: false, error: e instanceof Error ? e.message : 'The AI could not be reached.' });
    }
  };

  const check = (picked = choice) => {
    if (!d || phase !== 'answer') return;
    // Enter with nothing given yet is not an answer.
    if ((d.kind === 'build' && !typed.trim()) || ((d.kind === 'order' || d.kind === 'say') && !tiles.length) || (d.kind === 'spot' && picked === null)) return;
    let right = false;
    let close: FormCheck | null = null;
    switch (d.kind) {
      case 'own':
        if (typed.trim() && !own.checking) void checkOwn(d);
        return;
      case 'build':
        close = checkForm(typed, d.item, lang);
        right = close.verdict !== 'wrong';
        break;
      case 'order':
      case 'say':
        right = tilesMatch(
          tiles.map((i) => d.tiles[i]),
          d.answer,
          lang,
        );
        break;
      case 'spot':
        right = picked === d.wrongAt;
        break;
      case 'pairs':
        return;
      default:
        if (picked === null) return;
        right = picked === d.answer;
    }
    setNear(close?.verdict === 'close' ? close : null);
    setPraise(PRAISE[Math.floor(random() * PRAISE.length)]);
    setPhase(right ? 'right' : 'wrong');
    record(d, right);
    if (lightning) window.setTimeout(next, right ? 380 : 1300);
  };

  const next = () => {
    setDone((n) => n + 1);
    setChoice(null);
    setTyped('');
    setTiles([]);
    setNear(null);
    setOwn({ checking: false });
    setPhase('answer');
    startedAt.current = performance.now();
    setQueue((q) => {
      const rest = q.slice(1);
      if (!rest.length) window.setTimeout(finish, 0);
      return rest;
    });
  };

  const onChoose = (i: number) => {
    setChoice(i);
    // Lightning checks a choice as soon as it's made.
    if (lightning) check(i);
  };

  const onPairs = (mistakes: number) => {
    if (!d || d.kind !== 'pairs') return;
    setPraise(mistakes ? 'All matched' : PRAISE[Math.floor(random() * PRAISE.length)]);
    setPhase('right');
    record(d, mistakes === 0);
  };

  /** "Can't type now": this and the lesson's other typing exercises become gaps to fill. */
  const skipTyping = () => {
    setTyped('');
    setQueue((q) => q.map((x): Drill => (x.kind === 'build' ? itemDrill('pick', x.item, x.topic, lang, random, `${x.key}p`) : x)));
  };

  const start = () => {
    setSeeing(false);
    startedAt.current = performance.now();
  };

  const options = d && 'options' in d ? d.options.length : d?.kind === 'spot' ? d.tokens.length : 0;
  useHotkeys(
    seeing
      ? { enter: start, escape: onClose }
      : {
          enter: () => (phase === 'answer' ? check() : !lightning && next()),
          ...Object.fromEntries(Array.from({ length: Math.min(9, options) }, (_, i) => [String(i + 1), () => phase === 'answer' && (d?.kind === 'spot' ? setChoice(i) : onChoose(i))])),
          escape: onClose,
        },
    !rule,
  );

  const topic = d ? topics.get(d.topic) : undefined;
  const item = d && hasItem(d) ? d.item : null;

  if (seeing && intro) {
    return (
      <>
        <StudyBar title={title} progress={0} onClose={onClose} />
        <SeeIt topic={intro.topic} lang={lang} full={intro.full} onStart={start} />
      </>
    );
  }

  const ruleButton = topic && (
    <button type="button" onClick={() => setRule(topic)} className="mt-1.5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-accent-text underline decoration-accent/40 underline-offset-4">
      <BookOpen size={14} aria-hidden />
      See the rule
    </button>
  );

  const wrong = d && (
    <div>
      <p className="text-[13px] font-bold tracking-wide text-accent-text uppercase">{d.kind === 'own' ? 'Better' : 'Correct answer'}</p>
      {d.kind === 'own' && own.result ? (
        <>
          <p lang={lang} dir="auto" className="font-serif text-lg font-semibold">
            {own.result.corrected}
          </p>
          <p className="mt-1 text-[14px] leading-snug text-ink-soft">{own.result.explanation}</p>
        </>
      ) : item ? (
        <div className="mt-1">
          <SentenceLine example={{ s: item.s, en: '' }} lang={lang} />
        </div>
      ) : (
        <p lang={lang} className="font-serif text-xl font-semibold">
          {solutionOf(d, lang)}
        </p>
      )}
      {d.kind !== 'own' && topic?.why && (
        <p className="mt-1.5 text-[14px] leading-snug text-ink-soft">
          <Rich text={topic.why} lang={lang} />
        </p>
      )}
      {!lightning && ruleButton}
    </div>
  );

  const rightNote = near ? (
    <p className="text-sm text-ink-soft">
      Mind the accents:{' '}
      <span lang={lang} className="font-semibold text-ink">
        {near.expected}
      </span>
    </p>
  ) : d?.kind === 'own' && own.result ? (
    <p className="text-sm leading-snug text-ink-soft">{own.result.explanation}</p>
  ) : item ? (
    <p className="flex items-center gap-1.5 text-sm text-ink-soft">
      <span className="truncate">{item.en}</span>
      <SpeakButton lang={lang} text={item.s.replace(/[[\]]/g, '')} size={15} />
    </p>
  ) : null;

  return (
    <>
      <StudyBar wide title={title} progress={progress} onClose={onClose}>
        {lightning && endsAt ? <LightningClock endsAt={endsAt} onEnd={finish} onTick={() => feel.cue('tick')} /> : <ComboBadge combo={feel.combo} burst={feel.burst} onBurstEnd={feel.clearBurst} />}
        {!lightning && <IconButton icon={Settings2} label="Lesson settings" size="sm" onClick={onSetup} />}
      </StudyBar>
      <main className="mx-auto min-h-dvh max-w-6xl px-5" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 72px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 104px)' }}>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 max-w-3xl">
            <AnimatePresence mode="popLayout" initial={false}>
              {d && (
                <motion.section
                  key={d.key}
                  initial={{ opacity: 0, x: 28 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -28, transition: { duration: 0.15 } }}
                  transition={spring.soft}
                  aria-labelledby="drill-label"
                >
                  <p id="drill-label" className="mb-6 flex items-center gap-2 text-[13px] font-bold tracking-[0.12em] text-sage-text uppercase">
                    {lightning && <Zap size={14} aria-hidden />}
                    {d.key.includes('-r') ? 'One more try · ' : d.key.includes('-due-') ? 'Due again · ' : ''}
                    {labels?.[d.kind] ?? DRILL_LABEL[d.kind]}
                    {topics.size > 1 && topic && <span className="truncate font-semibold tracking-normal text-ink-faint normal-case">· {topic.title}</span>}
                  </p>
                  {d.kind === 'recognise' && <RecogniseView d={d} lang={lang} value={choice} onChange={onChoose} phase={phase} />}
                  {d.kind === 'hear' && <HearView d={d} lang={lang} value={choice} onChange={onChoose} phase={phase} />}
                  {d.kind === 'pick' && <PickView d={d} lang={lang} value={choice} onChange={onChoose} phase={phase} />}
                  {d.kind === 'table' && <TableGapView d={d} lang={lang} value={choice} onChange={onChoose} phase={phase} />}
                  {d.kind === 'build' && <BuildView d={d} lang={lang} value={typed} onChange={setTyped} phase={phase} onSubmit={() => (phase === 'answer' ? check() : next())} />}
                  {(d.kind === 'order' || d.kind === 'say') && <TilesView d={d} lang={lang} value={tiles} onChange={setTiles} phase={phase} />}
                  {d.kind === 'spot' && <SpotView d={d} lang={lang} value={choice} onChange={setChoice} phase={phase} />}
                  {d.kind === 'pairs' && <PairsView d={d} lang={lang} onDone={onPairs} random={random} />}
                  {d.kind === 'own' && topic && (
                    <OwnView d={d} topic={topic} lang={lang} value={typed} onChange={setTyped} phase={phase} checking={own.checking} error={own.error} onSubmit={() => (phase === 'answer' ? check() : next())} />
                  )}
                </motion.section>
              )}
            </AnimatePresence>
          </div>
          {topic && !lightning && <LessonSide topic={topic} lang={lang} step={step ?? null} onRule={() => setRule(topic)} />}
        </div>
      </main>
      <FeedbackBar
        wide
        phase={phase}
        ready={ready}
        onCheck={() => check()}
        onNext={next}
        praise={praise}
        rightNote={rightNote}
        wrong={wrong}
        hint={d?.kind === 'pairs' ? 'Tap one side, then its match' : lightning && d && 'options' in d ? 'Tap an answer' : undefined}
        aside={
          d?.kind === 'build' ? (
            <button type="button" onClick={skipTyping} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-soft underline decoration-line-strong underline-offset-4">
              <Keyboard size={15} aria-hidden />
              Can’t type this now
            </button>
          ) : d?.kind === 'spot' ? (
            <p className="text-sm text-ink-soft">One word is wrong. Tap it.</p>
          ) : d?.kind === 'own' ? (
            <button type="button" onClick={next} className="text-[14px] font-semibold text-ink-soft underline decoration-line-strong underline-offset-4">
              Skip this one
            </button>
          ) : undefined
        }
      />
      <RuleSheet topic={rule} lang={lang} onClose={() => setRule(null)} />
    </>
  );
}
