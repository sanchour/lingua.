import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { BookHeadphones, ChevronRight, FileAudio, Headphones, Music2, Radio, Search } from 'lucide-react';
import { useBooks } from '@/data/books';
import type { Book } from '@/data/books';
import { useSavedStations } from '@/data/radio';
import { useRecentSongs, useSavedSongs } from '@/data/songs';
import { episodeMedia } from '@/data/media';
import type { Feed, FeedEpisode, Media, PlaybackProgress, Song } from '@/data/types';
import { buttonClasses, Card } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { pickFiles } from '@/services/files/files';
import { usePlayer } from '@/services/audio/engine';
import { playStation, stationMediaId } from '@/services/radio/play';
import { stationPlace } from '@/services/radio/stations';
import { AUDIO_ACCEPT, importAudioFiles } from '@/services/sonus/files';
import { SongArt } from '@/features/cantus/SongArt';
import { EpisodeRow } from '../FeedPage';
import { Artwork } from './Artwork';
import { MediaRow } from './MediaRow';
import { PodcastGrid } from './PodcastGrid';
import { MundusLink } from '@/features/mundus/MundusLink';

const label = 'text-[12px] font-bold tracking-[0.14em] text-ink-faint uppercase';
const enter = (i: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { ...spring.soft, delay: 0.04 * Math.min(i, 6) } });

interface LibraryHomeProps {
  lang: string;
  media: Media[];
  /** The learner's own audio and saved episodes, searched and sorted. */
  visible: Media[];
  feeds: Feed[];
  playback?: Map<string, PlaybackProgress>;
  transcribed?: Set<string>;
  onMusic: () => void;
  onPodcasts: () => void;
  onRadio: () => void;
}

/**
 * Sonus's first page: everything you listen to in the language, music and podcasts together. What
 * you played last first, then your songs, the podcasts you follow and their new episodes, then your
 * own audio. Music and Podcasts have their own tabs, with discovery.
 */
export function LibraryHome({ lang, media, visible, feeds, playback, transcribed, onMusic, onPodcasts, onRadio }: LibraryHomeProps) {
  const saved = useSavedSongs(lang);
  const recentSongs = useRecentSongs(lang, 12);
  const savedStations = useSavedStations(lang);
  const books = useBooks(lang);
  const stations = savedStations?.filter((s) => s.favorite);
  const onAir = usePlayer((p) => (p.media?.kind === 'radio' ? p.media.id : null));
  const navigate = useNavigate();

  // Songs, episodes and stations played lately, in one row.
  const recent = useMemo(() => {
    const songs = (recentSongs ?? []).map((s) => ({ at: s.lastPlayedAt ?? 0, song: s }) as const);
    const seenBooks = new Set<string>();
    const items = media
      .filter((m) => m.lastPlayedAt && m.kind !== 'video')
      .sort((a, b) => b.lastPlayedAt! - a.lastPlayedAt!)
      .filter((m) => !m.bookId || (!seenBooks.has(m.bookId) && Boolean(seenBooks.add(m.bookId))))
      .map((m) => ({ at: m.lastPlayedAt!, media: m }) as const);
    const radios = (savedStations ?? []).filter((s) => s.playedAt).map((s) => ({ at: s.playedAt!, station: s }) as const);
    return [...songs, ...items, ...radios].sort((a, b) => b.at - a.at).slice(0, 14);
  }, [recentSongs, media, savedStations]);

  // The newest episodes of the podcasts you follow.
  const fresh = useMemo(
    () =>
      feeds
        .flatMap((feed) => feed.episodes.slice(0, 4).map((episode) => ({ feed, episode })))
        .filter((e) => e.episode.publishedAt)
        .sort((a, b) => (b.episode.publishedAt ?? 0) - (a.episode.publishedAt ?? 0))
        .slice(0, 5),
    [feeds],
  );

  // A book's parts live on its own shelf.
  const own = visible.filter((m) => !m.bookId);

  if (!saved || !recentSongs) return null;
  if (!saved.length && !recent.length && !feeds.length && !media.length)
    return (
      <>
        <EmptyLibrary lang={lang} onMusic={onMusic} onPodcasts={onPodcasts} />
        <MundusLink shelf="listen">Podcasts, audiobooks, radio and artists picked for you</MundusLink>
      </>
    );

  const openEpisode = async (feed: Feed, episode: FeedEpisode) => navigate(`/sonus/play/${await episodeMedia(feed, episode)}`);

  return (
    <div className="space-y-10">
      {recent.length > 0 && (
        <Shelf title="Recently played">
          <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">
            {recent.map((r) => (
              <li key={'song' in r ? `s:${r.song.id}` : 'station' in r ? `r:${r.station.id}` : `m:${r.media.id}`} className="w-32 shrink-0 snap-start sm:w-36">
                {'station' in r ? (
                  // A station plays from where it is now, and opens full screen.
                  <button
                    type="button"
                    onClick={() => {
                      if (onAir !== stationMediaId(r.station.id)) playStation(r.station, lang);
                      navigate(`/sonus/station/${r.station.id}`);
                    }}
                    className="group block w-full text-left"
                  >
                    <span className="relative block">
                      <Artwork title={r.station.name} coverUrl={r.station.favicon} className="block w-full transition-transform group-active:scale-[0.97]" rounded="rounded-xl" />
                      <span className="absolute top-2 left-2 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.08em] text-white uppercase backdrop-blur-sm">Live</span>
                    </span>
                    <span className="mt-1.5 block truncate text-[13.5px] font-semibold">{r.station.name}</span>
                    <span className="flex items-center gap-1 truncate text-[12.5px] text-ink-soft">
                      <Radio size={12} className="shrink-0 text-sage-text" aria-hidden /> {stationPlace(r.station) ?? 'Radio'}
                    </span>
                  </button>
                ) : 'song' in r ? (
                  <Link to={`/sonus/song/${encodeURIComponent(r.song.id)}`} className="group block">
                    <SongArt url={r.song.artworkUrl} title={r.song.title} className="w-full transition-transform group-active:scale-[0.97]" rounded="rounded-xl" size={300} />
                    <span className="mt-1.5 block truncate text-[13.5px] font-semibold">{r.song.title}</span>
                    <span className="flex items-center gap-1 truncate text-[12.5px] text-ink-soft">
                      <Music2 size={12} className="shrink-0 text-[var(--cantus-text)]" aria-hidden /> {r.song.artist}
                    </span>
                  </Link>
                ) : r.media.bookId ? (
                  <Link to={`/sonus/book/${r.media.bookId}`} className="group block">
                    <Artwork title={r.media.collection ?? r.media.title} coverBlobId={r.media.coverBlobId} coverUrl={r.media.coverUrl} className="block w-full transition-transform group-active:scale-[0.97]" rounded="rounded-xl" />
                    <span lang={r.media.lang} className="mt-1.5 block truncate text-[13.5px] font-semibold">
                      {r.media.collection ?? r.media.title}
                    </span>
                    <span className="flex items-center gap-1 truncate text-[12.5px] text-ink-soft">
                      <BookHeadphones size={12} className="shrink-0 text-sage-text" aria-hidden /> {r.media.title}
                    </span>
                  </Link>
                ) : (
                  <Link to={`/sonus/play/${r.media.id}`} className="group block">
                    <Artwork title={r.media.title} coverBlobId={r.media.coverBlobId} coverUrl={r.media.coverUrl} className="block w-full transition-transform group-active:scale-[0.97]" rounded="rounded-xl" />
                    <span lang={r.media.lang} className="mt-1.5 block truncate text-[13.5px] font-semibold">
                      {r.media.title}
                    </span>
                    <span className="flex items-center gap-1 truncate text-[12.5px] text-ink-soft">
                      <Headphones size={12} className="shrink-0 text-sage-text" aria-hidden /> {r.media.collection ?? r.media.artist ?? 'Audio'}
                    </span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Shelf>
      )}

      <Shelf title="Your songs" more={saved.length ? { label: 'All music', onClick: onMusic } : undefined}>
        {saved.length ? (
          <ul className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 lg:grid-cols-6">
            {saved.slice(0, 12).map((s, i) => (
              <SongTile key={s.id} song={s} i={i} />
            ))}
          </ul>
        ) : (
          <Invite icon={Music2} tone="cantus" title="Songs you love, lyrics and all" detail="Find a song in Music and save it with the heart: it lives here." action="Find music" onClick={onMusic} />
        )}
      </Shelf>

      <Shelf title="Podcasts you follow" more={feeds.length ? { label: 'Find more', onClick: onPodcasts } : undefined}>
        {feeds.length ? (
          <PodcastGrid feeds={feeds} />
        ) : (
          <Invite icon={Headphones} tone="sage" title="Podcasts with a transcript that follows along" detail="Follow one and its new episodes show up here." action="Find a podcast" onClick={onPodcasts} />
        )}
      </Shelf>

      {books && books.length > 0 && (
        <Shelf title="Audiobooks and courses" more={{ label: 'Find more', onClick: () => navigate('/sonus/audiobooks') }}>
          <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">
            {books.map((b) => (
              <li key={b.id} className="w-32 shrink-0 snap-start sm:w-36">
                <BookTile book={b} progress={playback} />
              </li>
            ))}
          </ul>
        </Shelf>
      )}

      {stations && stations.length > 0 && (
        <Shelf title="Your stations" more={{ label: 'All radio', onClick: onRadio }}>
          <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">
            {stations.map((s) => (
              <li key={s.id} className="w-28 shrink-0 snap-start sm:w-32">
                <button type="button" onClick={() => playStation(s, lang)} className="group block w-full text-left">
                  <Artwork title={s.name} coverUrl={s.favicon} className="block w-full transition-transform group-active:scale-[0.97]" rounded="rounded-xl" />
                  <span className="mt-1.5 block truncate text-[13.5px] font-semibold">{s.name}</span>
                  <span className="flex items-center gap-1 truncate text-[12.5px] text-ink-soft">
                    <Radio size={12} className="shrink-0 text-sage-text" aria-hidden /> {stationPlace(s) ?? 'Radio'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Shelf>
      )}

      {fresh.length > 0 && (
        <Shelf title="New episodes">
          <div className="-mx-2 flex flex-col">
            {fresh.map(({ feed, episode }) => (
              <EpisodeRow key={`${feed.id}:${episode.guid}`} feed={feed} episode={episode} onOpen={() => void openEpisode(feed, episode)} />
            ))}
          </div>
        </Shelf>
      )}

      {own.length > 0 && (
        <Shelf title="Your audio">
          <div className="-mx-2 flex flex-col">
            {own.map((m) => (
              <MediaRow key={m.id} media={m} progress={playback?.get(m.id)} hasTranscript={Boolean(transcribed?.has(m.id))} />
            ))}
          </div>
        </Shelf>
      )}

      <MundusLink shelf="listen" className="mt-2">
        Podcasts, audiobooks, radio and artists picked for you
      </MundusLink>
    </div>
  );
}

function BookTile({ book, progress }: { book: Book; progress?: Map<string, PlaybackProgress> }) {
  const where =
    book.kind === 'course'
      ? `${book.done} of ${book.parts.length} lessons done`
      : book.parts.length > 1
        ? `Part ${Math.max(1, book.parts.findIndex((p) => p.lastPlayedAt === book.lastPlayedAt) + 1)} of ${book.parts.length}`
        : progress?.get(book.parts[0].id)?.completed
          ? 'Finished'
          : (book.author ?? 'Audiobook');
  return (
    <Link to={`/sonus/book/${book.id}`} className="group block">
      <Artwork title={book.title} coverBlobId={book.coverBlobId} coverUrl={book.coverUrl} className="block w-full transition-transform group-active:scale-[0.97]" rounded="rounded-xl" />
      <span lang={book.lang} className="mt-1.5 block truncate text-[13.5px] font-semibold">
        {book.title}
      </span>
      <span className="flex items-center gap-1 truncate text-[12.5px] text-ink-soft">
        <BookHeadphones size={12} className="shrink-0 text-sage-text" aria-hidden /> {where}
      </span>
    </Link>
  );
}

function Shelf({ title, more, children }: { title: string; more?: { label: string; onClick: () => void }; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className={cx(label, 'flex-1')}>{title}</h2>
        {more && (
          <button type="button" onClick={more.onClick} className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-ink-soft hover:text-ink">
            {more.label} <ChevronRight size={14} aria-hidden />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function SongTile({ song, i }: { song: Song; i: number }) {
  return (
    <motion.li {...enter(i)} className="min-w-0">
      <Link to={`/sonus/song/${encodeURIComponent(song.id)}`} className="group block">
        <SongArt url={song.artworkUrl} title={song.title} className="song-art w-full transition-transform duration-300 group-hover:-translate-y-0.5 group-active:scale-[0.98]" rounded="rounded-2xl" size={300} />
        <span className="mt-1.5 block truncate text-[13.5px] leading-snug font-semibold">{song.title}</span>
        <span className="block truncate text-[12.5px] text-ink-soft">{song.artist}</span>
      </Link>
    </motion.li>
  );
}

function Invite({ icon: Icon, tone, title, detail, action, onClick }: { icon: typeof Music2; tone: 'cantus' | 'sage'; title: string; detail: string; action: string; onClick: () => void }) {
  return (
    <Card className="flex items-center gap-4 p-4 sm:p-5">
      <span className={cx('grid size-11 shrink-0 place-items-center rounded-2xl', tone === 'cantus' ? 'bg-[var(--cantus-soft)] text-[var(--cantus-text)]' : 'bg-sage-soft text-sage-text')}>
        <Icon size={20} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{title}</span>
        <span className="block text-[13.5px] leading-snug text-ink-soft">{detail}</span>
      </span>
      <button type="button" onClick={onClick} className={cx(buttonClasses('secondary', 'sm'), 'shrink-0')}>
        {action}
      </button>
    </Card>
  );
}

function EmptyLibrary({ lang, onMusic, onPodcasts }: { lang: string; onMusic: () => void; onPodcasts: () => void }) {
  return (
    <Card className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-5 grid size-16 place-items-center rounded-2xl bg-sage-soft text-sage-text">
        <Headphones size={28} aria-hidden />
      </div>
      <h2 className="font-serif text-2xl font-semibold">Your listening room is quiet</h2>
      <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-ink-soft">
        Songs to sing along with, podcasts to follow, free audiobooks, or your own audio: courses, recordings. Lyrics and transcripts light up as they play.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={onMusic} className={buttonClasses('primary', 'md')}>
          <Music2 size={17} aria-hidden /> Find music
        </button>
        <button type="button" onClick={onPodcasts} className={buttonClasses('secondary', 'md')}>
          <Search size={17} aria-hidden /> Find a podcast
        </button>
        <button
          type="button"
          onClick={async () => {
            const files = await pickFiles(AUDIO_ACCEPT);
            if (files.length) await importAudioFiles(lang, files);
          }}
          className={buttonClasses('secondary', 'md')}
        >
          <FileAudio size={17} aria-hidden /> Add audio files
        </button>
      </div>
    </Card>
  );
}
