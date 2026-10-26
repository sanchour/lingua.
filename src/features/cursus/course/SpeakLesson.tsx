import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { MessagesSquare, Mic, RotateCcw, Square } from 'lucide-react';
import { useApp } from '@/app/context';
import { plain } from '@/core/grammar/types';
import { speechMatch, SPOKEN_PASS } from '@/core/course/speech';
import type { HeardWord } from '@/core/course/speech';
import type { UnitOutline } from '@/core/course/outline';
import type { UnitContent } from '@/core/course/types';
import { aiKeys } from '@/data/plan';
import type { JournalReview } from '@/data/types';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { Button } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { CorrectionList, ReviewText } from '@/features/codex/diarium/Review';
import { FeedbackBar, PlayBig, PRAISE, useLessonFeel } from '@/features/lesson/kit';
import type { LessonResult, Phase } from '@/features/lesson/kit';
import { StudyBar } from '@/features/thesaurus/study/StudyBar';
import { checkEntry } from '@/services/llm/journal';
import { listenOnce, RecognitionError, recognitionSupported } from '@/services/speech/recognition';

interface Props {
  unit: UnitOutline;
  content: UnitContent;
  lang: string;
  onClose: () => void;
  onActive: (ms: number) => void;
  onFinish: (score: number, result: LessonResult, tiles: Array<[string, string]>) => void;
}

const minutes = (ms: number) => (ms < 60_000 ? `${Math.max(1, Math.round(ms / 1000))} s` : `${Math.round(ms / 60_000)} min`);

type Listening = { stop: () => void } | null;

/**
 * Speak: each phrase heard, then said. The browser's speech recognition compares what it heard word
 * by word; without it (or without the microphone), you say it and go on yourself. Last, an open
 * turn on the unit's subject, read back to you (and corrected with an AI key).
 */
export function SpeakLesson({ unit, content, lang, onClose, onActive, onFinish }: Props) {
  const feel = useLessonFeel();
  const [canListen, setCanListen] = useState(recognitionSupported);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('answer');
  const [listening, setListening] = useState<Listening>(null);
  const [live, setLive] = useState('');
  const [match, setMatch] = useState<{ words: HeardWord[]; score: number; said: string } | null>(null);
  const [note, setNote] = useState('');
  const [praise, setPraise] = useState(PRAISE[0]);
  const stats = useRef({ first: 0, right: 0, tried: new Set<number>() });
  const startedAt = useRef(performance.now());
  const lastTick = useRef(performance.now());

  const phrases = content.phrases;
  const open = index >= phrases.length;
  const phrase = phrases[Math.min(index, phrases.length - 1)];
  const text = plain(phrase.s);
  const rtl = lang === 'ar';

  const tick = useCallback(() => {
    const now = performance.now();
    onActive(Math.min(now - lastTick.current, 60_000));
    lastTick.current = now;
  }, [onActive]);

  useEffect(() => () => listening?.stop(), [listening]);

  const grade = (right: boolean) => {
    if (!stats.current.tried.has(index)) {
      stats.current.tried.add(index);
      stats.current.first++;
      if (right) stats.current.right++;
    }
    feel.answered(right);
    if (right) setPraise(PRAISE[Math.floor(Math.random() * PRAISE.length)]);
    setPhase(right ? 'right' : 'wrong');
  };

  const listen = () => {
    if (listening) return listening.stop();
    setNote('');
    setLive('');
    setMatch(null);
    const session = listenOnce(lang, setLive);
    setListening(session);
    void session.result
      .then((heard) => {
        if (!heard.length) return setNote('Nothing was heard. Try again a little louder.');
        const m = speechMatch(text, heard, lang);
        setMatch(m);
        grade(m.score >= SPOKEN_PASS);
      })
      .catch((error: unknown) => {
        if (error instanceof RecognitionError && error.kind !== 'no-speech') setCanListen(false);
        setNote(error instanceof Error ? error.message : 'The microphone didn’t work.');
      })
      .finally(() => setListening(null));
  };

  const next = () => {
    tick();
    setPhase('answer');
    setMatch(null);
    setLive('');
    setNote('');
    setIndex((i) => i + 1);
  };

  const retry = () => {
    setPhase('answer');
    setMatch(null);
    setLive('');
  };

  const finish = () => {
    tick();
    const s = stats.current;
    const ms = performance.now() - startedAt.current;
    const score = s.first ? s.right / s.first : 1;
    onFinish(score, { answered: s.first, accuracy: score, ms, bestCombo: feel.best }, [
      ['Said right', canListen && s.first ? `${Math.round(score * 100)}%` : '—'],
      ['Phrases', String(phrases.length)],
      ['Time', minutes(ms)],
    ]);
  };

  useHotkeys(
    open
      ? { escape: onClose }
      : {
          enter: () => (phase === 'answer' ? !canListen && grade(true) : next()),
          m: () => canListen && phase === 'answer' && listen(),
          escape: onClose,
        },
  );

  return (
    <>
      <StudyBar title={`${unit.short} · Speak`} progress={Math.min(1, index / (phrases.length + 1))} onClose={onClose} />
      <main className="mx-auto max-w-2xl px-5" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 72px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 104px)' }}>
        <AnimatePresence mode="wait">
          {open ? (
            <OpenTurn key="open" unit={unit} lang={lang} canListen={canListen} onDone={finish} />
          ) : (
            <motion.div key={index} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={spring.soft} className="flex flex-col items-center text-center">
              <p className="text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">{canListen ? 'Listen, then say it' : 'Listen, then say it aloud'}</p>
              <div className="mt-6">
                <PlayBig lang={lang} text={text} playKey={`${index}`} />
              </div>
              <p lang={lang} dir={rtl ? 'rtl' : undefined} className="mt-8 font-serif text-[clamp(1.6rem,4vw,2.2rem)] leading-snug font-semibold">
                {match ? (
                  match.words.map((w, i) => (
                    <span key={i} className={cx(w.heard ? 'text-sage-text' : 'text-accent-text underline decoration-wavy decoration-1 underline-offset-[6px]')}>
                      {i > 0 && lang !== 'zh' ? ' ' : ''}
                      {w.text}
                    </span>
                  ))
                ) : (
                  text
                )}
              </p>
              {phrase.reading && <p className="mt-1 text-[15px] text-ink-soft">{phrase.reading}</p>}
              <p className="mt-2 text-[15px] text-ink-soft italic">{phrase.en}</p>

              {canListen && phase === 'answer' && (
                <div className="mt-8 flex flex-col items-center gap-2">
                  <motion.button
                    type="button"
                    onClick={listen}
                    whileTap={{ scale: 0.94 }}
                    className={cx('grid size-20 place-items-center rounded-full shadow-elev-2 transition-colors', listening ? 'bg-accent text-on-accent' : 'bg-raised text-ink hover:bg-surface')}
                    aria-label={listening ? 'Stop listening' : 'Say it'}
                  >
                    {listening ? <Square size={26} className="animate-pulse" aria-hidden /> : <Mic size={30} aria-hidden />}
                  </motion.button>
                  <p className="min-h-5 text-[13.5px] text-ink-soft" aria-live="polite">
                    {listening ? live || 'Listening…' : note || 'Press the microphone (M) and say it'}
                  </p>
                </div>
              )}
              {!canListen && note && <p className="mt-6 max-w-sm text-[13.5px] text-ink-soft">{note} Say it aloud yourself, then go on.</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      {!open && (
        <FeedbackBar
          phase={phase}
          ready={!canListen}
          checkLabel="I said it"
          hint={canListen ? <span className="text-ink-faint">{index + 1} of {phrases.length}</span> : undefined}
          onCheck={() => grade(true)}
          onNext={next}
          praise={praise}
          rightNote={match ? <p className="text-sm text-ink-soft">Heard: “{match.said}”</p> : undefined}
          wrong={
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-accent-text">Not quite: the marked words weren’t heard</p>
                {match?.said && <p className="truncate text-sm text-ink-soft">Heard: “{match.said}”</p>}
              </div>
              <Button variant="secondary" icon={RotateCcw} onClick={retry}>
                Try again
              </Button>
            </div>
          }
          aside={
            canListen ? (
              <button type="button" onClick={next} className="text-sm font-semibold text-ink-faint hover:text-ink">
                Can’t speak now? Skip
              </button>
            ) : undefined
          }
        />
      )}
    </>
  );
}

/** The last turn: talk about the unit's subject, see what was heard, and with an AI key, how to say it better. */
function OpenTurn({ unit, lang, canListen, onDone }: { unit: UnitOutline; lang: string; canListen: boolean; onDone: () => void }) {
  const { settings, language } = useApp();
  const navigate = useNavigate();
  const canCheck = Boolean(aiKeys(settings)[settings.llm.provider]?.trim() && settings.llm.model);
  const [said, setSaid] = useState('');
  const [live, setLive] = useState('');
  const [listening, setListening] = useState<Listening>(null);
  const [review, setReview] = useState<JournalReview | 'checking' | string | null>(null);

  useEffect(() => () => listening?.stop(), [listening]);

  const listen = () => {
    if (listening) return listening.stop();
    const session = listenOnce(lang, setLive);
    setListening(session);
    void session.result
      .then((heard) => heard[0] && setSaid((s) => (s ? `${s} ${heard[0]}` : heard[0])))
      .catch(() => undefined)
      .finally(() => {
        setLive('');
        setListening(null);
      });
  };

  const check = async () => {
    setReview('checking');
    try {
      setReview(await checkEntry(lang, language.level, said, unit.speak));
    } catch (error) {
      setReview(error instanceof Error ? error.message : 'The check didn’t work this time.');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft}>
      <p className="text-[12px] font-bold tracking-[0.12em] text-sage-text uppercase">Your turn</p>
      <h1 className="mt-1 font-serif text-[clamp(1.6rem,4vw,2.1rem)] leading-tight font-semibold">{unit.speak}</h1>
      <p className="mt-2 text-[15px] text-ink-soft">
        {canListen ? 'Press the microphone and talk; press again to add more. Use the phrases you just said.' : 'Say it aloud, in your own words, using the phrases you just practised.'}
      </p>
      {canListen && (
        <div className="mt-6 flex items-start gap-4">
          <motion.button
            type="button"
            onClick={listen}
            whileTap={{ scale: 0.94 }}
            className={cx('grid size-16 shrink-0 place-items-center rounded-full shadow-elev-2 transition-colors', listening ? 'bg-accent text-on-accent' : 'bg-raised text-ink hover:bg-surface')}
            aria-label={listening ? 'Stop listening' : 'Talk'}
          >
            {listening ? <Square size={22} className="animate-pulse" aria-hidden /> : <Mic size={26} aria-hidden />}
          </motion.button>
          <div lang={lang} dir={lang === 'ar' ? 'rtl' : undefined} className="min-h-16 min-w-0 flex-1 rounded-2xl bg-surface px-4 py-3 text-[17px] leading-relaxed" aria-live="polite">
            {said || live ? (
              <>
                {said} <span className="text-ink-faint">{live}</span>
              </>
            ) : (
              <span className="text-ink-faint">What you say appears here.</span>
            )}
          </div>
        </div>
      )}
      {review && review !== 'checking' && typeof review !== 'string' && (
        <div className="mt-6 space-y-4">
          <ReviewText review={review} lang={lang} />
          <CorrectionList review={review} lang={lang} />
        </div>
      )}
      {typeof review === 'string' && review !== 'checking' && <p className="mt-4 text-sm text-accent-text">{review}</p>}
      <div className="mt-8 flex flex-wrap gap-2">
        {canCheck && said && !(review && typeof review !== 'string') && (
          <Button variant="secondary" loading={review === 'checking'} onClick={() => void check()}>
            How could I say it better?
          </Button>
        )}
        <Button onClick={onDone}>Finish the lesson</Button>
        {/* Sermo makes a prompt in the language for ChatGPT, Claude, Gemini or Copilot (or talks here with a key); the lesson is saved first. */}
        <Button
          variant="ghost"
          icon={MessagesSquare}
          onClick={() => {
            onDone();
            navigate(`/mentis/sermo?topic=${encodeURIComponent(unit.speak)}`);
          }}
        >
          Finish, and keep talking with an AI
        </Button>
      </div>
    </motion.div>
  );
}
