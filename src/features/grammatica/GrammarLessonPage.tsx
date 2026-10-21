import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { Coffee } from 'lucide-react';
import { useApp } from '@/app/context';
import { DRILL_KINDS, DRILL_NAME, planLightning, planPlacement, planReview, planTopicLesson, seededRandom } from '@/core/grammar/drills';
import type { Drill, DrillKind } from '@/core/grammar/drills';
import { STEPS } from '@/core/grammar/progress';
import type { Step } from '@/core/grammar/progress';
import { findTopic, topicsOf } from '@/core/grammar/types';
import type { Grammar, Topic } from '@/core/grammar/types';
import { recordSession } from '@/data/activity';
import { dueGrammarItems, finishGrammarLesson, grammarProgress, placeTopics } from '@/data/grammar';
import { aiKeys } from '@/data/plan';
import { buttonClasses } from '@/design/primitives';
import { spring } from '@/design/motion';
import { useSpeaker } from '@/features/speech/SpeakButton';
import { LessonEnd, LessonSetup, LIGHTNING_MS, recordBest, useLessonSettings } from '@/features/lesson/kit';
import type { EndAction, LessonResult } from '@/features/lesson/kit';
import { GrammarLesson } from './GrammarLesson';
import type { GrammarLessonOutcome, Missed } from './GrammarLesson';
import { Rich, SentenceLine, useGrammar } from './parts';

type Kind = 'step' | 'practice' | 'lightning' | 'review' | 'placement';

interface Plan {
  drills: Drill[];
  topics: Map<string, Topic>;
  title: string;
  /** The step this lesson can pass (a topic's current step), or null. */
  step: Step | null;
  random: () => number;
  /** Examples first: all of them for a first lesson, one for later steps. */
  intro?: { topic: Topic; full: boolean };
}

const SETUP_KINDS = DRILL_KINDS.map((id) => ({ id, label: DRILL_NAME[id] }));

/**
 * A grammar lesson, full screen: a topic's current step (`/cursus/grammatica/:topic/lesson`), its mixed
 * practice once learned (`?mode=practice`), a Lightning round (`?mode=lightning`), or the items due
 * across topics (`/cursus/grammatica/review`).
 */
export default function GrammarLessonPage({ review = false, placement = false }: { review?: boolean; placement?: boolean }) {
  const { topicId = '' } = useParams();
  const [search] = useSearchParams();
  const kind: Kind = placement ? 'placement' : search.get('mode') === 'lightning' ? 'lightning' : review ? 'review' : search.get('mode') === 'practice' ? 'practice' : 'step';
  const { language, settings } = useApp();
  const lang = language.id;
  const canWrite = Boolean(aiKeys(settings)[settings.llm.provider]?.trim() && settings.llm.model);
  const grammar = useGrammar(lang);
  const lessons = useLessonSettings();
  const { speaker } = useSpeaker(lang);
  const canHear = Boolean(speaker && speaker.kind !== 'none');
  const navigate = useNavigate();

  const [plan, setPlan] = useState<Plan | null | 'empty'>(null);
  const [end, setEnd] = useState<{ result: LessonResult; title: string; note: ReactNode; actions: EndAction[]; missed: Missed[] } | null>(null);
  const [round, setRound] = useState(0);
  const [setupOpen, setSetupOpen] = useState(false);
  const [endsAt, setEndsAt] = useState<number | undefined>();
  const active = useRef({ ms: 0, startedAt: Date.now(), n: 0 });

  const back = useCallback(() => navigate(review || placement || !topicId ? '/cursus/grammatica' : `/cursus/grammatica/${topicId}`, { replace: true }), [navigate, review, placement, topicId]);

  // Settings are read when the lesson is made; changing them mid-lesson applies to the next one.
  const settingsAtStart = useRef(lessons);
  settingsAtStart.current = plan === null ? lessons : settingsAtStart.current;

  useEffect(() => {
    if (!grammar) return;
    let alive = true;
    setPlan(null);
    setEnd(null);
    void (async () => {
      const made = await makePlan(grammar, kind, topicId, lang, canHear, canWrite, settingsAtStart.current, language.level);
      if (!alive) return;
      setPlan(made ?? 'empty');
      setEndsAt(kind === 'lightning' && made ? Date.now() + LIGHTNING_MS : undefined);
    })();
    return () => {
      alive = false;
    };
    // `canHear` settles after the voice is found; a lesson already made isn't remade for it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grammar, kind, topicId, lang, round]);

  useEffect(() => {
    const a = active.current;
    return () => {
      if (a.ms < 5000) return;
      void recordSession({ lang, type: 'grammar', refId: review ? undefined : topicId, startedAt: a.startedAt, endedAt: Date.now(), activeMs: a.ms, cards: a.n });
    };
  }, [lang, review, topicId]);

  const onActive = useCallback((ms: number) => {
    active.current.ms += ms;
  }, []);

  const onFinish = useCallback(
    async ({ result, byTopic, missed }: GrammarLessonOutcome) => {
      if (!grammar || !plan || plan === 'empty') return;
      active.current.n += result.answered;
      const again = { label: kind === 'lightning' ? 'Play again' : 'Another round', onClick: () => setRound((r) => r + 1) };
      if (kind === 'lightning') {
        const key = `${lang}:grammar${review ? '' : `:${topicId}`}`;
        const previousBest = await recordBest(lessons.best, key, result.score ?? 0);
        setEnd({ missed: [], result: { ...result, previousBest }, title: 'Time!', note: result.score ? `${result.score} right in a minute.` : 'The clock won this time. Another go?', actions: [again] });
        return;
      }
      if (kind === 'placement') {
        const known = [...byTopic].filter(([, s]) => s.n >= 2 && s.right === s.n).map(([t]) => t);
        await placeTopics(lang, known);
        setEnd({
          missed,
          result,
          title: 'Check done',
          note: known.length ? `${known.length === 1 ? 'One topic' : `${known.length} topics`} you already know ${known.length === 1 ? 'is' : 'are'} marked learned. The rest wait for you in order.` : 'Nothing marked yet: start from the first topic. You’ll move fast through what you know.',
          actions: [],
        });
        return;
      }
      if (kind === 'review') {
        for (const t of byTopic.keys()) await finishGrammarLesson(lang, t, null, 0);
        setEnd({ missed, result, title: 'Review done', note: 'Every item comes back when it’s due again.', actions: [] });
        return;
      }
      const topic = findTopic(grammar, topicId)!;
      // The step is passed on its own topic; due items from elsewhere don't count for it.
      const own = byTopic.get(topic.id);
      const score = own?.n ? own.right / own.n : result.accuracy;
      const { passed, step } = await finishGrammarLesson(lang, topic.id, plan.step, score);
      const pct = Math.round(score * 100);
      if (plan.step === null) {
        setEnd({ missed, result, title: 'Practice done', note: `${topic.title}: ${pct}% right first time.`, actions: [again] });
      } else if (passed && step >= 6) {
        setEnd({ missed, result, title: 'Topic learned', note: `${topic.title} is yours. Its items come back for review when they’re due.`, actions: [{ label: 'Practise it', onClick: () => navigate(`/cursus/grammatica/${topic.id}/lesson?mode=practice`, { replace: true }) }] });
      } else if (passed) {
        const s = STEPS[step - 1];
        setEnd({ missed, result, title: `Step ${plan.step} passed`, note: `Next: step ${step}, ${s.name.toLowerCase()} (${s.hint.toLowerCase()}).`, actions: [{ label: `On to step ${step}`, onClick: () => setRound((r) => r + 1) }] });
      } else {
        setEnd({ missed, result, title: 'Lesson done', note: `${pct}% right first time. At 80% you move on to the next step; another round?`, actions: [again] });
      }
    },
    [grammar, plan, kind, lang, review, topicId, lessons.best, navigate],
  );

  const setup = <LessonSetup open={setupOpen} onClose={() => setSetupOpen(false)} kinds={SETUP_KINDS} offKey="grammarOff" />;

  if (end) {
    return (
      <div className="grid min-h-dvh place-items-center py-10">
        <LessonEnd title={end.title} note={end.note} result={end.result} actions={end.actions} onDone={back}>
          {end.missed.length > 0 && grammar && <WentWrong missed={end.missed} grammar={grammar} lang={lang} />}
        </LessonEnd>
      </div>
    );
  }
  if (grammar === null || plan === 'empty') {
    return (
      <Empty onBack={back} title={grammar === null ? 'No grammar here yet' : review ? 'Nothing due' : 'Nothing to practise'}>
        {review ? 'Every grammar item is resting until its time comes. A lesson on a topic moves you on in the meantime.' : 'This topic has no exercises yet.'}
      </Empty>
    );
  }
  if (!grammar || !plan) return <div className="min-h-dvh" />;

  return (
    <>
      <GrammarLesson
        key={round}
        lang={lang}
        title={plan.title}
        drills={plan.drills}
        topics={plan.topics}
        random={plan.random}
        endsAt={endsAt}
        practice={kind === 'lightning' || kind === 'placement'}
        retries={kind !== 'placement'}
        intro={plan.intro}
        onFinish={(o) => void onFinish(o)}
        onClose={back}
        onActive={onActive}
        onSetup={() => setSetupOpen(true)}
      />
      {setup}
    </>
  );
}

async function makePlan(grammar: Grammar, kind: Kind, topicId: string, lang: string, canHear: boolean, canWrite: boolean, s: ReturnType<typeof useLessonSettings>, learnerLevel = 'A1'): Promise<Plan | null> {
  const random = seededRandom(Date.now() % 2 ** 31);
  const opts = { random, canHear, canWrite, typing: s.typing, off: new Set(s.grammarOff as DrillKind[]), size: s.length };
  const progress = await grammarProgress(lang);
  const stepOf = (t: Topic) => Math.min(6, Math.max(1, progress.get(t.id)?.step ?? 1));

  if (kind === 'placement') {
    const drills = planPlacement(grammar, lang, progress, learnerLevel, random);
    if (!drills.length) return null;
    return { drills, topics: new Map(topicsOf(grammar).map((t) => [t.id, t])), title: 'What do you know already?', step: null, random };
  }

  if (kind === 'review') {
    const due = (await dueGrammarItems(grammar)).slice(0, Math.max(s.length, 10) + 5);
    if (!due.length) return null;
    const drills = planReview(
      due.map(({ topic, item }) => ({ topic, item, passed: Math.max(1, stepOf(topic) - 1) })),
      lang,
      opts,
    );
    return { drills, topics: new Map(due.map((d) => [d.topic.id, d.topic])), title: 'Grammar review', step: null, random };
  }

  if (kind === 'lightning') {
    const one = topicId ? findTopic(grammar, topicId) : undefined;
    const started = topicsOf(grammar).filter((t) => (progress.get(t.id)?.lessons ?? 0) > 0 || stepOf(t) > 1);
    const pool = one ? [one] : started.length ? started : topicsOf(grammar).slice(0, 3);
    const drills = planLightning(pool, lang, random, 80);
    if (!drills.length) return null;
    return { drills, topics: new Map(pool.map((t) => [t.id, t])), title: one ? `Lightning · ${one.title}` : 'Lightning', step: null, random };
  }

  const topic = findTopic(grammar, topicId);
  if (!topic || !topic.items.length) return null;
  const current = stepOf(topic);
  const practice = kind === 'practice' || current >= 6;
  const step = practice ? 'mix' : (current as Step);
  // Up to three items due from other topics come along, in the steps those topics have passed.
  const due = (await dueGrammarItems(grammar))
    .filter((d) => d.topic.id !== topic.id)
    .slice(0, 3)
    .map(({ topic: t, item }) => ({ topic: t, item, passed: Math.max(1, stepOf(t) - 1) }));
  const drills = planTopicLesson(topic, lang, step, { ...opts, due });
  const title = practice ? `Practice · ${topic.title}` : `Step ${current} · ${STEPS[current - 1].name} · ${topic.title}`;
  const firstTime = (progress.get(topic.id)?.lessons ?? 0) === 0;
  return {
    drills,
    topics: new Map([[topic.id, topic], ...due.map((d): [string, Topic] => [d.topic.id, d.topic])]),
    title,
    step: practice ? null : (current as Step),
    random,
    intro: practice ? undefined : { topic, full: firstTime || current === 1 },
  };
}

function Empty({ title, children, onBack }: { title: string; children: ReactNode; onBack: () => void }) {
  return (
    <motion.div className="grid min-h-dvh place-items-center px-6 text-center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft}>
      <div className="max-w-sm">
        <span className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-sage-soft text-sage-text">
          <Coffee size={28} aria-hidden />
        </span>
        <h1 className="font-serif text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{children}</p>
        <button type="button" onClick={onBack} className={buttonClasses('primary', 'md') + ' mt-6'}>
          Back
        </button>
      </div>
    </motion.div>
  );
}


/** The lesson's mistakes, in the end: each sentence as it should be, with its reason and a speaker. */
function WentWrong({ missed, grammar, lang }: { missed: Missed[]; grammar: Grammar; lang: string }) {
  return (
    <section className="mt-8 w-full text-left">
      <h2 className="mb-2 text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">What went wrong</h2>
      <ul className="divide-y divide-line/60 rounded-2xl bg-surface">
        {missed.slice(0, 8).map(({ topic, item }) => {
          const t = findTopic(grammar, topic);
          return (
            <li key={item.s} className="px-4 py-3">
              <SentenceLine example={item} lang={lang} />
              {t && (
                <p className="mt-1 text-[13.5px] leading-snug text-ink-soft">
                  <Rich text={t.why} lang={lang} />
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
