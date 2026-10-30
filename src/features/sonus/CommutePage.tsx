import { UiText, useUi } from '@/design/i18n/UiText';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Heart, LoaderCircle, Moon, Pause, Play, Repeat, RotateCcw, RotateCw, SkipBack, SkipForward, Smartphone, Sun, Type, Undo2 } from 'lucide-react';
import { toggleFavorite, useSavedStations } from '@/data/radio';
import { setSetting } from '@/data/settings';
import { cueIndexAt } from '@/core/audio/cues';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { fade } from '@/design/motion';
import { cx } from '@/lib/cx';
import { nextSentence, onTime, previousSentence, replaySentence, setRate, toggleRepeat, skip, toggle, usePlayer } from '@/services/audio/engine';
import { setLiveTranscript, useLive } from '@/services/radio/live';
import { playStation } from '@/services/radio/play';
import { toast } from '@/state/ui';
import { Artwork } from './library/Artwork';
import { RATES, rateLabel } from './player/Transport';
import { sonusHome } from '@/features/sonus/paths';

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
  const translateUi = useUi();
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

  const close = () => (window.history.length > 1 ? navigate(-1) : navigate(sonusHome()));
  const header = (
    <header className="relative flex items-center gap-2 px-3 pt-2">
      <button type="button" aria-label={translateUi('Leave commute mode')} onClick={close} className="grid size-12 place-items-center rounded-2xl text-ink-soft">
        <ChevronDown size={26} aria-hidden />
      </button>
      <p className="min-w-0 flex-1 truncate text-center text-[13px] font-bold tracking-[0.12em] text-ink-faint uppercase"><UiText source={'Commute'} /></p>
      <button
        type="button"
        aria-label={dark ? translateUi('Switch to Paper (light)') : translateUi('Switch to Nocturne (dark)')}
        title={dark ? translateUi('Paper') : translateUi('Nocturne')}
        onClick={flipTheme}
        className="grid size-12 place-items-center rounded-2xl text-ink-soft transition-colors hover:bg-sunken"
      >
        {dark ? <Sun size={22} aria-hidden /> : <Moon size={22} aria-hidden />}
      </button>
      <button
        type="button"
        aria-pressed={awake}
        aria-label={translateUi('Keep the screen on')}
        title={translateUi('Keep the screen on')}
        onClick={() => {
          if (!('wakeLock' in navigator)) return toast('This browser can’t keep the screen on.');
          setAwake((v) => !v);
        }}
        className={cx('grid size-12 place-items-center rounded-2xl transition-colors', awake ? 'bg-accent-soft text-accent-text' : 'text-ink-soft')}
      >
        <Smartphone size={22} aria-hidden />
      </button>
    </header>
  );
  useHotkeys({ ' ': toggle, escape: close, arrowleft: previousSentence, arrowright: nextSentence });

  if (!media) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg p-6 text-center">
        <div>
          <p className="font-serif text-2xl font-semibold"><UiText source={'Nothing is playing'} /></p>
          <p className="mt-2 text-ink-soft"><UiText source={'Start an episode in Sonus, then come back for the big controls.'} /></p>
          <Link to={sonusHome()} className="hit mt-5 inline-block font-semibold text-accent-text"><UiText source={'Go to Sonus'} /></Link>
        </div>
      </div>
    );
  }

  if (media.kind === 'radio') return <RadioCommute header={header} />;

  const playing = status === 'playing';
  const sentence = cues?.[Math.max(0, index)];
  const upcoming = cues?.[index + 1];
  const hasCues = Boolean(cues?.length);
  const nextRate = RATES[(RATES.indexOf(rate) + 1) % RATES.length] ?? 1;

  return (
    <div className="no-callout relative isolate flex min-h-dvh flex-col overflow-hidden bg-bg" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
      <Backdrop coverUrl={media.coverUrl} />
      {header}

      <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-7 py-6">
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

      <div className="glass relative mx-auto w-[calc(100%-2.5rem)] max-w-xl rounded-[36px] p-4">
        <div className="grid grid-cols-3 items-center gap-3">
          <BigButton label={hasCues ? translateUi('Previous sentence') : translateUi('Back {0} seconds', [back])} onClick={() => (hasCues ? previousSentence() : skip(-back))}>
            {hasCues ? <Undo2 size={30} aria-hidden /> : <RotateCcw size={30} aria-hidden />}
          </BigButton>
          <button
            type="button"
            aria-label={playing ? translateUi('Pause') : translateUi('Play')}
            onClick={toggle}
            className="mx-auto grid size-[104px] place-items-center rounded-full bg-inverse text-on-inverse shadow-elev-3 ring-1 ring-white/30 transition-transform duration-200 hover:scale-105 active:scale-90"
          >
            {playing ? <Pause size={42} className="fill-current" aria-hidden /> : <Play size={42} className="translate-x-1 fill-current" aria-hidden />}
          </button>
          <BigButton label={hasCues ? translateUi('Next sentence') : translateUi('Forward {0} seconds', [fwd])} onClick={() => (hasCues ? nextSentence() : skip(fwd))}>
            {hasCues ? <Undo2 size={30} className="-scale-x-100" aria-hidden /> : <RotateCw size={30} aria-hidden />}
          </BigButton>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <BigButton label={translateUi('Hear this sentence again')} onClick={replaySentence} disabled={!hasCues} small>
            <span className="text-[15px] font-bold"><UiText source={'Again'} /></span>
          </BigButton>
          <BigButton
            label={translateUi('Repeat each sentence: {0}', [repeat === 1 ? 'off' : `${repeat} times`])}
            onClick={() => toggleRepeat()}
            disabled={!hasCues}
            active={repeat > 1}
            small
          >
            <Repeat size={18} aria-hidden />
            <span className="text-[15px] font-bold">{repeat > 1 ? `${repeat}×` : translateUi('Repeat')}</span>
          </BigButton>
          <BigButton label={translateUi('Speed {0}, tap for {1}', [rateLabel(rate), rateLabel(nextRate)])} onClick={() => setRate(nextRate)} small>
            <span className="text-[15px] font-bold tabular-nums">{rateLabel(rate)}</span>
          </BigButton>
        </div>
      </div>
    </div>
  );
}

/** Commute mode for a station: what's on (or what's said) in large type, your stations one after another. */
function RadioCommute({ header }: { header: ReactNode }) {
  const translateUi = useUi();
  const media = usePlayer((s) => s.media)!;
  const status = usePlayer((s) => s.status);
  const nowPlaying = usePlayer((s) => s.nowPlaying);
  const live = useLive((s) => s.on);
  const line = useLive((s) => (s.mediaId === media.id ? s.cues.at(-1)?.text : undefined));
  const stations = useSavedStations(media.lang) ?? [];
  const id = media.id.replace(/^radio:/, '');
  const at = stations.findIndex((s) => s.id === id);
  const saved = stations[at];
  const step = (by: number) => {
    if (stations.length < 2) return;
    playStation(stations[(Math.max(0, at) + by + stations.length) % stations.length], media.lang);
  };
  useHotkeys({ arrowleft: () => step(-1), arrowright: () => step(1) });
  const playing = status === 'playing';
  return (
    <div className="no-callout relative isolate flex min-h-dvh flex-col overflow-hidden bg-bg" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
      <Backdrop coverUrl={media.coverUrl} />
      {header}
      <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-7 py-6 text-center">
        <Artwork title={media.title} coverUrl={media.coverUrl} className="w-[min(36vw,160px)] shadow-elev-2" rounded="rounded-3xl" />
        <p className="mt-5 font-serif text-[clamp(24px,6.4vw,36px)] leading-tight font-semibold">{media.title}</p>
        <p className="mt-1 text-[15px] text-ink-soft">{status === 'loading' ? translateUi('Tuning in…') : (nowPlaying ?? media.artist)}</p>
        <AnimatePresence mode="wait" initial={false}>
          {live && line && (
            <motion.p key={line} lang={media.lang} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={fade} className="mt-8 font-serif text-[clamp(22px,5.6vw,32px)] leading-snug font-semibold">
              {line}
            </motion.p>
          )}
        </AnimatePresence>
      </main>
      <div className="glass relative mx-auto w-[calc(100%-2.5rem)] max-w-xl rounded-[36px] p-4">
        <div className="grid grid-cols-3 items-center gap-3">
          <BigButton label={translateUi('Your previous station')} onClick={() => step(-1)} disabled={stations.length < 2}>
            <SkipBack size={30} aria-hidden />
          </BigButton>
          <button
            type="button"
            aria-label={playing ? translateUi('Pause') : translateUi('Play')}
            onClick={toggle}
            className="mx-auto grid size-[104px] place-items-center rounded-full bg-inverse text-on-inverse shadow-elev-3 ring-1 ring-white/30 transition-transform duration-200 hover:scale-105 active:scale-90"
          >
            {status === 'loading' ? <LoaderCircle size={40} className="animate-spin" aria-hidden /> : playing ? <Pause size={42} className="fill-current" aria-hidden /> : <Play size={42} className="translate-x-1 fill-current" aria-hidden />}
          </button>
          <BigButton label={translateUi('Your next station')} onClick={() => step(1)} disabled={stations.length < 2}>
            <SkipForward size={30} aria-hidden />
          </BigButton>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <BigButton label={saved?.favorite ? translateUi('In your stations') : translateUi('Add to your stations')} onClick={() => saved && void toggleFavorite(saved, media.lang)} disabled={!saved} active={Boolean(saved?.favorite)} small>
            <Heart size={18} className={saved?.favorite ? 'fill-current' : undefined} aria-hidden />
            <span className="text-[15px] font-bold">{saved?.favorite ? translateUi('Saved') : translateUi('Save')}</span>
          </BigButton>
          <BigButton label={live ? translateUi('Stop writing out what’s said') : translateUi('Write out what’s said')} onClick={() => setLiveTranscript(!live)} active={live} small>
            <Type size={18} aria-hidden />
            <span className="text-[15px] font-bold"><UiText source={'Live text'} /></span>
          </BigButton>
        </div>
      </div>
    </div>
  );
}

/** The playing cover, blurred large and soft, behind the whole screen. */
function Backdrop({ coverUrl }: { coverUrl?: string }) {
  return <div aria-hidden className="commute-backdrop" style={{ backgroundImage: coverUrl ? `url("${coverUrl}")` : 'radial-gradient(circle at 30% 30%, var(--accent), transparent 60%), radial-gradient(circle at 70% 70%, var(--sage), transparent 60%)' }} />;
}

function BigButton({ label, onClick, children, disabled, active, small }: { label: string; onClick: () => void; children: ReactNode; disabled?: boolean; active?: boolean; small?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cx('glass-button flex items-center justify-center gap-2 rounded-full disabled:opacity-35', small ? 'h-16' : 'h-[88px]', active ? 'text-accent-text ring-2 ring-accent/40' : 'text-ink')}
    >
      {children}
    </button>
  );
}
