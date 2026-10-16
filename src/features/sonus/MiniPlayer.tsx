import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { LoaderCircle, Pause, Play, RotateCcw, X } from 'lucide-react';
import { useLayout } from '@/design/hooks/useLayout';
import { spring } from '@/design/motion';
import { closePlayer, onTime, skip, toggle, usePlayer } from '@/services/audio/engine';
import { Artwork } from './library/Artwork';

/** Height the phone layout reserves above the tab bar while the mini player shows. */
export const MINI_PLAYER_SPACE = 72;

/** What's playing, wherever you are: a slim bar above the tab bar (phone) or a card (desktop). */
export function MiniPlayer() {
  const media = usePlayer((s) => s.media);
  const status = usePlayer((s) => s.status);
  const duration = usePlayer((s) => s.durationMs);
  const { layout } = useLayout();
  const lineRef = useRef<HTMLSpanElement>(null);
  const durationRef = useRef(duration);
  durationRef.current = duration;
  const wide = layout === 'wide';

  useEffect(
    () =>
      onTime((ms) => {
        const d = durationRef.current;
        if (lineRef.current) lineRef.current.style.transform = `scaleX(${d > 0 ? Math.min(1, ms / d) : 0})`;
      }),
    [media?.id],
  );

  const playing = status === 'playing';
  return (
    <AnimatePresence>
      {media && (
        <motion.div
          key="mini"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={spring.soft}
          className={
            wide
              ? 'fixed right-6 bottom-6 z-30 w-[360px] overflow-hidden rounded-2xl border border-line/80 bg-raised/95 shadow-elev-3 backdrop-blur-xl'
              : 'fixed inset-x-3 z-30 overflow-hidden rounded-2xl border border-line/80 bg-raised/95 shadow-elev-2 backdrop-blur-xl'
          }
          style={wide ? undefined : { bottom: 'calc(max(10px, env(safe-area-inset-bottom) - 10px) + 76px)' }}
        >
          <div className="flex items-center gap-3 p-2 pr-2.5">
            <Link to={`/sonus/play/${media.id}`} className="flex min-w-0 flex-1 items-center gap-3" aria-label={`Open ${media.title}`}>
              <Artwork title={media.title} coverBlobId={media.coverBlobId} coverUrl={media.coverUrl} className="w-11" rounded="rounded-lg" />
              <span className="min-w-0">
                <span lang={media.lang} className="block truncate text-[14px] font-semibold">
                  {media.title}
                </span>
                <span className="block truncate text-[12px] text-ink-faint">{status === 'error' ? 'Couldn’t play' : (media.collection ?? media.artist ?? 'Sonus')}</span>
              </span>
            </Link>
            {wide && (
              <button type="button" aria-label="Back 10 seconds" onClick={() => skip(-usePlayer.getState().skipBackSec)} className="grid size-9 place-items-center rounded-full text-ink-soft hover:bg-surface">
                <RotateCcw size={18} aria-hidden />
              </button>
            )}
            <button
              type="button"
              aria-label={playing ? 'Pause' : 'Play'}
              onClick={toggle}
              className="grid size-10 shrink-0 place-items-center rounded-full bg-inverse text-on-inverse transition-transform active:scale-90"
            >
              {status === 'loading' ? <LoaderCircle size={17} className="animate-spin" aria-hidden /> : playing ? <Pause size={17} className="fill-current" aria-hidden /> : <Play size={17} className="translate-x-px fill-current" aria-hidden />}
            </button>
            <button type="button" aria-label="Close the player" onClick={() => void closePlayer()} className="grid size-9 shrink-0 place-items-center rounded-full text-ink-faint hover:bg-surface hover:text-ink">
              <X size={17} aria-hidden />
            </button>
          </div>
          <span className="absolute inset-x-0 bottom-0 h-[2px] bg-line" aria-hidden>
            <span ref={lineRef} className="block h-full origin-left bg-accent" style={{ transform: 'scaleX(0)' }} />
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
