import { UiText, useUi } from '@/design/i18n/UiText';
// An alphabet lesson (Lingua 3.0-8, part 5): meet each letter, ask for it both ways, match pairs,
// read real words, pick Arabic's joined shapes, trace and write. Each letter is graded into its FSRS
// item when the lesson ends (no mistake Good, one Hard, missed again on the retry Again).
import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { gradedLetter, retryScriptDrill, SCRIPT_DRILL_LABEL } from '@/core/script/drills';
import type { ScriptDrill } from '@/core/script/drills';
import { joinedForm, POSITION_LABEL } from '@/core/script/types';
import type { Letter, Script } from '@/core/script/types';
import { gradeFor } from '@/core/srs/ludus';
import { answerLetter } from '@/data/script';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { useLayout } from '@/design/hooks/useLayout';
import { spring } from '@/design/motion';
import { Kbd } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { ComboBadge, FeedbackBar, PlayBig, PRAISE, useLessonFeel } from '@/features/lesson/kit';
import type { LessonResult, Phase } from '@/features/lesson/kit';
import { SpeakButton } from '@/features/speech/SpeakButton';
import { StudyBar } from '@/features/thesaurus/study/StudyBar';
import { PairsView } from '../drillViews';
import { WritePad } from './WritePad';
import type { WritePadHandle } from './WritePad';

interface Track {
  letter: Letter;
  mistakes: number;
  failed: boolean;
  ms: number;
}

export interface LettersOutcome {
  result: LessonResult;
}

interface Props {
  script: Script;
  title: string;
  drills: ScriptDrill[];
  random: () => number;
  /** Logged without moving any schedule. */
  practice?: boolean;
  onFinish: (o: LettersOutcome) => void;
  onClose: () => void;
  onActive: (ms: number) => void;
}

/** The letter as written in a lesson: both cases where there are two. */
export const shown = (l: Letter) => (l.lower && l.lower !== l.glyph ? `${l.glyph} ${l.lower}` : l.glyph);
/** A letter's name, when it is more than the letter itself (Russian а is called а). */
export const named = (l: Letter) => (l.name && l.name !== l.glyph && l.name !== l.lower ? l.name : undefined);
/** The form drawn on the pad: the small letter where there is one. */
const drawnForm = (l: Letter) => l.lower ?? l.glyph;

export function LettersLesson({ script, title, drills, random, practice, onFinish, onClose, onActive }: Props) {
  const translateUi = useUi();
  const lang = script.lang;
  const dir = script.rtl ? 'rtl' : undefined;
  const feel = useLessonFeel();
  const [queue, setQueue] = useState(drills);
  const [done, setDone] = useState(0);
  const [phase, setPhase] = useState<Phase>('answer');
  const [choice, setChoice] = useState<number | null>(null);
  const [inked, setInked] = useState(false);
  const [praise, setPraise] = useState(PRAISE[0]);
  // One handle per exercise: the pad sliding out unmounts after the next one mounts.
  const pads = useRef(new Map<string, WritePadHandle>());
  const tracks = useRef(new Map<string, Track>());
  const stats = useRef({ first: 0, firstRight: 0, ms: 0 });
  const startedAt = useRef(performance.now());
  const retries = useRef(0);
  const finished = useRef(false);

  const d = queue[0];
  const progress = done / Math.max(1, done + queue.length);

  const finish = useCallback(async () => {
    if (finished.current) return;
    finished.current = true;
    // Grade each letter met in a graded exercise, before the end screen reads the schedule.
    await Promise.all([...tracks.current.values()].map((t) => answerLetter(lang, t.letter.id, gradeFor(t.mistakes, t.failed), t.ms, practice)));
    const s = stats.current;
    onFinish({
      result: {
        answered: s.first,
        accuracy: s.first ? s.firstRight / s.first : 1,
        ms: s.ms,
        bestCombo: feel.best,
      },
    });
  }, [lang, practice, onFinish, feel.best]);

  const record = (drill: ScriptDrill, right: boolean) => {
    const ms = Math.min(60_000, performance.now() - startedAt.current);
    onActive(ms);
    stats.current.ms += ms;
    const retry = drill.key.includes('-r');
    if (!retry) {
      stats.current.first++;
      if (right) stats.current.firstRight++;
    }
    feel.answered(right);
    const letter = gradedLetter(drill);
    if (letter) {
      const t = tracks.current.get(letter.id) ?? {
        letter,
        mistakes: 0,
        failed: false,
        ms: 0,
      };
      t.ms += ms;
      if (!right) t.mistakes++;
      if (!right && retry) t.failed = true;
      tracks.current.set(letter.id, t);
    }
    if (!right && !retry && drill.kind !== 'pairs') {
      retries.current++;
      setQueue((q) => [...q, retryScriptDrill(drill, random, retries.current)]);
    }
  };

  const next = () => {
    setDone((n) => n + 1);
    setChoice(null);
    setInked(false);
    setPhase('answer');
    startedAt.current = performance.now();
    setQueue((q) => {
      const rest = q.slice(1);
      if (!rest.length) window.setTimeout(() => void finish(), 0);
      return rest;
    });
  };

  const check = (picked = choice) => {
    if (!d || phase !== 'answer') return;
    if (d.kind === 'meet') return next();
    let right = false;
    if (d.kind === 'trace' || d.kind === 'write') {
      const score = pads.current.get(d.key)?.check();
      if (!score) return;
      right = score.pass;
    } else if ('options' in d) {
      if (picked === null) return;
      right = picked === d.answer;
    } else return;
    setPraise(PRAISE[Math.floor(random() * PRAISE.length)]);
    setPhase(right ? 'right' : 'wrong');
    record(d, right);
  };

  const onPairs = (mistakes: number) => {
    if (!d || d.kind !== 'pairs') return;
    setPraise(mistakes ? 'All matched' : PRAISE[Math.floor(random() * PRAISE.length)]);
    setPhase('right');
    record(d, mistakes === 0);
  };

  const options = d && 'options' in d ? d.options.length : 0;
  useHotkeys({
    enter: () => (phase === 'answer' ? check() : next()),
    ...Object.fromEntries(Array.from({ length: options }, (_, i) => [String(i + 1), () => phase === 'answer' && setChoice(i)])),
    escape: onClose,
  });

  // A drawing exercise left empty can't be checked; a choice can't be checked before it's made.
  const ready = Boolean(d) && (d.kind === 'meet' || ((d.kind === 'trace' || d.kind === 'write') && inked) || ('options' in d && choice !== null));

  const solution = !d ? '' : d.kind === 'trace' || d.kind === 'write' ? drawnForm(d.letter) : 'options' in d ? d.options[d.answer] : '';
  const letter = d && 'letter' in d ? d.letter : null;
  const word = d && 'word' in d ? d.word : null;
  const wrong = d && (
    <div>
      <p className="text-[13px] font-bold tracking-wide text-accent-text uppercase">{d.kind === 'trace' || d.kind === 'write' ? translateUi('Follow the shape') : translateUi('Correct answer')}</p>
      <p lang={d.kind === 'sound' ? undefined : lang} dir="auto" className="font-serif text-xl font-semibold">
        {solution}
      </p>
      {letter && d.kind !== 'trace' && d.kind !== 'write' && (
        <p className="mt-0.5 text-[14px] leading-snug text-ink-soft">
          <span lang={lang}>{shown(letter)}</span> · {letter.sound}
        </p>
      )}
      {word && <p className="mt-0.5 text-[14px] text-ink-soft">{word.en}</p>}
    </div>
  );
  const rightNote = word ? (
    <p className="flex items-center gap-1.5 text-sm text-ink-soft">
      <span lang={lang} className="font-semibold text-ink">
        {word.w}
      </span>
      <span className="truncate">
        {word.latin} · {word.en}
      </span>
      <SpeakButton lang={lang} text={word.w} size={15} />
    </p>
  ) : letter && d?.kind !== 'meet' ? (
    <p className="truncate text-sm text-ink-soft">
      <span lang={lang} className="font-semibold text-ink">
        {shown(letter)}
      </span>{' '}
      · {letter.latin}
    </p>
  ) : null;

  return (
    <>
      <StudyBar title={title} progress={progress} onClose={onClose}>
        <ComboBadge combo={feel.combo} burst={feel.burst} onBurstEnd={feel.clearBurst} />
      </StudyBar>
      <main
        className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 72px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 104px)',
        }}
      >
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
              <p id="drill-label" className="mb-6 text-[13px] font-bold tracking-[0.12em] text-sage-text uppercase">
                {d.key.includes('-r') ? translateUi('One more try · ') : ''}
                {SCRIPT_DRILL_LABEL[d.kind]}
              </p>
              {d.kind === 'meet' && <MeetView letter={d.letter} script={script} />}
              {d.kind === 'sound' && (
                <Asked big={shown(d.letter)} lang={lang} dir={dir}>
                  <TextChoices options={d.options} value={choice} onChange={setChoice} phase={phase} answer={d.answer} />
                </Asked>
              )}
              {d.kind === 'letter' && (
                <Asked big={d.letter.latin} sub={d.letter.sound}>
                  <GlyphChoices options={d.options} value={choice} onChange={setChoice} phase={phase} answer={d.answer} lang={lang} dir={dir} />
                </Asked>
              )}
              {d.kind === 'read' && (
                <Asked big={lang === 'zh' ? d.word.latin : d.word.w} lang={lang === 'zh' ? undefined : lang} dir={dir} sub={lang === 'zh' ? 'Which word is this?' : 'How does it read?'}>
                  <TextChoices options={d.options} value={choice} onChange={setChoice} phase={phase} answer={d.answer} lang={lang === 'zh' ? lang : undefined} />
                </Asked>
              )}
              {d.kind === 'hear' && (
                <div className="space-y-6">
                  <PlayBig lang={lang} text={d.word.w} playKey={d.key} slower={false} />
                  {lang === 'zh' ? (
                    <TextChoices options={d.options} value={choice} onChange={setChoice} phase={phase} answer={d.answer} />
                  ) : (
                    <GlyphChoices options={d.options} value={choice} onChange={setChoice} phase={phase} answer={d.answer} lang={lang} dir={dir} small />
                  )}
                </div>
              )}
              {d.kind === 'form' && (
                <Asked big={d.letter.glyph} lang={lang} dir={dir} sub={`${d.letter.latin}, ${POSITION_LABEL[d.position]}`}>
                  <GlyphChoices options={d.options} value={choice} onChange={setChoice} phase={phase} answer={d.answer} lang={lang} dir={dir} />
                </Asked>
              )}
              {d.kind === 'pairs' && <PairsView d={{ ...d, topic: '', item: undefined } as never} lang={lang} onDone={onPairs} random={random} />}
              {(d.kind === 'trace' || d.kind === 'write') && (
                <div className="space-y-4">
                  {d.kind === 'write' && (
                    <p className="text-center">
                      <span className="font-serif text-[26px] font-semibold">{d.letter.latin}</span>
                      <span className="mt-1 block text-[14px] text-ink-soft">{d.letter.sound}</span>
                    </p>
                  )}
                  <WritePad
                    ref={(h) => {
                      if (h) pads.current.set(d.key, h);
                      else pads.current.delete(d.key);
                    }}
                    glyph={drawnForm(d.letter)}
                    lang={lang}
                    mode={d.kind}
                    result={phase === 'answer' ? null : phase}
                    onInk={setInked}
                    serif={Boolean(d.letter.character)}
                  />
                </div>
              )}
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
        rightNote={rightNote}
        wrong={wrong}
        checkLabel={d?.kind === 'meet' ? 'Got it' : 'Check'}
        hint={d?.kind === 'pairs' ? 'Tap one side, then its match' : undefined}
        aside={
          d?.kind === 'trace' ? (
            <p className="text-sm text-ink-soft"><UiText source={'Draw over the grey letter.'} /></p>
          ) : d?.kind === 'write' ? (
            <p className="text-sm text-ink-soft"><UiText source={'Draw it from memory, any size.'} /></p>
          ) : undefined
        }
      />
    </>
  );
}

/** What is asked, big, with a line under it, then the answers. */
function Asked({ big, sub, lang, dir, children }: { big: string; sub?: string; lang?: string; dir?: 'rtl'; children: React.ReactNode }) {
  return (
    <div className="space-y-7">
      <div className="text-center">
        <p lang={lang} dir={dir ?? 'auto'} className="font-serif text-[56px] leading-tight font-semibold sm:text-[64px]">
          {big}
        </p>
        {sub && <p className="mt-1 text-[15px] text-ink-soft">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function MeetView({ letter, script }: { letter: Letter; script: Script }) {
  const lang = script.lang;
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <motion.p
          lang={lang}
          className={cx('leading-none font-semibold', letter.character ? 'font-serif text-[104px]' : 'text-[96px]')}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={spring.snappy}
        >
          {shown(letter)}
        </motion.p>
        <p className="font-serif text-[24px] font-semibold">{letter.latin}</p>
        {named(letter) && (
          <p className="text-[14px] text-ink-faint"><UiText source={'called {0}'} values={[<span lang={lang}>{letter.name}</span>]} /></p>
        )}
        <p className="max-w-md text-[16px] leading-snug text-ink-soft">{letter.sound}</p>
      </div>
      {script.joins && <JoinedForms letter={letter} lang={lang} />}
      {letter.words.length > 0 && (
        <ul className="mx-auto max-w-md divide-y divide-line rounded-2xl border border-line/70 bg-raised">
          {letter.words.map((w) => (
            <li key={w.w} className="flex items-center gap-3 px-4 py-2.5">
              <span lang={lang} dir="auto" className="font-serif text-[20px] font-semibold">
                {w.w}
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px] text-ink-soft">
                {w.latin} · {w.en}
              </span>
              <SpeakButton lang={lang} text={w.w} size={17} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** An Arabic letter's four shapes: alone, at the start, in the middle, at the end. */
export function JoinedForms({ letter, lang }: { letter: Letter; lang: string }) {
  const translateUi = useUi();
  if (letter.glyph.length > 1) return null;
  return (
    <div className="mx-auto grid max-w-md grid-cols-4 gap-2 text-center" dir="rtl">
      {(['isolated', 'initial', 'medial', 'final'] as const).map((p) => (
        <div key={p} className="rounded-2xl bg-surface px-2 py-2.5">
          <p lang={lang} className="text-[30px] leading-tight">
            {joinedForm(letter.glyph, p)}
          </p>
          <p className="text-[11px] font-semibold text-ink-faint" dir="ltr">
            {p === 'isolated' ? translateUi('alone') : p === 'initial' ? translateUi('start') : p === 'medial' ? translateUi('middle') : translateUi('end')}
          </p>
        </div>
      ))}
    </div>
  );
}

function tone(phase: Phase, i: number, answer: number, chosen: boolean) {
  const reveal = phase !== 'answer';
  return reveal && i === answer ? 'border-sage bg-sage-soft' : reveal && chosen ? 'border-accent bg-accent-soft' : chosen ? 'border-ink bg-raised' : 'border-line bg-raised hover:border-line-strong';
}

interface ChoiceProps {
  options: string[];
  value: number | null;
  onChange: (i: number) => void;
  phase: Phase;
  answer: number;
  lang?: string;
  dir?: 'rtl';
}

function TextChoices({ options, value, onChange, phase, answer, lang }: ChoiceProps) {
  const { pointer } = useLayout();
  const { cue } = useLessonFeel();
  return (
    <div role="radiogroup" className="grid gap-2.5 sm:grid-cols-2">
      {options.map((o, i) => (
        <motion.button
          key={`${o}-${i}`}
          type="button"
          role="radio"
          aria-checked={value === i}
          disabled={phase !== 'answer'}
          onClick={() => {
            cue('tap');
            onChange(i);
          }}
          animate={phase !== 'answer' && value === i && i !== answer ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.32 }}
          className={cx(
            'no-callout flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-[17px] font-semibold transition-colors active:scale-[0.98]',
            tone(phase, i, answer, value === i),
          )}
        >
          {pointer === 'fine' && <Kbd>{i + 1}</Kbd>}
          <span lang={lang} className="min-w-0 flex-1">
            {o}
          </span>
        </motion.button>
      ))}
    </div>
  );
}

/** Letters to choose from, big enough to tell apart. */
function GlyphChoices({ options, value, onChange, phase, answer, lang, dir, small }: ChoiceProps & { small?: boolean }) {
  const { pointer } = useLayout();
  const { cue } = useLessonFeel();
  return (
    <div role="radiogroup" className={cx('grid gap-2.5', small ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4')}>
      {options.map((o, i) => (
        <motion.button
          key={`${o}-${i}`}
          type="button"
          role="radio"
          aria-checked={value === i}
          disabled={phase !== 'answer'}
          onClick={() => {
            cue('tap');
            onChange(i);
          }}
          animate={phase !== 'answer' && value === i && i !== answer ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.32 }}
          className={cx('no-callout relative grid min-h-24 place-items-center rounded-2xl border-2 px-3 py-3 transition-colors active:scale-[0.98]', tone(phase, i, answer, value === i))}
        >
          {pointer === 'fine' && (
            <span className="absolute top-2 left-2">
              <Kbd>{i + 1}</Kbd>
            </span>
          )}
          <span lang={lang} dir={dir ?? 'auto'} className={cx('leading-tight', small ? 'font-serif text-[26px]' : 'text-[40px]')}>
            {o}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
