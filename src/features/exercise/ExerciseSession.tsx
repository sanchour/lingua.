// A run of exercises of any kind the engine has (6-4b): one screen for matching, dragging, typing, free sentences and form
// changes. How it asks is the learner's: hints, "how sure are you?", answers only at the end, another example after a miss.
import { HeardDiff } from './HeardDiff';
import { ListenBar } from './ListenBar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Settings2 } from 'lucide-react';
import type { DragBody, ExerciseSpec, MatchBody, SessionOptions } from '@/core/contracts/exercise';
import type { Outcome } from '@/core/contracts/learner';
import { judge, solutionOf } from '@/core/exercise';
import type { Judgement } from '@/core/exercise';
import { seededRandom } from '@/core/srs/ludus';
import { recordEvidence } from '@/data/learner';
import { addBookmark } from '@/data/media';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { Button, IconButton, Popover, ToggleRow } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { judgeFree } from '@/services/llm/exerciseJudge';
import { FeedbackBar, LessonEnd, PRAISE, useLessonFeel } from '@/features/lesson/kit';
import type { Phase } from '@/features/lesson/kit';
import { StudyBar } from '@/features/thesaurus/study/StudyBar';
import { DragView } from './DragView';
import { MatchView } from './MatchView';
import { isFreeText, TypedView } from './TypedView';
import { TransformView } from './TransformView';
import type { TransformSpec } from '@/core/exercise';

export const DEFAULT_OPTIONS: SessionOptions = { hints: true, confidence: false, delayedFeedback: false, retryWithNewExample: true };

interface Taken {
  spec: ExerciseSpec;
  given: string;
  outcome: Outcome;
  solution: string;
  first: boolean;
}

const isRight = (o: Outcome) => o === 'right' || o === 'close';
const isMatch = (s: ExerciseSpec) => s.kind.startsWith('match-');

export function ExerciseSession({ title, lang, specs, onClose }: { title: string; lang: string; specs: ExerciseSpec[]; onClose: () => void }) {
  const feel = useLessonFeel();
  const random = useMemo(() => seededRandom(Date.now() % 2 ** 31), []);
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [run, setRun] = useState(0);
  const [queue, setQueue] = useState(specs);
  const [phase, setPhase] = useState<Phase>('answer');
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<number[]>([]);
  const [hints, setHints] = useState(0);
  const [sure, setSure] = useState<1 | 2 | 3 | undefined>();
  const [message, setMessage] = useState<string | null>(null);
  const [rating, setRating] = useState(false);
  const [judging, setJudging] = useState(false);
  const [asking, setAsking] = useState(false);
  const [taken, setTaken] = useState<Taken[]>([]);
  const [stage, setStage] = useState<'run' | 'review' | 'end'>('run');
  const [praise, setPraise] = useState(PRAISE[0]);
  const started = useRef(performance.now());
  const total = useRef({ ms: 0 });
  const retried = useRef(new Set<string>());
  // An answer is taken once per exercise: a second Enter before the next one has been drawn would be graded against this one.
  const answered = useRef<string | null>(null);

  const spec = queue[0];
  const tiles = spec?.kind === 'drag-drop' ? (spec.body as DragBody).tiles : [];
  // The speed of what is heard steps up with every right answer in a row (from 0.8×, up to 1.5×) and drops back after a miss.
  const listenRate = (() => {
    let streak = 0;
    for (const t of taken.filter((x) => x.spec.listen)) streak = isRight(t.outcome) ? streak + 1 : 0;
    return Math.min(1.5, Math.round((0.8 + 0.1 * streak) * 10) / 10);
  })();
  const progress = taken.length / Math.max(1, taken.length + queue.length);

  /** A fresh page for the next exercise. */
  const clear = useCallback(() => {
    setText('');
    setPicked([]);
    setHints(0);
    setSure(undefined);
    setMessage(null);
    setRating(false);
    setPhase('answer');
    started.current = performance.now();
  }, []);

  const next = useCallback(() => {
    clear();
    setQueue((q) => q.slice(1));
  }, [clear]);

  // When the last one is answered, on to the end (or to the answers, if they were kept for the end).
  useEffect(() => {
    if (stage === 'run' && queue.length === 0 && taken.length > 0) setStage(options.delayedFeedback ? 'review' : 'end');
  }, [queue, stage, taken.length, options.delayedFeedback]);

  /** Takes the answer: records it for the learner's record, offers another example after a miss, and shows (or saves for the end) how it went. */
  const settle = (outcome: Outcome, given: string, note?: string) => {
    if (!spec || answered.current === spec.key) return;
    answered.current = spec.key;
    const ms = Math.min(120_000, performance.now() - started.current);
    total.current.ms += ms;
    const right = isRight(outcome);
    const solution = solutionOf(spec);
    const first = !retried.current.has(spec.key);
    setTaken((t) => [...t, { spec, given, outcome, solution, first }]);
    feel.answered(right);
    // A line that was not made out is marked in the recording it comes from, to be played again.
    if (!right && spec.listen?.clip) void addBookmark(spec.listen.clip.mediaId, spec.listen.clip.startMs, { hard: true });
    void recordEvidence({
      lang,
      at: Date.now(),
      skill: spec.trains.skill,
      room: spec.trains.skill === 'grammar' ? 'grammatica' : spec.trains.skill === 'listening' ? 'sonus' : 'thesaurus',
      item: spec.trains.item,
      outcome,
      assisted: hints > 0,
      confidence: sure,
      category: !right && spec.trains.skill === 'grammar' ? 'grammar' : undefined,
      given: !right ? given.slice(0, 200) : undefined,
      expected: !right ? solution.slice(0, 200) : undefined,
      kind: spec.kind,
      contextId: 'practice',
    }).catch(() => undefined);
    if (!right && options.retryWithNewExample && spec.retry && first) {
      const again = { ...spec.retry, key: `${spec.retry.key}~r`, retry: undefined };
      retried.current.add(again.key);
      setQueue((q) => [...q, again]);
    }
    if (options.delayedFeedback) return next();
    setMessage(note ?? null);
    setPraise(PRAISE[Math.floor(random() * PRAISE.length)]);
    setPhase(right ? 'right' : 'wrong');
  };

  const fromJudgement = (j: Judgement, given: string) => settle(j.outcome === 'ungraded' ? 'wrong' : j.outcome, given, j.message);

  const check = async () => {
    if (!spec || phase !== 'answer' || isMatch(spec) || rating || judging || answered.current === spec.key) return;
    if (spec.kind === 'drag-drop') {
      if (picked.length !== tiles.length) return;
      return fromJudgement(judge(spec.check, picked.map((i) => tiles[i]), lang), picked.map((i) => tiles[i]).join(' '));
    }
    if (!text.trim()) return;
    if (spec.check.rule === 'ai') {
      setJudging(true);
      try {
        const j = await judgeFree(spec, text);
        return settle(j.verdict === 'good' ? 'right' : j.verdict === 'partly' ? 'close' : 'wrong', text, j.explanation);
      } catch {
        // No key, no quota, no network: the learner rates their own, as without Max.
        setMessage('Max couldn’t be reached, so you rate this one yourself.');
        return setRating(true);
      } finally {
        setJudging(false);
      }
    }
    if (spec.check.rule === 'self') return setRating(true);
    fromJudgement(judge(spec.check, text, lang), text);
  };

  const onMatched = (mistakes: number) => settle(mistakes === 0 ? 'right' : mistakes <= 2 ? 'close' : 'wrong', `${mistakes} slips`, mistakes ? `${mistakes} ${mistakes === 1 ? 'slip' : 'slips'}` : undefined);

  useHotkeys({ enter: () => (phase === 'answer' ? void check() : next()), escape: onClose }, stage === 'run' && !rating && !asking);

  const restart = () => {
    clear();
    answered.current = null;
    setQueue(specs);
    setTaken([]);
    setStage('run');
    setRun((r) => r + 1);
    retried.current.clear();
    total.current.ms = 0;
  };

  if (stage !== 'run' || !spec) {
    const firsts = taken.filter((t) => t.first);
    const result = { answered: firsts.length, accuracy: firsts.length ? firsts.filter((t) => isRight(t.outcome)).length / firsts.length : 1, ms: total.current.ms, bestCombo: feel.best };
    if (stage === 'review')
      return (
        <main className="mx-auto min-h-dvh max-w-2xl px-5 py-16">
          <h1 className="font-serif text-3xl font-semibold">How it went</h1>
          <p className="mt-1 text-ink-soft">Your answers, now that they are all in.</p>
          <ul className="mt-6 space-y-3">
            {taken.map((t, i) => (
              <li key={i} className={cx('rounded-2xl border px-4 py-3', isRight(t.outcome) ? 'border-sage/40 bg-sage-soft' : 'border-accent/40 bg-accent-soft')}>
                <p className="text-[12.5px] font-semibold text-ink-soft">{t.spec.instruction}</p>
                <p lang={lang} className="mt-1 font-serif text-[18px]">{t.given || '—'}</p>
                {!isRight(t.outcome) && <p lang={lang} className="mt-1 text-[14px]">Answer: <span className="font-semibold">{t.solution || '—'}</span></p>}
              </li>
            ))}
          </ul>
          <Button className="mt-8" size="lg" onClick={() => setStage('end')}>Continue</Button>
        </main>
      );
    return <LessonEnd title={title} result={result} actions={[{ label: 'Again', onClick: restart }]} onDone={onClose} />;
  }

  const free = !isMatch(spec) && spec.kind !== 'drag-drop' && spec.kind !== 'transform' && isFreeText(spec);
  const model = spec.check.rule === 'self' || spec.check.rule === 'ai' ? spec.check.modelAnswer : '';
  const ready = isMatch(spec) ? false : spec.kind === 'drag-drop' ? picked.length === tiles.length : Boolean(text.trim()) && !judging;
  const why = spec.feedback?.why;

  return (
    <>
      <StudyBar title={title} progress={progress} onClose={onClose}>
        <Popover label="How it asks" placement="bottom-end" className="w-80" onOpenChange={setAsking} trigger={(props) => <IconButton {...props} icon={Settings2} label="How it asks" size="sm" />}>
          <div className="space-y-1 p-2">
            <ToggleRow title="Hints" description="A tap reveals a hint, step by step." checked={options.hints} onChange={(v) => setOptions({ ...options, hints: v })} />
            <ToggleRow title="How sure are you?" description="Rate each answer: guessed, unsure, sure." checked={options.confidence} onChange={(v) => setOptions({ ...options, confidence: v })} />
            <ToggleRow title="Answers at the end" description="No verdict after each one, like an exam." checked={options.delayedFeedback} onChange={(v) => setOptions({ ...options, delayedFeedback: v })} />
            <ToggleRow title="Another example after a miss" description="A missed one comes back once, with a different example." checked={options.retryWithNewExample} onChange={(v) => setOptions({ ...options, retryWithNewExample: v })} />
          </div>
        </Popover>
      </StudyBar>
      <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 72px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 112px)' }}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.section key={`${run}-${spec.key}`} initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28, transition: { duration: 0.15 } }} transition={spring.soft}>
            <p className="mb-6 text-[13px] font-bold tracking-[0.12em] text-sage-text uppercase">{spec.key.endsWith('~r') ? 'Another example · ' : ''}{spec.instruction}</p>
            {spec.listen && <ListenBar listen={spec.listen} lang={lang} rate={listenRate} />}
            {isMatch(spec) && <MatchView body={spec.body as MatchBody} lang={lang} onDone={onMatched} random={random} />}
            {spec.kind === 'drag-drop' && <DragView prompt={(spec.body as DragBody).prompt} tiles={tiles} lang={lang} value={picked} onChange={setPicked} phase={phase} />}
            {spec.kind === 'transform' && <TransformView spec={spec as TransformSpec} lang={lang} value={text} onChange={setText} phase={phase} onSubmit={() => (phase === 'answer' ? void check() : next())} onHint={setHints} />}
            {!isMatch(spec) && spec.kind !== 'drag-drop' && spec.kind !== 'transform' && <TypedView spec={options.hints ? spec : { ...spec, hints: undefined }} lang={lang} value={text} onChange={setText} phase={phase} onSubmit={() => (phase === 'answer' ? void check() : next())} onHint={setHints} />}
            {options.confidence && phase === 'answer' && !isMatch(spec) && (
              <div className="mt-6 flex items-center justify-center gap-2" role="group" aria-label="How sure are you?">
                <span className="text-[13px] text-ink-faint">How sure?</span>
                {([['Guessing', 1], ['Unsure', 2], ['Sure', 3]] as const).map(([label, v]) => (
                  <button key={v} type="button" aria-pressed={sure === v} onClick={() => setSure(sure === v ? undefined : v)} className={cx('h-8 rounded-full px-3.5 text-[13px] font-semibold transition-colors', sure === v ? 'bg-ink text-bg' : 'bg-surface text-ink-soft hover:bg-sunken')}>
                    {label}
                  </button>
                ))}
              </div>
            )}
            {rating && (
              <div className="mt-6 rounded-2xl bg-surface p-4 text-center">
                <p className="text-[12.5px] font-semibold text-ink-faint">A model answer{message ? ` · ${message}` : ''}</p>
                <p lang={lang} className="mt-1 font-serif text-[19px] font-semibold">{model}</p>
                <p className="mt-3 text-[13.5px] text-ink-soft">Was yours as good?</p>
                <div className="mt-2 flex justify-center gap-2">
                  {([['Yes', 'right'], ['Nearly', 'close'], ['Not yet', 'wrong']] as const).map(([label, o]) => (
                    <Button key={o} variant="secondary" size="sm" onClick={() => settle(o, text)}>{label}</Button>
                  ))}
                </div>
              </div>
            )}
          </motion.section>
        </AnimatePresence>
      </main>
      <FeedbackBar
        phase={phase}
        ready={ready}
        onCheck={() => void check()}
        onNext={next}
        praise={praise}
        checkLabel={judging ? 'Checking…' : free && spec.check.rule === 'self' ? 'Show the answer' : 'Check'}
        hint={isMatch(spec) ? 'Tap a word, then what goes with it' : rating ? 'Rate your answer above' : undefined}
        rightNote={message || why ? <p className="text-sm text-ink-soft">{message ?? why}</p> : null}
        wrong={
          <div>
            <p className="text-[13px] font-bold tracking-wide text-accent-text uppercase">Answer</p>
            <p lang={lang} className="font-serif text-xl font-semibold">{solutionOf(spec) || model}</p>
            {spec.kind === 'listen-type' && taken.at(-1)?.spec.key === spec.key && <HeardDiff given={taken.at(-1)!.given} said={solutionOf(spec)} lang={lang} />}
            {(message || why) && <p className="mt-1 text-[14px] leading-snug text-ink-soft">{message ? `${message} ` : ''}{why}</p>}
          </div>
        }
      />
    </>
  );
}
