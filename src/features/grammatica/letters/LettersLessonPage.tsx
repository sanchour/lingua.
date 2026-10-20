import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { Coffee } from 'lucide-react';
import { useApp } from '@/app/context';
import { planGroupLesson, planPractice } from '@/core/script/drills';
import type { ScriptDrill } from '@/core/script/drills';
import type { Script } from '@/core/script/types';
import { seededRandom } from '@/core/srs/ludus';
import { recordSession } from '@/data/activity';
import { dueLetters, finishLettersLesson, nextGroup, scriptItems, scriptProgress } from '@/data/script';
import { buttonClasses } from '@/design/primitives';
import { spring } from '@/design/motion';
import { useSpeaker } from '@/features/speech/SpeakButton';
import { LessonEnd } from '@/features/lesson/kit';
import type { EndAction, LessonResult } from '@/features/lesson/kit';
import { LettersLesson } from './LettersLesson';
import type { LettersOutcome } from './LettersLesson';
import { useScript } from './parts';

interface Plan {
  drills: ScriptDrill[];
  title: string;
  /** The group this lesson can mark learned, or null for practice and review. */
  group: string | null;
  random: () => number;
}

/**
 * An alphabet lesson, full screen: a group's lesson (`/grammatica/letters/:group/lesson`), its
 * practice once learned (`?mode=practice`), or the letters due (`/grammatica/letters/review`).
 */
export default function LettersLessonPage({ review = false }: { review?: boolean }) {
  const { groupId = '' } = useParams();
  const [search] = useSearchParams();
  const practice = review || search.get('mode') === 'practice';
  const { language } = useApp();
  const lang = language.id;
  const script = useScript(lang);
  const { speaker } = useSpeaker(lang);
  const canHear = Boolean(speaker && speaker.kind !== 'none');
  const navigate = useNavigate();
  const [plan, setPlan] = useState<Plan | null | 'empty'>(null);
  const [end, setEnd] = useState<{
    result: LessonResult;
    title: string;
    note: ReactNode;
    actions: EndAction[];
  } | null>(null);
  const [round, setRound] = useState(0);
  const active = useRef({ ms: 0, startedAt: Date.now(), n: 0 });

  const back = useCallback(() => navigate('/grammatica/letters', { replace: true }), [navigate]);

  useEffect(() => {
    if (!script) return;
    let alive = true;
    setPlan(null);
    setEnd(null);
    void makePlan(script, review, practice, groupId, canHear).then((p) => alive && setPlan(p ?? 'empty'));
    return () => {
      alive = false;
    };
    // `canHear` settles after the voice is found; a lesson already made isn't remade for it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script, review, practice, groupId, round]);

  useEffect(() => {
    const a = active.current;
    return () => {
      if (a.ms < 5000) return;
      void recordSession({
        lang,
        type: 'grammar',
        refId: `letters:${groupId || 'review'}`,
        startedAt: a.startedAt,
        endedAt: Date.now(),
        activeMs: a.ms,
        cards: a.n,
      });
    };
  }, [lang, groupId]);

  const onActive = useCallback((ms: number) => {
    active.current.ms += ms;
  }, []);

  const onFinish = useCallback(
    async ({ result }: LettersOutcome) => {
      if (!script || !plan || plan === 'empty') return;
      active.current.n += result.answered;
      const again = {
        label: 'Another round',
        onClick: () => setRound((r) => r + 1),
      };
      const pct = Math.round(result.accuracy * 100);
      if (!plan.group) {
        setEnd({
          result,
          title: review ? 'Review done' : 'Practice done',
          note: review ? 'Each letter comes back when it’s due again.' : `${pct}% right first time.`,
          actions: review ? [] : [again],
        });
        return;
      }
      const { passed } = await finishLettersLesson(lang, plan.group, result.accuracy);
      const group = script.groups.find((g) => g.id === plan.group)!;
      if (passed) {
        const next = nextGroup(script, await scriptProgress(lang));
        setEnd({
          result,
          title: next ? 'Letters learned' : 'Alphabet learned',
          note: next ? `${group.title}: yours. Next, ${next.title.toLowerCase()}.` : `That’s the whole of ${script.name}. The letters come back for review when they’re due.`,
          actions: next
            ? [
                {
                  label: `Next: ${next.title}`,
                  onClick: () =>
                    navigate(`/grammatica/letters/${next.id}/lesson`, {
                      replace: true,
                    }),
                },
              ]
            : [],
        });
      } else {
        setEnd({
          result,
          title: 'Lesson done',
          note: `${pct}% right first time. At 80% these letters count as learned; another round?`,
          actions: [again],
        });
      }
    },
    [script, plan, review, lang, navigate],
  );

  if (end) {
    return (
      <div className="grid min-h-dvh place-items-center py-10">
        <LessonEnd title={end.title} note={end.note} result={end.result} actions={end.actions} onDone={back} />
      </div>
    );
  }
  if (script === null || plan === 'empty') {
    return (
      <Empty onBack={back} title={script === null ? 'No alphabet to learn here' : review ? 'Nothing due' : 'Nothing to practise'}>
        {review ? 'Every letter is resting until its time comes. A new group moves you on in the meantime.' : 'This group has no exercises.'}
      </Empty>
    );
  }
  if (!script || !plan) return <div className="min-h-dvh" />;
  return (
    <LettersLesson
      key={round}
      script={script}
      title={plan.title}
      drills={plan.drills}
      random={plan.random}
      practice={review ? false : practice}
      onFinish={(o) => void onFinish(o)}
      onClose={back}
      onActive={onActive}
    />
  );
}

async function makePlan(script: Script, review: boolean, practice: boolean, groupId: string, canHear: boolean): Promise<Plan | null> {
  const random = seededRandom(Date.now() % 2147483647);
  if (review) {
    const due = dueLetters(script, await scriptItems(script.lang));
    if (!due.length) return null;
    return {
      drills: planPractice(script, due, { random, size: 12 }),
      title: 'Letters to review',
      group: null,
      random,
    };
  }
  const group = script.groups.find((g) => g.id === groupId);
  if (!group) return null;
  if (practice)
    return {
      drills: planPractice(script, group.letters, { random }),
      title: `${group.title}: practice`,
      group: null,
      random,
    };
  return {
    drills: planGroupLesson(script, group, { random, canHear }),
    title: group.title,
    group: group.id,
    random,
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
