import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ChevronDown, ChevronLeft, LoaderCircle, Play } from 'lucide-react';
import { formatDuration } from '@/core/audio/cues';
import { useMedia, useTranscript } from '@/data/media';
import type { Media, Transcript } from '@/data/types';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { useLayout } from '@/design/hooks/useLayout';
import { cx } from '@/lib/cx';
import { loadMedia, nextSentence, previousSentence, setCues, toggleRepeat, skip, toggle, unlockAudio, usePlayer } from '@/services/audio/engine';
import { Artwork } from '../library/Artwork';
import { MediaOptions } from '../library/MediaOptions';
import { KaraokeTranscript } from './KaraokeTranscript';
import { Scrubber } from './Scrubber';
import { createSpotifyClock, SpotifyEmbed } from './SpotifyEmbed';
import { NoTranscript, TranscriptBar } from './TranscriptTools';
import { Transport } from './Transport';

const dateFmt = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' });

export default function PlayerPage() {
  const { mediaId } = useParams();
  const media = useMedia(mediaId);
  const transcript = useTranscript(mediaId);

  if (media === null || media?.deletedAt) {
    return (
      <div className="grid min-h-[60dvh] place-items-center text-center">
        <div>
          <p className="font-serif text-xl">This item isn’t in Sonus any more.</p>
          <Link to="/sonus" className="mt-4 inline-block font-semibold text-accent-text">
            Back to Sonus
          </Link>
        </div>
      </div>
    );
  }
  if (!media || transcript === undefined) return null;
  return media.kind === 'spotify' ? <SpotifyPlayer media={media} transcript={transcript} /> : <AudioPlayer media={media} transcript={transcript} />;
}

function Details({ media, large = false }: { media: Media; large?: boolean }) {
  const meta = [media.collection ?? media.artist, media.publishedAt && dateFmt.format(media.publishedAt), media.durationMs && formatDuration(media.durationMs)].filter(Boolean);
  return (
    <div className="min-w-0">
      <h1 lang={media.lang} className={cx('font-serif leading-tight font-semibold tracking-tight', large ? 'text-[26px]' : 'text-[20px]')}>
        {media.title}
      </h1>
      {meta.length > 0 && <p className="mt-1 text-[13.5px] text-ink-soft">{meta.join(' · ')}</p>}
    </div>
  );
}

function AudioPlayer({ media, transcript }: { media: Media; transcript: Transcript | null }) {
  const cues = transcript?.cues ?? null;
  const { layout } = useLayout();
  const navigate = useNavigate();
  const loadedId = usePlayer((s) => s.media?.id);
  const status = usePlayer((s) => s.status);
  const error = usePlayer((s) => s.error);
  const isLoaded = loadedId === media.id;
  const wide = layout === 'wide';

  // Opening an item gets it ready (without starting it), unless something else is playing.
  useEffect(() => {
    const { media: current, status: s } = usePlayer.getState();
    if (current?.id === media.id || s === 'playing' || s === 'loading') return;
    void loadMedia(media);
  }, [media.id]);

  // A new, edited or removed transcript is used straight away.
  useEffect(() => {
    if (isLoaded) setCues(media.id, cues);
  }, [isLoaded, media.id, cues]);

  useHotkeys(
    {
      ' ': toggle,
      arrowleft: () => skip(-usePlayer.getState().skipBackSec),
      arrowright: () => skip(usePlayer.getState().skipFwdSec),
      arrowup: previousSentence,
      arrowdown: nextSentence,
      r: () => toggleRepeat(),
    },
    isLoaded,
  );

  const playThis = () => {
    unlockAudio();
    void loadMedia(media, { autoplay: true });
  };

  const transcriptArea = cues?.length ? (
    <>
      <TranscriptBar media={media} transcript={transcript!} />
      <KaraokeTranscript media={media} cues={cues} live={isLoaded} />
    </>
  ) : (
    <NoTranscript media={media} />
  );

  const controls = isLoaded ? (
    <>
      {status === 'error' && <p className="mb-3 rounded-xl bg-accent-soft px-3 py-2 text-center text-[13px] font-semibold text-accent-text">{error}</p>}
      <Scrubber />
      <Transport className="mt-2" />
    </>
  ) : (
    <button type="button" onClick={playThis} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-inverse font-semibold text-on-inverse shadow-elev-2 transition-transform active:scale-[0.98]">
      {status === 'loading' ? <LoaderCircle size={20} className="animate-spin" aria-hidden /> : <Play size={20} className="fill-current" aria-hidden />}
      Play this instead
    </button>
  );

  if (wide) {
    return (
      <>
        <Link to={media.feedId ? `/sonus/podcast/${media.feedId}` : '/sonus'} className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
          <ChevronLeft size={16} aria-hidden /> {media.feedId ? media.collection : 'Sonus'}
        </Link>
        <div className="grid grid-cols-[minmax(260px,320px)_minmax(0,1fr)] gap-12">
          <aside className="sticky top-10 self-start">
            <Artwork title={media.title} coverBlobId={media.coverBlobId} coverUrl={media.coverUrl} className="w-full shadow-elev-2" rounded="rounded-3xl" />
            <div className="mt-5 flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Details media={media} large />
              </div>
              <MediaOptions media={media} hasTranscript={Boolean(cues?.length)} />
            </div>
            <div className="mt-6">{controls}</div>
          </aside>
          <section aria-label="Transcript" className="min-w-0 pb-24">
            {transcriptArea}
          </section>
        </div>
      </>
    );
  }

  // Phones: full screen, controls docked at the bottom.
  return (
    <div className="min-h-dvh bg-bg">
      <header className="no-callout sticky top-0 z-20 flex items-center gap-1 bg-bg/90 px-2 pt-safe backdrop-blur-xl">
        <button type="button" aria-label="Close player" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/sonus'))} className="grid size-11 place-items-center rounded-xl text-ink-soft">
          <ChevronDown size={24} aria-hidden />
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-[13px] font-semibold text-ink-soft">{media.collection ?? 'Sonus'}</p>
        <MediaOptions media={media} hasTranscript={Boolean(cues?.length)} className="grid size-11 place-items-center rounded-xl text-ink-soft" />
      </header>
      <div className="px-5 pb-[calc(env(safe-area-inset-bottom)+230px)]">
        <div className="mt-3 mb-7 flex items-center gap-4">
          <Artwork title={media.title} coverBlobId={media.coverBlobId} coverUrl={media.coverUrl} className="w-24" rounded="rounded-2xl" />
          <Details media={media} />
        </div>
        {transcriptArea}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/92 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+14px)] backdrop-blur-xl">{controls}</div>
    </div>
  );
}

function SpotifyPlayer({ media, transcript }: { media: Media; transcript: Transcript | null }) {
  const cues = transcript?.cues ?? null;
  const clock = useMemo(createSpotifyClock, [media.id]);
  return (
    <>
      <Link to="/sonus" className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
        <ChevronLeft size={16} aria-hidden /> Sonus
      </Link>
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Details media={media} large />
          </div>
          <MediaOptions media={media} hasTranscript={Boolean(cues?.length)} />
        </div>
        <SpotifyEmbed media={media} clock={clock} />
        <p className="mt-2 text-[12.5px] text-ink-faint">Plays through Spotify. Sign in to Spotify in this browser for full episodes and songs.</p>
        <section aria-label="Transcript" className="mt-10 pb-24">
          {cues?.length ? (
            <>
              <TranscriptBar media={media} transcript={transcript!} />
              <KaraokeTranscript media={media} cues={cues} live clock={clock} />
            </>
          ) : (
            <NoTranscript media={media} />
          )}
        </section>
      </div>
    </>
  );
}
