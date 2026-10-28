import { memo } from 'react';
import { Link } from 'react-router';
import { Captions, Subtitles } from 'lucide-react';
import { formatDuration } from '@/core/audio/cues';
import type { Media, PlaybackProgress } from '@/data/types';
import type { TrackRole } from '@/data/video';
import { cx } from '@/lib/cx';
import { useJobs } from '@/services/sonus/jobs';
import { Poster } from './Poster';
import { VideoOptions } from './VideoOptions';

/** A video in Sonus et Visio: its poster, how far you got, and which subtitles it has. */
export const VideoCard = memo(function VideoCard({ media, progress, roles }: { media: Media; progress?: PlaybackProgress; roles?: Set<TrackRole> }) {
  const transcribing = useJobs((s) => s.transcribing[media.id]);
  const translating = useJobs((s) => s.translating[media.id]);
  const share = progress && media.durationMs ? (progress.completed ? 1 : progress.positionMs / media.durationMs) : 0;
  const subtitlesOnly = !media.blobId && !media.remoteUrl;
  const busy = transcribing !== undefined ? 'Making subtitles…' : translating !== undefined ? `Translating ${Math.round(translating * 100)}%` : null;

  return (
    <div className="group">
      <Link to={`/visio/watch/${media.id}`} className="block" aria-label={`Watch ${media.title}`}>
        <Poster title={media.title} coverBlobId={media.coverBlobId} coverUrl={media.coverUrl} className="transition-transform duration-200 group-hover:-translate-y-0.5">
          {media.durationMs !== undefined && (
            <span className="absolute right-2 bottom-2 rounded-md bg-black/65 px-1.5 py-0.5 text-[11.5px] font-semibold text-white tabular-nums">{formatDuration(media.durationMs)}</span>
          )}
          {subtitlesOnly && (
            <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold text-white">
              <Captions size={12} aria-hidden /> Subtitles only
            </span>
          )}
          {share > 0 && (
            <span className="absolute inset-x-0 bottom-0 h-1 bg-black/35" aria-hidden>
              <span className="block h-full origin-left bg-accent" style={{ transform: `scaleX(${share})` }} />
            </span>
          )}
        </Poster>
      </Link>
      <div className="mt-2.5 flex items-start gap-2">
        <Link to={`/visio/watch/${media.id}`} className="min-w-0 flex-1">
          <p lang={media.lang} className="line-clamp-2 text-[15px] leading-snug font-semibold">
            {media.title}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-faint">
            {media.collection && <span className="truncate">{media.collection}</span>}
            <TrackPill on={roles?.has('target')} label={media.lang.toUpperCase()} />
            <TrackPill on={roles?.has('native')} label="EN" />
            {progress?.completed ? <span>Watched</span> : null}
            {busy && <span className="font-semibold text-accent-text">{busy}</span>}
          </p>
        </Link>
        <VideoOptions media={media} />
      </div>
    </div>
  );
});

function TrackPill({ on, label }: { on?: boolean; label: string }) {
  return (
    <span
      className={cx('inline-flex items-center gap-0.5 rounded px-1 py-px text-[10.5px] font-bold tracking-wide', on ? 'bg-sage-soft text-sage-text' : 'bg-sunken text-ink-faint line-through decoration-1')}
      title={on ? `${label} subtitles` : `No ${label} subtitles yet`}
    >
      <Subtitles size={11} aria-hidden /> {label}
    </span>
  );
}
