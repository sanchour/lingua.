import { memo } from 'react';
import { Link } from 'react-router';
import { Captions, CloudCheck, Pause, Play } from 'lucide-react';
import { formatDuration } from '@/core/audio/cues';
import type { Media, PlaybackProgress } from '@/data/types';
import { cx } from '@/lib/cx';
import { loadMedia, toggle, unlockAudio, usePlayer } from '@/services/audio/engine';
import { useJobs } from '@/services/sonus/jobs';
import { Artwork } from './Artwork';
import { MediaOptions } from './MediaOptions';

const dateFmt = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' });

interface MediaRowProps {
  media: Media;
  progress?: PlaybackProgress;
  hasTranscript: boolean;
  /** Hide the podcast name (on the podcast's own page). */
  inFeed?: boolean;
}

/** One listening item: artwork, details, progress, and a play button that doesn't leave the page. */
export const MediaRow = memo(function MediaRow({ media, progress, hasTranscript, inFeed = false }: MediaRowProps) {
  const current = usePlayer((s) => s.media?.id === media.id);
  const playing = usePlayer((s) => s.media?.id === media.id && s.status === 'playing');
  const downloading = useJobs((s) => s.downloads[media.id]);
  const transcribing = useJobs((s) => s.transcribing[media.id]);
  const spotify = media.kind === 'spotify';
  const share = progress && media.durationMs ? (progress.completed ? 1 : progress.positionMs / media.durationMs) : 0;
  const left = progress && media.durationMs && !progress.completed && progress.positionMs > 0 ? media.durationMs - progress.positionMs : 0;

  const details = [
    !inFeed && (media.collection ?? media.artist),
    media.publishedAt && dateFmt.format(media.publishedAt),
    spotify ? 'Spotify' : left > 60_000 ? `${formatDuration(left)} left` : media.durationMs ? formatDuration(media.durationMs) : null,
    progress?.completed ? 'Played' : null,
  ].filter(Boolean);

  return (
    <div className={cx('group flex items-center gap-3.5 rounded-2xl px-2 py-2 transition-colors', current ? 'bg-accent-soft/60' : 'hover:bg-surface/70')}>
      <Link to={`/sonus/play/${media.id}`} className="flex min-w-0 flex-1 items-center gap-3.5">
        <Artwork title={media.title} coverBlobId={media.coverBlobId} coverUrl={media.coverUrl} className="w-14" />
        <span className="min-w-0 flex-1">
          <span lang={media.lang} className="line-clamp-2 text-[15px] leading-snug font-semibold">
            {media.title}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-ink-faint">
            <span className="truncate">{details.join(' · ')}</span>
            {hasTranscript && <Captions size={14} className="shrink-0 text-sage-text" aria-label="Has a transcript" />}
            {media.remoteUrl && media.blobId && <CloudCheck size={14} className="shrink-0 text-sage-text" aria-label="Saved offline" />}
          </span>
          {(downloading !== undefined || transcribing !== undefined) && (
            <span className="mt-1 block text-[12px] font-semibold text-accent-text">
              {downloading !== undefined ? `Downloading ${Math.round(downloading * 100)}%` : 'Transcribing…'}
            </span>
          )}
          {share > 0 && share < 1 && (
            <span className="mt-1.5 block h-1 w-full max-w-48 overflow-hidden rounded-full bg-sunken" aria-hidden>
              <span className="block h-full origin-left rounded-full bg-accent" style={{ transform: `scaleX(${share})` }} />
            </span>
          )}
        </span>
      </Link>
      {!spotify && (
        <button
          type="button"
          aria-label={playing ? `Pause ${media.title}` : `Play ${media.title}`}
          onClick={() => {
            if (current) return toggle();
            unlockAudio();
            void loadMedia(media, { autoplay: true });
          }}
          className={cx(
            'grid size-10 shrink-0 place-items-center rounded-full transition-[transform,background-color] duration-150 active:scale-90',
            current ? 'bg-accent-fill text-on-accent' : 'bg-surface text-ink hover:bg-sunken',
          )}
        >
          {playing ? <Pause size={17} className="fill-current" aria-hidden /> : <Play size={17} className="translate-x-px fill-current" aria-hidden />}
        </button>
      )}
      <MediaOptions media={media} hasTranscript={hasTranscript} />
    </div>
  );
});
