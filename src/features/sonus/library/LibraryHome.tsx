import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight, BookHeadphones, FileAudio, Headphones, Music2, Podcast, Radio, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useBooks } from '@/data/books';
import type { Book } from '@/data/books';
import { BookTile } from './BookGrid';
import { useSavedStations } from '@/data/radio';
import { useRecentSongs, useSavedSongs } from '@/data/songs';
import { episodeMedia } from '@/data/media';
import type { Feed, FeedEpisode, Media, PlaybackProgress, SavedStation, Song } from '@/data/types';
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
import { sonusBase } from '@/features/sonus/paths';

/** A kind of thing in the library, opened as a page of its own (Audiobooks and Stations have tabs). */
export type LibraryView = 'songs' | 'podcasts' | 'episodes' | 'audio';
export const LIBRARY_VIEWS: Record<LibraryView, string> = { songs: 'Songs', podcasts: 'Podcasts', episodes: 'Episodes', audio: 'Your audio' };

const label = 'text-[12px] font-bold tracking-[0.14em] text-ink-faint uppercase';
const enter = (i: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { ...spring.soft, delay: 0.04 * Math.min(i, 6) } });
const TONE = { cantus: 'bg-[var(--cantus-soft)] text-[var(--cantus-text)]', sage: 'bg-sage-soft text-sage-text', accent: 'bg-accent-soft text-accent-text' } as const;

interface LibraryHomeProps {
  lang: string;
  media: Media[];
  /** The learner's own audio and saved episodes, searched and sorted. */
  visible: Media[];
  feeds: Feed[];
  playback?: Map<string, PlaybackProgress>;
  transcribed?: Set<string>;
  /** The kind open as a page of its own, if any. */
  view: LibraryView | null;
  onView: (view: LibraryView) => void;
  onMusic: () => void;
  onPodcasts: () => void;
  onBooks: () => void;
  onRadio: () => void;
}

/** Anything the library holds, as one tile: a song, an episode or your audio, a podcast, a book, a station. */
type Item = { at: number } & ({ song: Song } | { media: Media } | { feed: Feed } | { book: Book } | { station: SavedStation });
const keyOf = (r: Item) => ('song' in r ? `s:${r.song.id}` : 'media' in r ? `m:${r.media.id}` : 'feed' in r ? `f:${r.feed.id}` : 'book' in r ? `b:${r.book.id}` : `r:${r.station.id}`);

/**
 * Sonus › Library, laid out like Apple Music's: what kinds of things you have (each opens a page of
 * its own, or its tab), then what you played lately, what you added lately, and new episodes of the
 * podcasts you follow. Finding new things is Sonus+'s job.
 */
export function LibraryHome({ lang, media, visible, feeds, playback, transcribed, view, onView, onMusic, onPodcasts, onBooks, onRadio }: LibraryHomeProps) {
  const saved = useSavedSongs(lang);
  const recentSongs = useRecentSongs(lang, 12);
  const savedStations = useSavedStations(lang);
  const books = useBooks(lang);
  const stations = useMemo(() => (savedStations ?? []).filter((s) => s.favorite), [savedStations]);
  const navigate = useNavigate();

  const listened = useMemo(() => media.filter((m) => m.kind !== 'video'), [media]);
  const episodes = listened.filter((m) => m.feedId);
  // A book's parts live on its own tab.
  const own = listened.filter((m) => !m.feedId && !m.bookId);

  // Songs, episodes, books and stations played lately, in one row.
  const recent = useMemo<Item[]>(() => {
    const songs = (recentSongs ?? []).map((s) => ({ at: s.lastPlayedAt ?? 0, song: s }));
    const seenBooks = new Set<string>();
    const items = listened
      .filter((m) => m.lastPlayedAt)
      .sort((a, b) => b.lastPlayedAt! - a.lastPlayedAt!)
      .filter((m) => !m.bookId || (!seenBooks.has(m.bookId) && Boolean(seenBooks.add(m.bookId))))
      .map((m) => ({ at: m.lastPlayedAt!, media: m }));
    const radios = (savedStations ?? []).filter((s) => s.playedAt).map((s) => ({ at: s.playedAt!, station: s }));
    return [...songs, ...items, ...radios].sort((a, b) => b.at - a.at).slice(0, 14);
  }, [recentSongs, listened, savedStations]);

  // What was saved, followed or added last, of every kind.
  const added = useMemo<Item[]>(
    () =>
      [
        ...(saved ?? []).map((s) => ({ at: s.savedAt ?? s.createdAt, song: s })),
        ...feeds.map((f) => ({ at: f.createdAt, feed: f })),
        ...(books ?? []).map((b) => ({ at: Math.min(...b.parts.map((p) => p.createdAt)), book: b })),
        ...stations.map((s) => ({ at: s.createdAt, station: s })),
        ...own.map((m) => ({ at: m.createdAt, media: m })),
      ]
        .sort((a, b) => b.at - a.at)
        .slice(0, 12),
    [saved, feeds, books, stations, own],
  );

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

  if (!saved || !recentSongs) return null;
  const openEpisode = async (feed: Feed, episode: FeedEpisode) => navigate(`${sonusBase()}/play/${await episodeMedia(feed, episode)}`);
  const rows = (list: Media[]) => (
    <div className="-mx-2 flex flex-col">
      {list.map((m) => (
        <MediaRow key={m.id} media={m} progress={playback?.get(m.id)} hasTranscript={Boolean(transcribed?.has(m.id))} />
      ))}
    </div>
  );

  if (view === 'songs')
    return (
      <>
        <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-6">
          {saved.map((s, i) => (
            <SongTile key={s.id} song={s} i={i} />
          ))}
        </ul>
        <MoreIn onClick={onMusic}>More music in Sonus+</MoreIn>
      </>
    );
  if (view === 'podcasts')
    return (
      <>
        <PodcastGrid feeds={feeds} />
        <MoreIn onClick={onPodcasts}>Find podcasts in Sonus+</MoreIn>
      </>
    );
  if (view === 'episodes') return rows(visible.filter((m) => m.feedId));
  if (view === 'audio')
    return (
      <>
        {rows(visible.filter((m) => !m.feedId && !m.bookId && m.kind !== 'video'))}
        <AddFiles lang={lang} className="mt-6" />
      </>
    );

  if (!saved.length && !recent.length && !feeds.length && !media.length && !books?.length && !stations.length)
    return (
      <>
        <EmptyLibrary lang={lang} onMusic={onMusic} onPodcasts={onPodcasts} />
        <MundusLink shelf="listen">Podcasts, audiobooks, radio and artists picked for you</MundusLink>
      </>
    );

  const kinds: Array<{ name: string; count: number; icon: LucideIcon; tone: keyof typeof TONE; open: () => void }> = [
    { name: 'Songs', count: saved.length, icon: Music2, tone: 'cantus', open: () => onView('songs') },
    { name: 'Podcasts', count: feeds.length, icon: Podcast, tone: 'sage', open: () => onView('podcasts') },
    { name: 'Episodes', count: episodes.length, icon: Headphones, tone: 'sage', open: () => onView('episodes') },
    { name: 'Audiobooks', count: books?.length ?? 0, icon: BookHeadphones, tone: 'accent', open: onBooks },
    { name: 'Stations', count: stations.length, icon: Radio, tone: 'accent', open: onRadio },
    { name: 'Your audio', count: own.length, icon: FileAudio, tone: 'accent', open: () => onView('audio') },
  ];

  return (
    <div className="space-y-10">
      <nav aria-label="Your library by kind">
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {kinds
            .filter((k) => k.count > 0)
            .map((k, i) => (
              <motion.li key={k.name} {...enter(i)}>
                <button
                  type="button"
                  onClick={k.open}
                  className="group flex w-full items-center gap-2.5 rounded-2xl border border-line/70 bg-surface p-2.5 text-left transition-transform duration-150 hover:border-line-strong active:scale-[0.98] lg:flex-col lg:items-start lg:gap-4 lg:p-4"
                >
                  <span className={cx('grid size-10 shrink-0 place-items-center rounded-xl', TONE[k.tone])}>
                    <k.icon size={19} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-semibold">{k.name}</span>
                    <span className="block text-[12.5px] text-ink-faint tabular-nums">{k.count}</span>
                  </span>
                </button>
              </motion.li>
            ))}
        </ul>
      </nav>

      {recent.length > 0 && (
        <Shelf title="Recently played">
          <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">
            {recent.map((r) => (
              <li key={keyOf(r)} className="w-32 shrink-0 snap-start sm:w-36">
                <ItemTile item={r} lang={lang} playback={playback} />
              </li>
            ))}
          </ul>
        </Shelf>
      )}

      {added.length > 0 && (
        <Shelf title="Recently added">
          <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-6">
            {added.map((r, i) => (
              <motion.li key={keyOf(r)} {...enter(i)} className="min-w-0">
                <ItemTile item={r} lang={lang} playback={playback} />
              </motion.li>
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

      <MundusLink shelf="listen" className="mt-2">
        Podcasts, audiobooks, radio and artists picked for you
      </MundusLink>
    </div>
  );
}

function Shelf({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className={cx(label, 'mb-3')}>{title}</h2>
      {children}
    </section>
  );
}

const art = 'block w-full transition-transform group-active:scale-[0.97]';

/** One tile, whatever it is: its artwork, its name, and what kind of thing it is. */
function ItemTile({ item, lang, playback }: { item: Item; lang: string; playback?: Map<string, PlaybackProgress> }) {
  const navigate = useNavigate();
  const onAir = usePlayer((p) => (p.media?.kind === 'radio' ? p.media.id : null));
  if ('book' in item) return <BookTile book={item.book} progress={playback} />;
  if ('station' in item) {
    const s = item.station;
    // A station plays from where it is now, and opens full screen.
    return (
      <button
        type="button"
        onClick={() => {
          if (onAir !== stationMediaId(s.id)) playStation(s, lang);
          navigate(`${sonusBase()}/station/${s.id}`);
        }}
        className="group block w-full text-left"
      >
        <span className="relative block">
          <Artwork title={s.name} coverUrl={s.favicon} className={art} rounded="rounded-xl" />
          <span className="absolute top-2 left-2 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.08em] text-white uppercase backdrop-blur-sm">Live</span>
        </span>
        <TileText title={s.name} sub={stationPlace(s) ?? 'Radio'} icon={Radio} />
      </button>
    );
  }
  if ('song' in item)
    return (
      <Link to={`/sonus/song/${encodeURIComponent(item.song.id)}`} className="group block">
        <SongArt url={item.song.artworkUrl} title={item.song.title} className={art} rounded="rounded-xl" size={300} />
        <TileText title={item.song.title} sub={item.song.artist} icon={Music2} cantus />
      </Link>
    );
  if ('feed' in item)
    return (
      <Link to={`${sonusBase()}/podcast/${item.feed.id}`} className="group block">
        <Artwork title={item.feed.title} coverUrl={item.feed.imageUrl} className={art} rounded="rounded-xl" />
        <TileText title={item.feed.title} sub={item.feed.author ?? 'Podcast'} icon={Podcast} />
      </Link>
    );
  const m = item.media;
  if (m.bookId)
    return (
      <Link to={`${sonusBase()}/book/${m.bookId}`} className="group block">
        <Artwork title={m.collection ?? m.title} coverBlobId={m.coverBlobId} coverUrl={m.coverUrl} className={art} rounded="rounded-xl" />
        <TileText title={m.collection ?? m.title} sub={m.title} icon={BookHeadphones} lang={m.lang} />
      </Link>
    );
  return (
    <Link to={`${sonusBase()}/play/${m.id}`} className="group block">
      <Artwork title={m.title} coverBlobId={m.coverBlobId} coverUrl={m.coverUrl} className={art} rounded="rounded-xl" />
      <TileText title={m.title} sub={m.collection ?? m.artist ?? 'Audio'} icon={m.feedId ? Podcast : Headphones} lang={m.lang} />
    </Link>
  );
}

function TileText({ title, sub, icon: Icon, lang, cantus }: { title: string; sub: string; icon: LucideIcon; lang?: string; cantus?: boolean }) {
  return (
    <>
      <span lang={lang} className="mt-1.5 block truncate text-[13.5px] font-semibold">
        {title}
      </span>
      <span className="flex items-center gap-1 truncate text-[12.5px] text-ink-soft">
        <Icon size={12} className={cx('shrink-0', cantus ? 'text-[var(--cantus-text)]' : 'text-sage-text')} aria-hidden /> {sub}
      </span>
    </>
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

/** Below a kind's own page: where to find more of it. */
function MoreIn({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cx(buttonClasses('secondary', 'md'), 'mt-8')}>
      {children} <ArrowRight size={16} aria-hidden />
    </button>
  );
}

function AddFiles({ lang, className }: { lang: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        const files = await pickFiles(AUDIO_ACCEPT);
        if (files.length) await importAudioFiles(lang, files);
      }}
      className={cx(buttonClasses('secondary', 'md'), className)}
    >
      <FileAudio size={17} aria-hidden /> Add audio files
    </button>
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
        <AddFiles lang={lang} />
      </div>
    </Card>
  );
}
