import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ChevronDown, ChevronLeft, LoaderCircle, Play } from 'lucide-react';
import { formatDuration } from '@/core/audio/cues';
import { useBook } from '@/data/books';
import type { Book } from '@/data/books';
import { useMedia, useTranscript } from '@/data/media';
import type { Media, Transcript } from '@/data/types';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { useLayout } from '@/design/hooks/useLayout';
import { cx } from '@/lib/cx';
import { loadMedia, nextSentence, previousSentence, setCues, toggleRepeat, skip, toggle, unlockAudio, usePlayer } from '@/services/audio/engine';
import { Artwork } from '../library/Artwork';
import { MediaOptions } from '../library/MediaOptions';
import { BookBar } from './BookBar';
import { ChapterNow } from './Chapters';
import { KaraokeTranscript } from './KaraokeTranscript';
import { hasBookBar, partLabel } from './labels';
import { Scrubber } from './Scrubber';
import { createSpotifyClock, SpotifyEmbed } from './SpotifyEmbed';
import { NoTranscript, TranscriptBar } from './TranscriptTools';
import { Transport } from './Transport';
import { sonusBase, sonusHome } from '@/features/sonus/paths';
import { OwnWordsButton } from '@/features/production/OwnWords';

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
          <Link to={sonusHome()} className="mt-4 inline-block font-semibold text-accent-text">
            Back to Sonus
          </Link>
        </div>
      </div>
    );
  }
  if (!media || transcript === undefined) return null;
  return media.kind === 'spotify' ? <SpotifyPlayer media={media} transcript={transcript} /> : <AudioPlayer media={media} transcript={transcript} />;
}

function Details({ media, large = false, book, live = false }: { media: Media; large?: boolean; book?: Book | null; live?: boolean }) {
  // A book's part says which part it is (the book's title is in the back link above).
  const part = partLabel(media, book);
  const first = media.bookId ? (part ?? book?.author ?? media.artist) : (media.collection ?? media.artist);
  const meta = [first, media.publishedAt && dateFmt.format(media.publishedAt), media.durationMs && formatDuration(media.durationMs)].filter(Boolean);
  return (
    <div className="min-w-0">
      <h1 lang={media.lang} className={cx('font-serif leading-tight font-semibold tracking-tight', large ? 'text-[26px]' : 'text-[20px]')}>
        {media.title}
      </h1>
      {meta.length > 0 && <p className="mt-1 text-[13.5px] text-ink-soft">{meta.join(' · ')}</p>}
      {(media.chapters?.length ?? 0) > 1 && <ChapterNow media={media} live={live} className="mt-1" />}
    </div>
  );
}

function AudioPlayer({ media, transcript }: { media: Media; transcript: Transcript | null }) {
  const cues = transcript?.cues ?? null;
  const { layout } = useLayout();
  const navigate = useNavigate();
  const loadedId = usePlayer((s) => s.media?.id);
  const loadedBookId = usePlayer((s) => s.media?.bookId);
  const status = usePlayer((s) => s.status);
  const error = usePlayer((s) => s.error);
  const book = useBook(media.bookId);
  const isLoaded = loadedId === media.id;
  const wide = layout === 'wide';
  const scrollRef = useRef<HTMLDivElement>(null);

  // Opening an item gets it ready (without starting it), unless something else is playing.
  useEffect(() => {
    const { media: current, status: s } = usePlayer.getState();
    if (current?.id === media.id || s === 'playing' || s === 'loading') return;
    void loadMedia(media);
  }, [media.id]);

  // A book that was playing here moves on to another part (at a part's end, or with the part
  // buttons): the page follows it, and its controls stay up meanwhile.
  const [playedHere, setPlayedHere] = useState<string | null>(null);
  if (isLoaded && playedHere !== media.id) setPlayedHere(media.id);
  const following = !isLoaded && playedHere === media.id && Boolean(media.bookId) && loadedBookId === media.bookId;
  useEffect(() => {
    if (following && loadedId) navigate(`${sonusBase()}/play/${loadedId}`, { replace: true });
  }, [following, loadedId]);

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

  const bookTitle = book?.title ?? media.collection ?? 'Book';
  const bar = hasBookBar(media, book) ? <BookBar media={media} book={book} live={isLoaded} /> : null;

  const controls = isLoaded || following ? (
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

  // Desktop: one screen that stays put. The artwork takes the room that's left in its column, and
  // only the transcript scrolls.
  if (wide) {
    return (
      <div className="flex h-[calc(100dvh-8rem)] min-h-[520px] flex-col">
        {media.bookId ? (
          <Link to={`${sonusBase()}/book/${media.bookId}`} className="mb-6 inline-flex max-w-full shrink-0 items-center gap-1 self-start text-sm font-semibold text-ink-soft hover:text-ink">
            <ChevronLeft size={16} className="shrink-0" aria-hidden /> <span className="truncate">{bookTitle}</span>
          </Link>
        ) : (
          <Link to={media.feedId ? `${sonusBase()}/podcast/${media.feedId}` : '/cantus/podcasts'} className="mb-6 inline-flex shrink-0 items-center gap-1 self-start text-sm font-semibold text-ink-soft hover:text-ink">
            <ChevronLeft size={16} aria-hidden /> {media.feedId ? media.collection : 'Sonus'}
          </Link>
        )}
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(260px,320px)_minmax(0,1fr)] gap-12">
          <aside className="flex min-h-0 flex-col">
            <div className="min-h-[96px] flex-1 [container-type:size]">
              <Artwork title={media.title} coverBlobId={media.coverBlobId} coverUrl={media.coverUrl} className="block w-[min(100cqw,100cqh)] shadow-elev-2" rounded="rounded-3xl" />
            </div>
            <div className="shrink-0">
              <div className="mt-5 flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <Details media={media} book={book} live={isLoaded} large />
                </div>
                <MediaOptions media={media} hasTranscript={Boolean(cues?.length)} />
              </div>
              {bar && <div className="mt-4">{bar}</div>}
              <div className="mt-6">{controls}</div>
              <OwnWordsButton lang={media.lang} lane="listen" title={media.title} refId={media.id} className="mt-3 -ml-3" />
            </div>
          </aside>
          <section aria-label="Transcript" className="flex min-h-0 min-w-0 flex-col">
            {cues?.length ? (
              <>
                <div className="shrink-0">
                  <TranscriptBar media={media} transcript={transcript!} />
                </div>
                <div ref={scrollRef} className="lyric-scroll -mr-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pt-1 pr-4 pb-16">
                  <KaraokeTranscript media={media} cues={cues} live={isLoaded} scrollRef={scrollRef} />
                </div>
              </>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <NoTranscript media={media} />
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  // Phones: full screen, controls docked at the bottom.
  return (
    <div className="min-h-dvh bg-bg">
      <header className="no-callout sticky top-0 z-20 flex items-center gap-1 bg-bg/90 px-2 pt-safe backdrop-blur-xl">
        <button type="button" aria-label="Close player" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(sonusHome()))} className="grid size-11 place-items-center rounded-xl text-ink-soft">
          <ChevronDown size={24} aria-hidden />
        </button>
        {media.bookId ? (
          <Link to={`${sonusBase()}/book/${media.bookId}`} className="block min-w-0 flex-1 truncate py-3 text-center text-[13px] font-semibold text-ink-soft">
            {bookTitle}
          </Link>
        ) : (
          <p className="min-w-0 flex-1 truncate text-center text-[13px] font-semibold text-ink-soft">{media.collection ?? 'Sonus'}</p>
        )}
        <MediaOptions media={media} hasTranscript={Boolean(cues?.length)} className="grid size-11 place-items-center rounded-xl text-ink-soft" />
      </header>
      <div className="px-5 pb-[calc(env(safe-area-inset-bottom)+230px)]">
        <div className="mt-3 mb-7">
          <div className="flex items-center gap-4">
            <Artwork title={media.title} coverBlobId={media.coverBlobId} coverUrl={media.coverUrl} className="w-24" rounded="rounded-2xl" />
            <Details media={media} book={book} live={isLoaded} />
          </div>
          {bar && <div className="mt-4">{bar}</div>}
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
      <Link to={sonusHome()} className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
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
