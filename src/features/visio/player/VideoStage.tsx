import { useUi } from '@/design/i18n/UiText';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bookmark, Maximize, Minimize, Pause, Play, Repeat, SkipBack, SkipForward } from 'lucide-react';
import { formatClock } from '@/core/audio/cues';
import type { VideoLike } from '@/core/visio/videoLike';
import type { Cue, Media } from '@/data/types';
import { useLayout } from '@/design/hooks/useLayout';
import { Popover } from '@/design/primitives';
import { cx } from '@/lib/cx';
import type { VideoClock } from './clock';
import { SubtitleOverlay } from './SubtitleOverlay';
import { SubtitleSettings } from './SubtitleSettings';

export const RATES = [0.5, 0.6, 0.75, 0.85, 1, 1.1, 1.25, 1.5];

export interface LineActions {
  previous: () => void;
  next: () => void;
  repeat: () => void;
  save: () => void;
  hasLines: boolean;
}

interface StageProps {
  media: Media;
  src: string | null;
  target: Cue[] | null;
  native: Cue[] | null;
  clock: VideoClock;
  stageRef: RefObject<HTMLDivElement | null>;
  /** What plays: the <video>, or a stand-in (the follow clock, YouTube's embed). */
  player: VideoLike | null;
  /** Receives the <video> element once it is on the page. */
  onVideo: (el: HTMLVideoElement | null) => void;
  /** Draws the controls and the subtitles over something that isn't a <video> (YouTube's embed, the follow clock). */
  live?: boolean;
  /** Put where the <video> would be (YouTube's embed). */
  embed?: ReactNode;
  tracks: Array<{ src: string; lang: string; label: string; role: 'target' | 'native' }>;
  lines: LineActions;
  fullscreen: boolean;
  onFullscreen: () => void;
  onHold: (holding: boolean) => void;
  /** Shown instead of the picture (no video file). */
  placeholder?: ReactNode;
}

/** The picture with its two subtitle lines and a quiet set of controls that fade while playing. */
export function VideoStage({ media, src, target, native, clock, stageRef, player, onVideo, live: standIn, embed, tracks, lines, fullscreen, onFullscreen, onHold, placeholder }: StageProps) {
  const translateUi = useUi();
  const live = Boolean(src) || Boolean(standIn);
  const { pointer } = useLayout();
  const [playing, setPlaying] = useState(false);
  const [chrome, setChrome] = useState(true);
  // The big button only invites the first play; after that it would cover the subtitles.
  const [started, setStarted] = useState(false);
  const [rate, setRateState] = useState(1);
  const hideTimer = useRef(0);

  useEffect(() => {
    const v = player;
    if (!v) return;
    const sync = () => {
      setPlaying(!v.paused);
      if (!v.paused || v.currentTime > 0.5) setStarted(true);
      setRateState(v.playbackRate);
      if (v.paused) setChrome(true);
    };
    const events = ['play', 'pause', 'ratechange', 'ended', 'loadedmetadata'] as const;
    for (const e of events) v.addEventListener(e, sync);
    sync();
    return () => {
      for (const e of events) v.removeEventListener(e, sync);
    };
  }, [player]);

  const poke = () => {
    setChrome(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (player && !player.paused) setChrome(false);
    }, 2600);
  };
  useEffect(() => {
    if (playing) poke();
    return () => window.clearTimeout(hideTimer.current);
  }, [playing]);

  const toggle = () => {
    const v = player;
    if (!v) return;
    if (v.paused) void v.play().catch(() => undefined);
    else v.pause();
  };

  const onStageClick = () => {
    if (!live) return;
    if (pointer === 'fine') {
      toggle();
      poke();
    } else if (!chrome) poke();
    else if (playing) setChrome(false);
  };

  const icon = 'grid size-10 shrink-0 place-items-center rounded-xl text-white/90 transition-colors hover:bg-white/15 active:scale-95';
  return (
    <div
      ref={stageRef}
      className={cx('@container relative overflow-hidden bg-black select-none', fullscreen ? 'size-full' : 'aspect-video w-full rounded-none sm:rounded-3xl', !chrome && playing && 'cursor-none')}
      onPointerMove={(e) => e.pointerType === 'mouse' && poke()}
      onClick={onStageClick}
    >
      {src ? (
        <video
          ref={onVideo}
          src={src}
          playsInline
          preload="metadata"
          crossOrigin={media.remoteUrl && !media.blobId ? 'anonymous' : undefined}
          className="absolute inset-0 size-full object-contain"
        >
          {tracks.map((t) => (
            <track key={t.src} kind="subtitles" src={t.src} srcLang={t.lang} label={t.label} default={t.role === 'target'} />
          ))}
        </video>
      ) : (
        (embed ?? placeholder)
      )}

      {live && (
        <div className="absolute inset-0 transition-transform duration-300" style={{ transform: chrome || !playing ? 'translateY(-46px)' : undefined }}>
          <SubtitleOverlay media={media} target={target} native={native} clock={clock} onHold={onHold} />
        </div>
      )}

      <AnimatePresence>
        {live && (chrome || !playing) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="pointer-events-none absolute inset-0">
            {!started && !playing && (
              <button
                type="button"
                aria-label={playing ? translateUi('Pause') : translateUi('Play')}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle();
                  poke();
                }}
                className="pointer-events-auto absolute top-1/2 left-1/2 grid size-16 -translate-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur-md transition-transform active:scale-90"
              >
                {playing ? <Pause size={28} className="fill-current" aria-hidden /> : <Play size={28} className="translate-x-0.5 fill-current" aria-hidden />}
              </button>
            )}
            <div
              className="pointer-events-auto absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-2 pt-10 pb-1.5 sm:px-3"
              onClick={(e) => e.stopPropagation()}
            >
              <Scrubber clock={clock} player={player} durationMs={media.durationMs} />
              <div className="flex items-center gap-0.5">
                <button type="button" aria-label={playing ? translateUi('Pause') : translateUi('Play')} onClick={toggle} className={icon}>
                  {playing ? <Pause size={19} className="fill-current" aria-hidden /> : <Play size={19} className="translate-x-px fill-current" aria-hidden />}
                </button>
                {fullscreen && lines.hasLines && (
                  <>
                    <button type="button" aria-label={translateUi('Previous line')} onClick={lines.previous} className={icon}>
                      <SkipBack size={18} aria-hidden />
                    </button>
                    <button type="button" aria-label={translateUi('Repeat line')} onClick={lines.repeat} className={icon}>
                      <Repeat size={18} aria-hidden />
                    </button>
                    <button type="button" aria-label={translateUi('Next line')} onClick={lines.next} className={icon}>
                      <SkipForward size={18} aria-hidden />
                    </button>
                  </>
                )}
                <TimeLabel clock={clock} durationMs={media.durationMs} />
                <span className="flex-1" />
                {fullscreen && lines.hasLines && (
                  <button type="button" aria-label={translateUi('Save line')} onClick={lines.save} className={icon}>
                    <Bookmark size={18} aria-hidden />
                  </button>
                )}
                <Popover
                  label={translateUi('Speed')}
                  placement="top-end"
                  className="w-40"
                  trigger={(props) => (
                    <button {...props} type="button" aria-label={translateUi('Speed {0}×', [rate])} className={cx(icon, 'w-auto px-2.5 text-[13px] font-bold tabular-nums')}>
                      {rate === 1 ? '1×' : `${rate}×`}
                    </button>
                  )}
                >
                  {(close) => (
                    <div className="space-y-0.5">
                      {RATES.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            if (player) player.playbackRate = r;
                            close();
                          }}
                          className={cx('flex w-full rounded-lg px-3 py-2 text-left text-[14px] font-semibold tabular-nums hover:bg-surface', r === rate && 'bg-accent-soft text-accent-text')}
                        >
                          {r}×{r === 1 ? translateUi(' · normal') : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </Popover>
                {fullscreen && <SubtitleSettings dark />}
                <button type="button" aria-label={fullscreen ? translateUi('Exit full screen') : translateUi('Full screen')} onClick={onFullscreen} className={icon}>
                  {fullscreen ? <Minimize size={18} aria-hidden /> : <Maximize size={18} aria-hidden />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Position and length; written straight to the DOM as the video plays. */
function TimeLabel({ clock, durationMs }: { clock: VideoClock; durationMs?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let last = '';
    return clock.onTime((ms) => {
      const total = clock.video()?.duration;
      const length = total && Number.isFinite(total) ? total * 1000 : (durationMs ?? 0);
      const label = length ? `${formatClock(ms)} / ${formatClock(length)}` : formatClock(ms);
      if (label !== last && ref.current) ref.current.textContent = last = label;
    });
  }, [clock, durationMs]);
  return <span ref={ref} className="ml-1.5 text-[12.5px] font-semibold text-white/85 tabular-nums" />;
}

function Scrubber({ clock, player, durationMs }: { clock: VideoClock; player: VideoLike | null; durationMs?: number }) {
  const translateUi = useUi();
  const ref = useRef<HTMLInputElement>(null);
  const dragging = useRef(false);
  useEffect(
    () =>
      clock.onTime((ms) => {
        const input = ref.current;
        const total = clock.video()?.duration;
        if (!input || dragging.current) return;
        const length = total && Number.isFinite(total) ? total * 1000 : (durationMs ?? 0);
        input.max = String(Math.max(1, Math.round(length)));
        input.value = String(Math.round(ms));
        input.style.setProperty('--fill', `${length ? (ms / length) * 100 : 0}%`);
      }),
    [clock, durationMs],
  );
  return (
    <input
      ref={ref}
      type="range"
      min={0}
      step={100}
      aria-label={translateUi('Position')}
      className="visio-range block w-full"
      onPointerDown={() => (dragging.current = true)}
      onPointerUp={() => (dragging.current = false)}
      onChange={(e) => {
        const ms = Number(e.target.value);
        e.target.style.setProperty('--fill', `${(ms / Number(e.target.max)) * 100}%`);
        if (player) player.currentTime = ms / 1000;
      }}
    />
  );
}
