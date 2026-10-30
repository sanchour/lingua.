import { UiText, useUi } from '@/design/i18n/UiText';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight, BookHeadphones, Clapperboard, FileAudio, Film, Headphones, MonitorPlay, Music2, Podcast, Radio, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useBooks } from '@/data/books';
import type { Book } from '@/data/books';
import { BookTile } from './BookGrid';
import { useSavedStations } from '@/data/radio';
import { useRecentSongs, useSavedSongs } from '@/data/songs';
import { episodeMedia } from '@/data/media';
import type { MediaShow } from '@/data/settings';
import type { Feed, FeedEpisode, Media, PlaybackProgress, SavedStation, Song } from '@/data/types';
import { useTrackIndex } from '@/data/video';
import { formatDuration } from '@/core/audio/cues';
import { buttonClasses, Card, Segmented } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { pickFiles } from '@/services/files/files';
import { usePlayer } from '@/services/audio/engine';
import { playStation, stationMediaId } from '@/services/radio/play';
import { stationPlace } from '@/services/radio/stations';
import { AUDIO_ACCEPT, importAudioFiles } from '@/services/sonus/files';
import { SongArt } from '@/features/cantus/SongArt';
import { AddVideoMenu } from '@/features/visio/library/AddVideoMenu';
import { Poster } from '@/features/visio/library/Poster';
import { VideoCard } from '@/features/visio/library/VideoCard';
import { EpisodeRow } from '../FeedPage';
import { AddMenu } from './AddMenu';
import { Artwork } from './Artwork';
import { MediaRow } from './MediaRow';
import { PodcastGrid } from './PodcastGrid';
import { sonusBase } from '@/features/sonus/paths';

/** A kind of thing in the library, opened as a page of its own (Audiobooks and Stations have tabs). */
export type LibraryView = 'songs' | 'podcasts' | 'episodes' | 'audio' | 'films' | 'videos';
export const LIBRARY_VIEWS: Record<LibraryView, string> = { songs: 'Songs', podcasts: 'Podcasts', episodes: 'Episodes', audio: 'Your audio', films: 'Films & series', videos: 'Videos' };

const label = 'text-[12px] font-bold tracking-[0.14em] text-ink-faint uppercase';
const enter = (i: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { ...spring.soft, delay: 0.04 * Math.min(i, 6) } });
const TONE = { cantus: 'bg-[var(--cantus-soft)] text-[var(--cantus-text)]', sage: 'bg-sage-soft text-sage-text', accent: 'bg-accent-soft text-accent-text' } as const;

/** A video you added as a file (or its subtitles only) is a film or an episode; one from a link is a video. */
const isVideo = (m: Media) => m.kind === 'video';
const isLinkVideo = (m: Media) => isVideo(m) && Boolean(m.remoteUrl);

interface LibraryHomeProps {
  lang: string;
  media: Media[];
  /** Everything in the library, searched and sorted. */
  visible: Media[];
  feeds: Feed[];
  playback?: Map<string, PlaybackProgress>;
  transcribed?: Set<string>;
  /** The kind open as a page of its own, if any. */
  view: LibraryView | null;
  onView: (view: LibraryView | null) => void;
  show: MediaShow;
  onShow?: (show: MediaShow) => void;
  /** The bar above the shelves (title, search, sort), and search results in their place. */
  toolbar: ReactNode;
  results: ReactNode | null;
  onMusic: () => void;
  onPodcasts: () => void;
  onBooks: () => void;
  onRadio: () => void;
}

/** Anything the library holds, as one tile: a song, an episode, your audio or a video, a podcast, a book, a station. */
type Item = { at: number } & ({ song: Song } | { media: Media } | { feed: Feed } | { book: Book } | { station: SavedStation });
const keyOf = (r: Item) => ('song' in r ? `s:${r.song.id}` : 'media' in r ? `m:${r.media.id}` : 'feed' in r ? `f:${r.feed.id}` : 'book' in r ? `b:${r.book.id}` : `r:${r.station.id}`);
const watched = (r: Item) => 'media' in r && isVideo(r.media);

/**
 * Sonus et Visio › Library (Lingua 5.1-1), laid out like Apple Music's: on the left a sticky rail
 * with All · Listen · Watch and the kinds of things you have; on the right what you're in the
 * middle of, what you played and added lately, new episodes and what's waiting to be watched.
 * Finding new things is Sonus+'s and Mundus's job.
 */
export function LibraryHome({ lang, media, visible, feeds, playback, transcribed, view, onView, show, onShow, toolbar, results, onMusic, onPodcasts, onBooks, onRadio }: LibraryHomeProps) {
  const translateUi = useUi();
  const saved = useSavedSongs(lang);
  const recentSongs = useRecentSongs(lang, 12);
  const savedStations = useSavedStations(lang);
  const books = useBooks(lang);
  const tracks = useTrackIndex();
  const stations = useMemo(() => (savedStations ?? []).filter((s) => s.favorite), [savedStations]);
  const navigate = useNavigate();

  const listened = useMemo(() => media.filter((m) => !isVideo(m)), [media]);
  const videos = useMemo(() => media.filter(isVideo), [media]);
  const episodes = listened.filter((m) => m.feedId);
  // A book's parts live on its own tab.
  const own = listened.filter((m) => !m.feedId && !m.bookId);
  const listen = show !== 'watch';
  const watch = show !== 'listen';
  const fits = (r: Item) => (watched(r) ? watch : listen);

  // What you're in the middle of, audio and video together.
  const loaded = usePlayer((s) => (s.media?.kind === 'radio' ? null : s.media));
  const going = useMemo(() => {
    const seenBooks = new Set<string>();
    const started = media
      .filter((m) => m.kind !== 'spotify' && m.lastPlayedAt && !playback?.get(m.id)?.completed && (playback?.get(m.id)?.positionMs ?? 0) > 5000)
      .sort((a, b) => b.lastPlayedAt! - a.lastPlayedAt!);
    const list = loaded && loaded.kind !== 'spotify' ? [loaded, ...started.filter((m) => m.id !== loaded.id)] : started;
    return list
      .filter((m) => !m.bookId || (!seenBooks.has(m.bookId) && Boolean(seenBooks.add(m.bookId))))
      .filter((m) => (isVideo(m) ? watch : listen))
      .slice(0, 10);
  }, [media, playback, loaded, listen, watch]);

  // Songs, episodes, books, stations and videos played lately, in one row.
  const recent = useMemo<Item[]>(() => {
    const songs = (recentSongs ?? []).map((s) => ({ at: s.lastPlayedAt ?? 0, song: s }));
    const seenBooks = new Set<string>();
    const items = media
      .filter((m) => m.lastPlayedAt && m.kind !== 'radio')
      .sort((a, b) => b.lastPlayedAt! - a.lastPlayedAt!)
      .filter((m) => !m.bookId || (!seenBooks.has(m.bookId) && Boolean(seenBooks.add(m.bookId))))
      .map((m) => ({ at: m.lastPlayedAt!, media: m }));
    const radios = (savedStations ?? []).filter((s) => s.playedAt).map((s) => ({ at: s.playedAt!, station: s }));
    return [...songs, ...items, ...radios].sort((a, b) => b.at - a.at);
  }, [recentSongs, media, savedStations]);

  // What was saved, followed or added last, of every kind.
  const added = useMemo<Item[]>(
    () =>
      [
        ...(saved ?? []).map((s) => ({ at: s.savedAt ?? s.createdAt, song: s })),
        ...feeds.map((f) => ({ at: f.createdAt, feed: f })),
        ...(books ?? []).map((b) => ({ at: Math.min(...b.parts.map((p) => p.createdAt)), book: b })),
        ...stations.map((s) => ({ at: s.createdAt, station: s })),
        ...own.map((m) => ({ at: m.createdAt, media: m })),
        ...videos.map((m) => ({ at: m.createdAt, media: m })),
      ].sort((a, b) => b.at - a.at),
    [saved, feeds, books, stations, own, videos],
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
  const relevantMedia = show === 'listen' ? listened : show === 'watch' ? videos : media;
  if (!saved.length && !feeds.length && !relevantMedia.length && !books?.length && !stations.length) return <EmptyLibrary lang={lang} onDiscover={onPodcasts} />;

  const openEpisode = async (feed: Feed, episode: FeedEpisode) => navigate(`${sonusBase()}/play/${await episodeMedia(feed, episode)}`);
  const rows = (list: Media[]) => (
    <div className="-mx-2 flex flex-col">
      {list.map((m) => (
        <MediaRow key={m.id} media={m} progress={playback?.get(m.id)} hasTranscript={Boolean(transcribed?.has(m.id))} />
      ))}
    </div>
  );
  const videoGrid = (list: Media[]) => (
    <ul className="grid grid-cols-1 gap-x-5 gap-y-7 min-[480px]:grid-cols-2 xl:grid-cols-3">
      {list.map((m, i) => (
        <motion.li key={m.id} {...enter(i)}>
          <VideoCard media={m} progress={playback?.get(m.id)} roles={tracks?.get(m.id)} />
        </motion.li>
      ))}
    </ul>
  );

  const kinds: Array<{ name: string; count: number; icon: LucideIcon; tone: keyof typeof TONE; view?: LibraryView; open: () => void; watch?: boolean }> = [
    { name: 'Songs', count: saved.length, icon: Music2, tone: 'cantus', view: 'songs', open: () => onView('songs') },
    { name: 'Podcasts', count: feeds.length, icon: Podcast, tone: 'sage', view: 'podcasts', open: () => onView('podcasts') },
    { name: 'Episodes', count: episodes.length, icon: Headphones, tone: 'sage', view: 'episodes', open: () => onView('episodes') },
    { name: 'Audiobooks', count: books?.length ?? 0, icon: BookHeadphones, tone: 'accent', open: onBooks },
    { name: 'Stations', count: stations.length, icon: Radio, tone: 'accent', open: onRadio },
    { name: 'Your audio', count: own.length, icon: FileAudio, tone: 'accent', view: 'audio', open: () => onView('audio') },
    { name: 'Films & series', count: videos.filter((m) => !isLinkVideo(m)).length, icon: Film, tone: 'accent', view: 'films', open: () => onView('films'), watch: true },
    { name: 'Videos', count: videos.filter(isLinkVideo).length, icon: MonitorPlay, tone: 'sage', view: 'videos', open: () => onView('videos'), watch: true },
  ];
  const shown = kinds.filter((k) => k.count > 0 && (k.watch ? watch : listen));

  let main: ReactNode;
  if (view === 'songs')
    main = (
      <>
        <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 xl:grid-cols-5">
          {saved.map((s, i) => (
            <SongTile key={s.id} song={s} i={i} />
          ))}
        </ul>
        <MoreIn onClick={onMusic}><UiText source={'More music in Sonus+'} /></MoreIn>
      </>
    );
  else if (view === 'podcasts')
    main = (
      <>
        <PodcastGrid feeds={feeds} />
        <MoreIn onClick={onPodcasts}><UiText source={'Find podcasts in Sonus+'} /></MoreIn>
      </>
    );
  else if (view === 'episodes') main = rows(visible.filter((m) => m.feedId));
  else if (view === 'audio')
    main = (
      <>
        {rows(visible.filter((m) => !m.feedId && !m.bookId && !isVideo(m)))}
        <AddFiles lang={lang} className="mt-6" />
      </>
    );
  else if (view === 'films' || view === 'videos') main = videoGrid(visible.filter((m) => isVideo(m) && isLinkVideo(m) === (view === 'videos')));
  else if (show === 'watch' && !videos.length) main = <EmptyWatch lang={lang} />;
  else {
    const played = recent.filter(fits).slice(0, 14);
    const latest = added.filter(fits).slice(0, 12);
    const toWatch = watch ? videos.filter((m) => !m.lastPlayedAt).slice(0, 6) : [];
    main = (
      <div className="space-y-10">
        {going.length > 0 && (
          <Shelf title={translateUi('Continue')}>
            <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">
              {going.map((m) => (
                <li key={m.id} className="w-[296px] shrink-0 snap-start">
                  <ContinueTile media={m} progress={playback?.get(m.id)} />
                </li>
              ))}
            </ul>
          </Shelf>
        )}

        {played.length > 0 && (
          <Shelf title={translateUi('Recently played')}>
            <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">
              {played.map((r) => (
                <li key={keyOf(r)} className="w-32 shrink-0 snap-start sm:w-36">
                  <ItemTile item={r} lang={lang} playback={playback} />
                </li>
              ))}
            </ul>
          </Shelf>
        )}

        {latest.length > 0 && (
          <Shelf title={translateUi('Recently added')}>
            <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 xl:grid-cols-6">
              {latest.map((r, i) => (
                <motion.li key={keyOf(r)} {...enter(i)} className="min-w-0">
                  <ItemTile item={r} lang={lang} playback={playback} />
                </motion.li>
              ))}
            </ul>
          </Shelf>
        )}

        {listen && fresh.length > 0 && (
          <Shelf title={translateUi('New episodes')}>
            <div className="-mx-2 flex flex-col">
              {fresh.map(({ feed, episode }) => (
                <EpisodeRow key={`${feed.id}:${episode.guid}`} feed={feed} episode={episode} onOpen={() => void openEpisode(feed, episode)} />
              ))}
            </div>
          </Shelf>
        )}

        {toWatch.length > 0 && <Shelf title={translateUi('To watch')}>{videoGrid(toWatch)}</Shelf>}
      </div>
    );
  }

  return (
    <div className={cx('grid gap-8', (onShow || shown.length > 0) && 'lg:grid-cols-[212px_minmax(0,1fr)] lg:gap-10')}>
      {(onShow || shown.length > 0) && (
        <aside className="space-y-5 lg:sticky lg:top-12 lg:self-start">
          {onShow && (
            <Segmented<MediaShow>
              block
              label={translateUi('Show')}
              value={show}
              onChange={onShow}
              options={[
                { value: 'all', label: translateUi('All') },
                { value: 'listen', label: translateUi('Listen') },
                { value: 'watch', label: translateUi('Watch') },
              ]}
            />
          )}
          {shown.length > 0 && (
            <nav aria-label={translateUi('Your library by kind')}>
              <p className={cx(label, 'mb-2 hidden px-2 lg:block')}><UiText source={'Your library'} /></p>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1 lg:gap-0.5">
                {shown.map((k, i) => {
                  const active = Boolean(k.view) && view === k.view;
                  return (
                    <motion.li key={k.name} {...enter(i)}>
                      <button
                        type="button"
                        aria-current={active ? 'page' : undefined}
                        onClick={active ? () => onView(null) : k.open}
                        className={cx(
                          'group flex w-full items-center gap-2.5 rounded-2xl border p-2.5 text-left transition-colors lg:rounded-xl lg:border-transparent lg:px-2 lg:py-1.5',
                          active ? 'border-line-strong bg-raised shadow-elev-1' : 'border-line/70 bg-surface hover:border-line-strong lg:bg-transparent lg:hover:bg-raised/70',
                        )}
                      >
                        <span className={cx('grid size-9 shrink-0 place-items-center rounded-xl lg:size-8 lg:rounded-lg', TONE[k.tone])}>
                          <k.icon size={17} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold">{k.name}</span>
                        <span className="text-[12.5px] text-ink-faint tabular-nums">{k.count}</span>
                      </button>
                    </motion.li>
                  );
                })}
              </ul>
            </nav>
          )}
        </aside>
      )}
      <div className="min-w-0">
        {toolbar}
        {results ?? main}
      </div>
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

/** Something half-finished: its artwork or poster, and how much is left. */
function ContinueTile({ media, progress }: { media: Media; progress?: PlaybackProgress }) {
  const translateUi = useUi();
  const video = isVideo(media);
  const share = progress && media.durationMs ? Math.min(1, progress.positionMs / media.durationMs) : 0;
  const to = video ? `/visio/watch/${media.id}` : `${sonusBase()}/play/${media.id}`;
  const title = media.bookId ? (media.collection ?? media.title) : media.title;
  return (
    <Link to={to} className="group flex h-full items-center gap-3 rounded-2xl border border-line/70 bg-surface p-2.5 transition-colors hover:border-line-strong">
      {video ? (
        <Poster title={media.title} coverBlobId={media.coverBlobId} className="w-28 shrink-0 rounded-xl shadow-none" />
      ) : (
        <Artwork title={title} coverBlobId={media.coverBlobId} coverUrl={media.coverUrl} className="w-16 shrink-0" rounded="rounded-xl" />
      )}
      <span className="min-w-0 flex-1">
        <span className={cx('block text-[11px] font-bold tracking-[0.12em] uppercase', video ? 'text-accent-text' : 'text-sage-text')}>{video ? translateUi('Watching') : translateUi('Listening')}</span>
        <span lang={media.lang} className="mt-0.5 line-clamp-2 text-[14px] leading-snug font-semibold">
          {title}
        </span>
        {media.durationMs !== undefined && share > 0 && (
          <span className="mt-1.5 flex items-center gap-2">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-sunken">
              <span className="block h-full origin-left rounded-full bg-accent" style={{ transform: `scaleX(${Math.max(0.02, share)})` }} />
            </span>
            <span className="text-[11.5px] font-semibold text-ink-faint tabular-nums">{formatDuration(media.durationMs - (progress?.positionMs ?? 0))}</span>
          </span>
        )}
      </span>
    </Link>
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
          <span className="absolute top-2 left-2 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.08em] text-white uppercase backdrop-blur-sm"><UiText source={'Live'} /></span>
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
  if (isVideo(m))
    return (
      <Link to={`/visio/watch/${m.id}`} className="group block">
        <span className={cx(art, 'aspect-square')}>
          <Poster title={m.title} coverBlobId={m.coverBlobId} fill className="rounded-xl" />
        </span>
        <TileText title={m.title} sub={m.collection ?? (isLinkVideo(m) ? 'Video' : 'Film')} icon={Clapperboard} lang={m.lang} />
      </Link>
    );
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
    ><UiText source={'{0} Add audio files'} values={[<FileAudio size={17} aria-hidden />]} /></button>
  );
}

/** Nothing yet: one calm card with the two ways in, and what each brings. */
function EmptyLibrary({ lang, onDiscover }: { lang: string; onDiscover: () => void }) {
  return (
    <Card className="flex flex-col items-center px-6 py-8 text-center sm:py-10">
      <div className="mb-5 flex gap-2">
        <span className="grid size-14 place-items-center rounded-2xl bg-sage-soft text-sage-text">
          <Headphones size={26} aria-hidden />
        </span>
        <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent-text">
          <Clapperboard size={26} aria-hidden />
        </span>
      </div>
      <h2 className="font-serif text-2xl font-semibold"><UiText source={'Everything you listen to and watch'} /></h2>
      <div className="mt-6 grid max-w-2xl gap-4 text-left sm:grid-cols-2">
        <div className="rounded-2xl border border-line p-4">
          <AddMenu lang={lang} onDiscover={onDiscover} label="Listen" />
          <p className="mt-3 text-[14px] leading-relaxed text-ink-soft"><UiText source={'Podcasts, audiobooks, your own audio, Spotify links and radio, with transcripts that follow along.'} /></p>
        </div>
        <div className="rounded-2xl border border-line p-4">
          <AddVideoMenu lang={lang} label="Watch" />
          <p className="mt-3 text-[14px] leading-relaxed text-ink-soft"><UiText source={'Films and episodes with subtitles in both languages, videos from a link, and subtitles alone.'} /></p>
        </div>
      </div>
    </Card>
  );
}

/** Watch, with nothing to watch yet. */
function EmptyWatch({ lang }: { lang: string }) {
  return (
    <Card className="flex flex-col items-center px-6 py-8 text-center sm:py-10">
      <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent-text">
        <Clapperboard size={26} aria-hidden />
      </div>
      <h2 className="font-serif text-2xl font-semibold"><UiText source={'Nothing to watch yet'} /></h2>
      <p className="mt-2 max-w-md text-[15px] leading-relaxed text-ink-soft"><UiText source={'Add a film or an episode with its subtitles, or let Whisper write them. Every word on screen can be looked up, and any line can become a flashcard that replays its clip.'} /></p>
      <div className="mt-6">
        <AddVideoMenu lang={lang} label="Watch" />
      </div>
      <p className="mt-6 flex items-center gap-1.5 text-[13px] text-ink-faint"><UiText source={'{0} Shows on your streaming services are in the Streaming tab.'} values={[<Search size={14} aria-hidden />]} /></p>
    </Card>
  );
}
