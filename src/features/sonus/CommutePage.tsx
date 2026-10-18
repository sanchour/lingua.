import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Moon, Pause, Play, Repeat, RotateCcw, RotateCw, Smartphone, Sun, Undo2 } from 'lucide-react';
import { setSetting } from '@/data/settings';
import { cueIndexAt } from '@/core/audio/cues';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { fade } from '@/design/motion';
import { cx } from '@/lib/cx';
import { nextSentence, onTime, previousSentence, replaySentence, setRate, toggleRepeat, skip, toggle, usePlayer } from '@/services/audio/engine';
import { toast } from '@/state/ui';
import { Artwork } from './library/Artwork';
import { RATES, rateLabel } from './player/Transport';

/** Keeps the screen on while commute mode is open (if the learner wants it). */
function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = () =>
      navigator.wakeLock
        .request('screen')
        .then((l) => {
          if (cancelled) void l.release();
          else lock = l;
        })
        .catch(() => undefined);
    void acquire();
    const onVisible = () => document.visibilityState === 'visible' && void acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release();
    };
  }, [on]);
}

/**
 * Hands-free listening for the bike, the car or a walk: the sentence being spoken in large type,
 * and a few big controls that are easy to hit without looking. Works with the screen locked too.
 */
export default function CommutePage() {
  const navigate = useNavigate();
  const media = usePlayer((s) => s.media);
  const status = usePlayer((s) => s.status);
  const cues = usePlayer((s) => s.cues);
  const rate = usePlayer((s) => s.rate);
  const repeat = usePlayer((s) => s.repeat);
  const back = usePlayer((s) => s.skipBackSec);
  const fwd = usePlayer((s) => s.skipFwdSec);
  const [index, setIndex] = useState(-1);
  const [awake, setAwake] = useState(false);
  useWakeLock(awake);
  // Light or dark right here, for a dark bus or a bright street (it changes the app's theme).
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'nocturne');
  const flipTheme = () => {
    const next = dark ? 'paper' : 'nocturne';
    setDark(!dark);
    void setSetting('theme', next);
  };

  useEffect(() => {
    if (!cues?.length) return setIndex(-1);
    return onTime((ms) => {
      const i = cueIndexAt(cues, ms);
      setIndex((current) => (current === i ? current : i));
    });
  }, [cues]);

  const close = () => (window.history.length > 1 ? navigate(-1) : navigate('/sonus'));
  useHotkeys({ ' ': toggle, escape: close, arrowleft: previousSentence, arrowright: nextSentence });

  if (!media) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg p-6 text-center">
        <div>
          <p className="font-serif text-2xl font-semibold">Nothing is playing</p>
          <p className="mt-2 text-ink-soft">Start an episode in Sonus, then come back for the big controls.</p>
          <Link to="/sonus" className="hit mt-5 inline-block font-semibold text-accent-text">
            Go to Sonus
          </Link>
        </div>
      </div>
    );
  }

  const playing = status === 'playing';
  const sentence = cues?.[Math.max(0, index)];
  const upcoming = cues?.[index + 1];
  const hasCues = Boolean(cues?.length);
  const nextRate = RATES[(RATES.indexOf(rate) + 1) % RATES.length] ?? 1;

  return (
    <div className="no-callout flex min-h-dvh flex-col bg-bg" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
      <header className="flex items-center gap-2 px-3 pt-2">
        <button type="button" aria-label="Leave commute mode" onClick={close} className="grid size-12 place-items-center rounded-2xl text-ink-soft">
          <ChevronDown size={26} aria-hidden />
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-[13px] font-bold tracking-[0.12em] text-ink-faint uppercase">Commute</p>
        <button
          type="button"
          aria-label={dark ? 'Switch to Paper (light)' : 'Switch to Nocturne (dark)'}
          title={dark ? 'Paper' : 'Nocturne'}
          onClick={flipTheme}
          className="grid size-12 place-items-center rounded-2xl text-ink-soft transition-colors hover:bg-sunken"
        >
          {dark ? <Sun size={22} aria-hidden /> : <Moon size={22} aria-hidden />}
        </button>
        <button
          type="button"
          aria-pressed={awake}
          aria-label="Keep the screen on"
          title="Keep the screen on"
          onClick={() => {
            if (!('wakeLock' in navigator)) return toast('This browser can’t keep the screen on.');
            setAwake((v) => !v);
          }}
          className={cx('grid size-12 place-items-center rounded-2xl transition-colors', awake ? 'bg-accent-soft text-accent-text' : 'text-ink-soft')}
        >
          <Smartphone size={22} aria-hidden />
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-7 py-6">
        {hasCues && sentence ? (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={index} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={fade}>
              <p lang={media.lang} className="font-serif text-[clamp(26px,7vw,40px)] leading-[1.3] font-semibold">
                {sentence.text}
              </p>
              {upcoming && (
                <p lang={media.lang} className="mt-6 font-serif text-[clamp(18px,4.6vw,24px)] leading-snug text-ink-faint">
                  {upcoming.text}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="flex flex-col items-center text-center">
            <Artwork title={media.title} coverBlobId={media.coverBlobId} coverUrl={media.coverUrl} className="w-[min(60vw,280px)] shadow-elev-2" rounded="rounded-3xl" />
            <p lang={media.lang} className="mt-6 font-serif text-2xl font-semibold">
              {media.title}
            </p>
            {media.collection && <p className="mt-1 text-ink-soft">{media.collection}</p>}
          </div>
        )}
      </main>

      <div className="mx-auto w-full max-w-xl px-5">
        <div className="grid grid-cols-3 items-center gap-3">
          <BigButton label={hasCues ? 'Previous sentence' : `Back ${back} seconds`} onClick={() => (hasCues ? previousSentence() : skip(-back))}>
            {hasCues ? <Undo2 size={30} aria-hidden /> : <RotateCcw size={30} aria-hidden />}
          </BigButton>
          <button
            type="button"
            aria-label={playing ? 'Pause' : 'Play'}
            onClick={toggle}
            className="mx-auto grid size-[104px] place-items-center rounded-full bg-inverse text-on-inverse shadow-elev-3 transition-transform duration-150 active:scale-90"
          >
            {playing ? <Pause size={42} className="fill-current" aria-hidden /> : <Play size={42} className="translate-x-1 fill-current" aria-hidden />}
          </button>
          <BigButton label={hasCues ? 'Next sentence' : `Forward ${fwd} seconds`} onClick={() => (hasCues ? nextSentence() : skip(fwd))}>
            {hasCues ? <Undo2 size={30} className="-scale-x-100" aria-hidden /> : <RotateCw size={30} aria-hidden />}
          </BigButton>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <BigButton label="Hear this sentence again" onClick={replaySentence} disabled={!hasCues} small>
            <span className="text-[15px] font-bold">Again</span>
          </BigButton>
          <BigButton
            label={`Repeat each sentence: ${repeat === 1 ? 'off' : `${repeat} times`}`}
            onClick={() => toggleRepeat()}
            disabled={!hasCues}
            active={repeat > 1}
            small
          >
            <Repeat size={18} aria-hidden />
            <span className="text-[15px] font-bold">{repeat > 1 ? `${repeat}×` : 'Repeat'}</span>
          </BigButton>
          <BigButton label={`Speed ${rateLabel(rate)}, tap for ${rateLabel(nextRate)}`} onClick={() => setRate(nextRate)} small>
            <span className="text-[15px] font-bold tabular-nums">{rateLabel(rate)}</span>
          </BigButton>
        </div>
      </div>
    </div>
  );
}

function BigButton({ label, onClick, children, disabled, active, small }: { label: string; onClick: () => void; children: ReactNode; disabled?: boolean; active?: boolean; small?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'flex items-center justify-center gap-2 rounded-3xl border transition-[transform,background-color] duration-150 active:scale-95 disabled:opacity-35',
        small ? 'h-16' : 'h-[88px]',
        active ? 'border-accent/40 bg-accent-soft text-accent-text' : 'border-line bg-surface text-ink',
      )}
    >
      {children}
    </button>
  );
}
