import { memo, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Captions, Clapperboard, Film, Pickaxe, Play, Subtitles } from 'lucide-react';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { formatDuration } from '@/core/audio/cues';
import { useMediaList, usePlaybackMap } from '@/data/media';
import type { Media, PlaybackProgress } from '@/data/types';
import { useTrackIndex } from '@/data/video';
import type { TrackRole } from '@/data/video';
import { Button, Card, SearchInput, searchKey } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { useJobs } from '@/services/sonus/jobs';
import { toast } from '@/state/ui';
import { addVideoFiles, AddVideoMenu } from './library/AddVideoMenu';
import { Poster } from './library/Poster';
import { VideoOptions } from './library/VideoOptions';

const enter = (i: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { ...spring.soft, delay: 0.05 * i } });

export default function VisioPage() {
  const { language } = useApp();
  const lang = language.id;
  const videos = useMediaList(lang, 'watch');
  const playback = usePlaybackMap();
  const tracks = useTrackIndex();
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = searchKey(query.trim());
    return (videos ?? []).filter((m) => !q || searchKey(`${m.title} ${m.collection ?? ''}`).includes(q));
  }, [videos, query]);

  const resume = videos?.find((m) => m.lastPlayedAt && !playback?.get(m.id)?.completed && (playback?.get(m.id)?.positionMs ?? 0) > 5000);

  return (
    <>
      <PageHeader title="Visio" actions={<AddVideoMenu lang={lang} />} />
      {videos && !videos.length ? (
        <EmptyVisio lang={lang} />
      ) : (
        <>
          {resume && (
            <motion.div {...enter(0)}>
              <ContinueCard media={resume} progress={playback?.get(resume.id)} />
            </motion.div>
          )}
          {(videos?.length ?? 0) > 6 && (
            <motion.div {...enter(1)} className="mt-8 mb-4 h-11">
              <SearchInput value={query} onChange={setQuery} placeholder="Search videos" />
            </motion.div>
          )}
          <motion.ul {...enter(2)} className={cx('grid grid-cols-1 gap-x-5 gap-y-7 min-[480px]:grid-cols-2 lg:grid-cols-3', (videos?.length ?? 0) > 6 ? '' : 'mt-8')}>
            {visible.map((m) => (
              <li key={m.id}>
                <VideoCard media={m} progress={playback?.get(m.id)} roles={tracks?.get(m.id)} />
              </li>
            ))}
          </motion.ul>
          {videos && query && !visible.length && <p className="py-12 text-center text-ink-soft">Nothing matches “{query.trim()}”.</p>}
        </>
      )}
    </>
  );
}

const VideoCard = memo(function VideoCard({ media, progress, roles }: { media: Media; progress?: PlaybackProgress; roles?: Set<TrackRole> }) {
  const transcribing = useJobs((s) => s.transcribing[media.id]);
  const translating = useJobs((s) => s.translating[media.id]);
  const share = progress && media.durationMs ? (progress.completed ? 1 : progress.positionMs / media.durationMs) : 0;
  const subtitlesOnly = !media.blobId && !media.remoteUrl;
  const busy = transcribing !== undefined ? 'Making subtitles…' : translating !== undefined ? `Translating ${Math.round(translating * 100)}%` : null;

  return (
    <div className="group">
      <Link to={`/visio/watch/${media.id}`} className="block" aria-label={`Watch ${media.title}`}>
        <Poster title={media.title} coverBlobId={media.coverBlobId} className="transition-transform duration-200 group-hover:-translate-y-0.5">
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

function ContinueCard({ media, progress }: { media: Media; progress?: PlaybackProgress }) {
  const share = progress && media.durationMs ? Math.min(1, progress.positionMs / media.durationMs) : 0;
  return (
    <Card className="flex items-center gap-4 p-4 sm:gap-5 sm:p-5">
      <Link to={`/visio/watch/${media.id}`} className="w-32 shrink-0 sm:w-44" aria-label={`Continue ${media.title}`}>
        <Poster title={media.title} coverBlobId={media.coverBlobId} className="rounded-xl" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold tracking-[0.12em] text-accent-text uppercase">Continue watching</p>
        <p lang={media.lang} className="mt-1 line-clamp-2 font-serif text-xl leading-tight font-semibold">
          {media.title}
        </p>
        {media.durationMs && share > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 max-w-48 flex-1 overflow-hidden rounded-full bg-sunken">
              <div className="h-full origin-left rounded-full bg-accent" style={{ transform: `scaleX(${Math.max(0.02, share)})` }} />
            </div>
            <span className="text-xs font-semibold text-ink-faint tabular-nums">{formatDuration(media.durationMs - (progress?.positionMs ?? 0))} left</span>
          </div>
        )}
      </div>
      <Link
        to={`/visio/watch/${media.id}`}
        aria-label="Play"
        className="grid size-14 shrink-0 place-items-center rounded-full bg-inverse text-on-inverse shadow-elev-2 transition-transform duration-150 active:scale-90"
      >
        <Play size={22} className="translate-x-0.5 fill-current" aria-hidden />
      </Link>
    </Card>
  );
}

function EmptyVisio({ lang }: { lang: string }) {
  const navigate = useNavigate();
  return (
    <Card className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-5 grid size-16 place-items-center rounded-2xl bg-accent-soft text-accent-text">
        <Clapperboard size={28} aria-hidden />
      </div>
      <h2 className="font-serif text-2xl font-semibold">Your screening room</h2>
      <p className="mt-2 max-w-md text-[15px] leading-relaxed text-ink-soft">
        Add a film or an episode with its subtitles, or let Whisper write them. Every word on screen can be looked up, and any line can become a flashcard that replays its clip.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button
          icon={Film}
          onClick={() =>
            void addVideoFiles(lang, (id) => navigate(`/visio/watch/${id}`)).catch((e: unknown) => toast(e instanceof Error ? e.message : 'That couldn’t be added.', { tone: 'error' }))
          }
        >
          Add video files
        </Button>
      </div>
      <ul className="mt-8 grid max-w-lg gap-2.5 text-left text-[14px] text-ink-soft sm:grid-cols-2">
        <li className="flex gap-2">
          <Subtitles size={17} className="mt-0.5 shrink-0 text-sage-text" aria-hidden /> Two subtitle lines: the language you learn, and English blurred until you need it
        </li>
        <li className="flex gap-2">
          <Pickaxe size={17} className="mt-0.5 shrink-0 text-sage-text" aria-hidden /> Save words or whole lines to Thesaurus as you watch
        </li>
        <li className="flex gap-2">
          <Captions size={17} className="mt-0.5 shrink-0 text-sage-text" aria-hidden /> No subtitles? Whisper makes them, on Groq or on this device
        </li>
        <li className="flex gap-2">
          <Film size={17} className="mt-0.5 shrink-0 text-sage-text" aria-hidden /> Subtitles only keeps lines and cards while freeing the space
        </li>
      </ul>
    </Card>
  );
}
