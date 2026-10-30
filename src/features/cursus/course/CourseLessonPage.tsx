import { UiText } from '@/design/i18n/UiText';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { Flag } from 'lucide-react';
import { useApp } from '@/app/context';
import { DRILL_KINDS, DRILL_NAME, seededRandom } from '@/core/grammar/drills';
import type { DrillKind } from '@/core/grammar/drills';
import { COURSE_LABELS, planCourseLesson } from '@/core/course/lessons';
import type { CourseLessonPlan } from '@/core/course/lessons';
import { CHECK_PASS, LESSON_IDS, LESSONS, OUTLINE, UNIT_IDS } from '@/core/course/outline';
import type { LessonId, UnitId } from '@/core/course/outline';
import { recordSession } from '@/data/activity';
import { finishCourseLesson } from '@/data/course';
import { useSpeaker } from '@/features/speech/SpeakButton';
import { LessonEnd, LessonSetup, useLessonSettings } from '@/features/lesson/kit';
import type { EndAction, LessonResult } from '@/features/lesson/kit';
import { GrammarLesson } from '@/features/grammatica/GrammarLesson';
import type { GrammarLessonOutcome } from '@/features/grammatica/GrammarLesson';
import { CourseIntro } from './CourseIntro';
import { lessonPath, useCourse } from './parts';
import { SpeakLesson } from './SpeakLesson';
import { WriteLesson } from './WriteLesson';

const SETUP_KINDS = DRILL_KINDS.filter((k) => k !== 'table' && k !== 'own').map((id) => ({ id, label: DRILL_NAME[id] }));

const isUnit = (u: string | undefined): u is UnitId => (UNIT_IDS as readonly string[]).includes(u ?? '');
const isLesson = (l: string | undefined): l is LessonId => (LESSON_IDS as readonly string[]).includes(l ?? '');

/** One lesson of a unit, full screen (`/cursus/course/:unit/:lesson`). */
export default function CourseLessonPage() {
  const params = useParams();
  if (!isUnit(params.unit) || !isLesson(params.lesson)) return <Navigate to="/cursus/course" replace />;
  return <Lesson key={`${params.unit}/${params.lesson}`} unitId={params.unit} lesson={params.lesson} />;
}

function Lesson({ unitId, lesson }: { unitId: UnitId; lesson: LessonId }) {
  const { language } = useApp();
  const lang = language.id;
  const loaded = useCourse(lang);
  const settings = useLessonSettings();
  const { speaker } = useSpeaker(lang);
  const navigate = useNavigate();
  const unit = OUTLINE.find((u) => u.id === unitId)!;
  const content = loaded?.course.units[unitId];
  const lessons = useMemo(() => (loaded ? loaded.lessonsOf(unitId) : []), [loaded, unitId]);

  const [round, setRound] = useState(0);
  const [plan, setPlan] = useState<CourseLessonPlan | null>(null);
  const [intro, setIntro] = useState(lesson === 'words' || lesson === 'phrases');
  const [end, setEnd] = useState<{ result: LessonResult; title: string; note: ReactNode; actions: EndAction[]; badge?: ReactNode; tiles?: Array<[string, string]> } | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const active = useRef({ ms: 0, startedAt: Date.now(), n: 0 });

  const back = useCallback(() => navigate('/cursus/course', { replace: true }), [navigate]);

  // The exercises are made once the course is loaded (and again for another round).
  useEffect(() => {
    if (!loaded || !content) return;
    const canHear = Boolean(speaker && speaker.kind !== 'none');
    const opts = { random: seededRandom(Date.now() % 2 ** 31), canHear, typing: settings.typing, off: new Set(settings.grammarOff as DrillKind[]), size: Math.max(10, settings.length) };
    setPlan(planCourseLesson(lesson, unit, content, loaded.grammar, lang, opts));
    setEnd(null);
    // A lesson already made isn't remade when the voice settles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, content, lesson, round]);

  useEffect(() => {
    const a = active.current;
    return () => {
      if (a.ms < 5000) return;
      void recordSession({ lang, type: lesson === 'write' ? 'write' : 'ludus', refId: `course:${unitId}`, startedAt: a.startedAt, endedAt: Date.now(), activeMs: a.ms, cards: a.n });
    };
  }, [lang, lesson, unitId]);

  const onActive = useCallback((ms: number) => {
    active.current.ms += ms;
  }, []);

  /** The lesson's end: saved, and the next lesson offered. */
  const finish = useCallback(
    async (score: number, result: LessonResult, tiles?: Array<[string, string]>) => {
      active.current.n += result.answered;
      const { passed, unitDone } = await finishCourseLesson(lang, unitId, lesson, score, lessons);
      const following = lessons[lessons.indexOf(lesson) + 1];
      const nextUnit = OUTLINE[OUTLINE.indexOf(unit) + 1];
      const go = (u: UnitId, l: LessonId) => navigate(lessonPath(u, l), { replace: true });
      // Writing and speaking aren't rounds of exercises: no "another round", their own numbers.
      const again = tiles ? [] : [{ label: 'Another round', onClick: () => setRound((r) => r + 1) }];
      if (lesson === 'check' && !passed) {
        setEnd({ result, title: 'Nearly there', note: `${Math.round(score * 100)}% right first time; the unit is yours at ${Math.round(CHECK_PASS * 100)}%. The lessons go over what you missed.`, actions: [...again, { label: 'Back to the words', onClick: () => go(unitId, 'words') }] });
        return;
      }
      if (lesson === 'check' || unitDone) {
        setEnd({
          result,
          tiles,
          badge: <Flag size={34} aria-hidden />,
          title: 'Unit done',
          note: (
            <>
              <p><UiText source={'You can now:'} /></p>
              <ul className="mt-1 space-y-0.5">
                {unit.canDo.map((c) => (
                  <li key={c}>✓ {c}</li>
                ))}
              </ul>
            </>
          ),
          actions: nextUnit ? [{ label: `Next unit: ${nextUnit.title}`, onClick: () => go(nextUnit.id, 'words') }] : [],
        });
        return;
      }
      setEnd({
        result,
        tiles,
        title: `${LESSONS[lesson].title} done`,
        note: following ? `Next: ${LESSONS[following].title.toLowerCase()}, ${LESSONS[following].aim.toLowerCase()}.` : undefined,
        actions: following ? [{ label: `On to ${LESSONS[following].title.toLowerCase()}`, onClick: () => go(unitId, following) }, ...again] : again,
      });
    },
    [lang, unitId, lesson, lessons, unit, navigate],
  );

  const onDrillsDone = useCallback(({ result }: GrammarLessonOutcome) => void finish(result.accuracy, result), [finish]);

  if (loaded === null) return <Navigate to="/cursus/course" replace />;
  if (end) {
    return (
      <div className="grid min-h-dvh place-items-center py-10">
        <LessonEnd title={end.title} note={end.note} result={end.result} actions={end.actions} onDone={back} badge={end.badge} tiles={end.tiles} />
      </div>
    );
  }
  if (!loaded || !content) return <div className="min-h-dvh" />;

  if (lesson === 'speak') return <SpeakLesson key={round} unit={unit} content={content} lang={lang} onClose={back} onActive={onActive} onFinish={(score, result, tiles) => void finish(score, result, tiles)} />;
  if (lesson === 'write') return <WriteLesson unit={unit} content={content} lang={lang} onClose={back} onActive={onActive} onFinish={(score, result, tiles) => void finish(score, result, tiles)} />;
  if (lesson === 'grammar' && !plan) return <Navigate to={lessonPath(unitId, 'speak')} replace />;
  if (!plan) return <div className="min-h-dvh" />;
  if (intro && (lesson === 'words' || lesson === 'phrases')) return <CourseIntro part={lesson} unit={unit} content={content} lang={lang} onStart={() => setIntro(false)} />;

  return (
    <>
      <GrammarLesson
        key={round}
        lang={lang}
        title={`${unit.short} · ${LESSONS[lesson].title}`}
        drills={plan.drills}
        topics={plan.topics}
        random={seededRandom(round + 1)}
        practice
        retries={lesson !== 'check'}
        intro={lesson === 'grammar' && plan.intro ? { topic: plan.intro, full: true } : undefined}
        onFinish={onDrillsDone}
        onClose={back}
        onActive={onActive}
        onSetup={() => setSetupOpen(true)}
        labels={lesson === 'words' ? COURSE_LABELS.words : lesson === 'grammar' ? undefined : COURSE_LABELS.phrases}
      />
      <LessonSetup open={setupOpen} onClose={() => setSetupOpen(false)} kinds={SETUP_KINDS} offKey="grammarOff" />
    </>
  );
}

