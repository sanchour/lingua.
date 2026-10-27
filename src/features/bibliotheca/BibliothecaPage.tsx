import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight, BookOpen, ChevronRight, Clapperboard, Compass, Headphones, Layers, Music2, Plus, Podcast, Radio, Search, SearchX } from 'lucide-react';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { formatDuration } from '@/core/audio/cues';
import { getLanguage } from '@/core/lang/languages';
import { useBooks } from '@/data/books';
import { useDeckCounts, useDecks } from '@/data/decks';
import { useAllProgress, useLibrary } from '@/data/library';
import { useFeeds, useMediaList, usePlaybackMap } from '@/data/media';
import { useSavedStations } from '@/data/radio';
import { useSavedSongs } from '@/data/songs';
import { useTrackIndex } from '@/data/video';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { useLayout } from '@/design/hooks/useLayout';
import { buttonClasses, Card, IconButton, SearchInput, searchKey, Segmented } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { SongArt } from '@/features/cantus/SongArt';
import { BookCard } from '@/features/codex/library/BookCard';
import { BookCover } from '@/features/codex/library/BookCover';
import { AddMenu } from '@/features/sonus/library/AddMenu';
import { Artwork } from '@/features/sonus/library/Artwork';
import { AddVideoMenu } from '@/features/visio/library/AddVideoMenu';
import { Poster } from '@/features/visio/library/Poster';
import { VideoCard } from '@/features/visio/library/VideoCard';
import { attachEpub } from '@/services/import/importers';
import { pickFile } from '@/services/files/files';
import { toast } from '@/state/ui';
import type { Text } from '@/data/types';

type KindFilter = 'all' | 'read' | 'listen' | 'watch' | 'cards';

const FILTERS: Array<{ value: KindFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'read', label: 'Reading' },
  { value: 'listen', label: 'Listening' },
  { value: 'watch', label: 'Watching' },
  { value: 'cards', label: 'Vocabulary' },
];

const enter = (i: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { ...spring.soft, delay: 0.04 * Math.min(i, 8) },
});

/**
 * Bibliotheca: one unified library across Codex (reading), Sonus (listening), Visio (watching) and
 * Thesaurus (vocabulary decks). Shows everything you are in the middle of, your shelves by tool,
 * and quick ways to add content or discover new items in Explora.
 */
export default function BibliothecaPage() {
  const { language } = useApp();
  const lang = language.id;
  const langName = getLanguage(lang)?.name ?? lang;
  const navigate = useNavigate();
  const { pointer } = useLayout();
  const [params, setParams] = useSearchParams();
  const askedKind = params.get('kind') as KindFilter | null;
  const filter: KindFilter = askedKind && FILTERS.some((f) => f.value === askedKind) ? askedKind : 'all';
  const setFilter = (next: KindFilter) => setParams(next === 'all' ? {} : { kind: next }, { replace: true });

  const allTexts = useLibrary(lang);
  const texts = useMemo(() => (allTexts ?? []).filter((t) => t.kind !== 'shelfItem'), [allTexts]);
  const progress = useAllProgress();
  const listening = useMediaList(lang);
  const videos = useMediaList(lang, 'watch');
  const feeds = useFeeds(lang);
  const audiobooks = useBooks(lang);
  const songs = useSavedSongs(lang);
  const stations = useSavedStations(lang);
  const playback = usePlaybackMap();
  const tracks = useTrackIndex();
  const decks = useDecks(lang);
  const deckCounts = useDeckCounts(decks);

  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useHotkeys({ '/': () => (searching ? searchRef.current?.focus() : setSearching(true)) }, pointer === 'fine');

  const q = searchKey(query.trim());
  const match = (s: string) => !q || searchKey(s).includes(q);

  const filteredTexts = useMemo(() => texts.filter((t) => match(`${t.title} ${t.author ?? ''}`)), [texts, q]);
  const filteredAudio = useMemo(
    () => (listening ?? []).filter((m) => m.kind !== 'spotify' && !m.bookId && match(`${m.title} ${m.collection ?? ''} ${m.artist ?? ''}`)),
    [listening, q],
  );
  const filteredFeeds = useMemo(() => (feeds ?? []).filter((f) => match(`${f.title} ${f.author ?? ''}`)), [feeds, q]);
  const filteredAudiobooks = useMemo(() => (audiobooks ?? []).filter((b) => match(`${b.title} ${b.author ?? ''}`)), [audiobooks, q]);
  const filteredSongs = useMemo(() => (songs ?? []).filter((s) => match(`${s.title} ${s.artist}`)), [songs, q]);
  const filteredStations = useMemo(() => (stations ?? []).filter((s) => s.favorite && match(`${s.name} ${s.country ?? ''}`)), [stations, q]);
  const filteredVideos = useMemo(() => (videos ?? []).filter((v) => match(`${v.title} ${v.collection ?? ''}`)), [videos, q]);
  const filteredDecks = useMemo(() => (decks ?? []).filter((d) => match(d.name)), [decks, q]);

  // Items currently in progress across all tools.
  const continuing = useMemo(() => {
    const items: Array<{
      id: string;
      to: string;
      room: string;
      title: string;
      sub: string;
      pct?: number;
      at: number;
      art: ReactNode;
    }> = [];

    for (const t of texts) {
      const p = progress?.get(t.id);
      if (!t.finishedAt && (t.lastOpenedAt || (p && p.percent > 0))) {
        const pct = Math.round((p?.percent ?? 0) * 100);
        items.push({
          id: `text:${t.id}`,
          to: `/codex/read/${t.id}`,
          room: 'Codex · Read',
          title: t.title,
          sub: t.author ? `${t.author} · ${pct}%` : `${pct}% read`,
          pct,
          at: t.lastOpenedAt ?? p?.updatedAt ?? t.createdAt,
          art: <BookCover text={t} className="size-full object-cover" />,
        });
      }
    }

    for (const m of listening ?? []) {
      const p = playback?.get(m.id);
      if (m.kind !== 'spotify' && m.lastPlayedAt && !p?.completed && (p?.positionMs ?? 0) > 5000) {
        const pct = m.durationMs && p ? Math.round((p.positionMs / m.durationMs) * 100) : undefined;
        const left = m.durationMs && p ? Math.max(0, m.durationMs - p.positionMs) : 0;
        items.push({
          id: `audio:${m.id}`,
          to: `/sonus/play/${m.id}`,
          room: 'Sonus · Listen',
          title: m.title,
          sub: left > 60_000 ? `${formatDuration(left)} left` : m.collection || 'Audio',
          pct,
          at: m.lastPlayedAt,
          art: <Artwork title={m.title} coverBlobId={m.coverBlobId} coverUrl={m.coverUrl} className="size-full" rounded="rounded-none" />,
        });
      }
    }

    for (const v of videos ?? []) {
      const p = playback?.get(v.id);
      if (v.lastPlayedAt && !p?.completed && (p?.positionMs ?? 0) > 5000) {
        const pct = v.durationMs && p ? Math.round((p.positionMs / v.durationMs) * 100) : undefined;
        items.push({
          id: `video:${v.id}`,
          to: `/visio/watch/${v.id}`,
          room: 'Visio · Watch',
          title: v.title,
          sub: v.collection || 'Continue watching',
          pct,
          at: v.lastPlayedAt,
          art: <Poster title={v.title} coverBlobId={v.coverBlobId} className="size-full rounded-none shadow-none" />,
        });
      }
    }

    return items.sort((a, b) => b.at - a.at).slice(0, 10);
  }, [texts, progress, listening, videos, playback]);

  const attach = async (item: Text) => {
    const file = await pickFile('.epub,application/epub+zip');
    if (!file) return;
    try {
      const id = await attachEpub(item, file);
      navigate(`/codex/read/${id}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'That EPUB couldn’t be opened.', { tone: 'error' });
    }
  };

  const totalListenCount = filteredAudio.length + filteredFeeds.length + filteredAudiobooks.length + filteredSongs.length + filteredStations.length;
  const totalCount = filteredTexts.length + totalListenCount + filteredVideos.length + filteredDecks.length;
  const showRead = filter === 'all' || filter === 'read';
  const showListen = filter === 'all' || filter === 'listen';
  const showWatch = filter === 'all' || filter === 'watch';
  const showCards = filter === 'all' || filter === 'cards';

  return (
    <>
      <PageHeader
        title="Bibliotheca"
        eyebrow={`Your library across every tool in ${langName}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/explora" className={buttonClasses('secondary', 'md')}>
              <Compass size={17} aria-hidden /> Explora
            </Link>
            <Link to="/codex/new" className={buttonClasses('primary', 'md')}>
              <Plus size={17} aria-hidden /> Add text
            </Link>
          </div>
        }
      />

      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <Segmented<KindFilter> label="Library filter" value={filter} onChange={setFilter} options={FILTERS} />
        <div className="flex items-center gap-2">
          {searching ? (
            <SearchInput
              ref={searchRef}
              value={query}
              onChange={setQuery}
              placeholder="Search books, audio, videos and decks"
              onClose={() => {
                setQuery('');
                setSearching(false);
              }}
              autoFocus
              className="h-10! w-64 sm:w-72"
            />
          ) : (
            <IconButton icon={Search} label="Search library" shortcut="/" onClick={() => setSearching(true)} />
          )}
        </div>
      </div>

      {q && totalCount === 0 && (
        <div className="flex flex-col items-center py-14 text-center text-ink-soft">
          <SearchX size={28} className="mb-3 text-ink-faint" aria-hidden />
          <p className="font-semibold text-ink">Nothing in your library matches “{query.trim()}”</p>
          <p className="mt-1 text-sm">
            Try another search, or find something new in{' '}
            <Link to="/explora" className="font-semibold text-accent-text hover:underline">
              Explora
            </Link>
            .
          </p>
        </div>
      )}

      {!q && filter === 'all' && continuing.length > 0 && (
        <motion.section {...enter(0)} aria-label="Continue learning" className="mb-10">
          <div className="mb-3.5 flex items-baseline justify-between">
            <h2 className="font-serif text-[22px] font-semibold tracking-tight">Continue learning</h2>
            <span className="text-xs font-semibold text-ink-faint tabular-nums">{continuing.length} active</span>
          </div>
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {continuing.map((item) => (
              <Link
                key={item.id}
                to={item.to}
                className="group flex flex-col overflow-hidden rounded-2xl border border-line/70 bg-surface shadow-elev-1 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-elev-2"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-sunken">
                  {item.art}
                  {item.pct !== undefined && item.pct > 0 && (
                    <span className="absolute inset-x-0 bottom-0 h-1 bg-black/25" aria-hidden>
                      <span className="block h-full origin-left bg-accent" style={{ transform: `scaleX(${Math.max(0.04, item.pct / 100)})` }} />
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <span className="text-[10.5px] font-bold tracking-[0.1em] text-ink-faint uppercase">{item.room}</span>
                  <span lang={lang} className="mt-1 line-clamp-2 font-serif text-[15px] leading-snug font-semibold">
                    {item.title}
                  </span>
                  <span className="mt-auto pt-1.5 truncate text-[12px] text-ink-soft">{item.sub}</span>
                </div>
              </Link>
            ))}
          </div>
        </motion.section>
      )}

      <div className="space-y-12">
        {showRead && (
          <motion.section {...enter(1)} aria-label="Reading in Codex">
            <ToolHeader
              title="Reading"
              room="Codex"
              to="/codex"
              count={filteredTexts.length}
              action={
                <Link to="/codex/new" className={buttonClasses('secondary', 'sm')}>
                  <Plus size={15} aria-hidden /> Add book or text
                </Link>
              }
            />
            {filteredTexts.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                {filteredTexts.slice(0, filter === 'read' ? 50 : 10).map((t) => (
                  <BookCard key={t.id} text={t} progress={progress?.get(t.id)} onAttach={(item) => void attach(item)} />
                ))}
              </div>
            ) : (
              <EmptyToolShelf
                icon={BookOpen}
                title="No books or texts on your shelf yet"
                detail="Import an EPUB, PDF or comic, paste an article, or pick a free classic in Explora."
                to="/codex/new"
                actionLabel="Add to Codex"
              />
            )}
          </motion.section>
        )}

        {showListen && (
          <motion.section {...enter(2)} aria-label="Listening in Sonus">
            <ToolHeader
              title="Listening"
              room="Sonus"
              to="/sonus"
              count={totalListenCount}
              action={<AddMenu lang={lang} onDiscover={() => navigate('/cantus/podcasts')} label="Add audio" />}
            />
            {totalListenCount > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {filteredAudiobooks.slice(0, 6).map((b) => (
                  <Link
                    key={`book:${b.id}`}
                    to={`/sonus/book/${b.id}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-line/70 bg-surface p-3 transition-transform hover:-translate-y-0.5 hover:border-line-strong"
                  >
                    <Artwork title={b.title} coverBlobId={b.coverBlobId} coverUrl={b.coverUrl} className="aspect-square w-full" rounded="rounded-xl" />
                    <span className="mt-2.5 flex items-center gap-1 text-[11px] font-bold tracking-[0.1em] text-accent-text uppercase">
                      <Headphones size={12} aria-hidden /> Audiobook
                    </span>
                    <span lang={lang} className="mt-0.5 line-clamp-2 font-serif text-[15px] leading-snug font-semibold">
                      {b.title}
                    </span>
                    {b.author && <span className="mt-0.5 truncate text-[12px] text-ink-faint">{b.author}</span>}
                  </Link>
                ))}
                {filteredFeeds.slice(0, 6).map((f) => (
                  <Link
                    key={`feed:${f.id}`}
                    to={`/sonus/podcast/${f.id}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-line/70 bg-surface p-3 transition-transform hover:-translate-y-0.5 hover:border-line-strong"
                  >
                    <Artwork title={f.title} coverUrl={f.imageUrl} className="aspect-square w-full" rounded="rounded-xl" />
                    <span className="mt-2.5 flex items-center gap-1 text-[11px] font-bold tracking-[0.1em] text-sage-text uppercase">
                      <Podcast size={12} aria-hidden /> Podcast
                    </span>
                    <span lang={lang} className="mt-0.5 line-clamp-2 font-serif text-[15px] leading-snug font-semibold">
                      {f.title}
                    </span>
                    <span className="mt-0.5 truncate text-[12px] text-ink-faint">{f.episodes.length} episodes</span>
                  </Link>
                ))}
                {filteredAudio.slice(0, 6).map((m) => (
                  <Link
                    key={`media:${m.id}`}
                    to={`/sonus/play/${m.id}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-line/70 bg-surface p-3 transition-transform hover:-translate-y-0.5 hover:border-line-strong"
                  >
                    <Artwork title={m.title} coverBlobId={m.coverBlobId} coverUrl={m.coverUrl} className="aspect-square w-full" rounded="rounded-xl" />
                    <span className="mt-2.5 flex items-center gap-1 text-[11px] font-bold tracking-[0.1em] text-ink-faint uppercase">
                      <Headphones size={12} aria-hidden /> Audio
                    </span>
                    <span lang={lang} className="mt-0.5 line-clamp-2 font-serif text-[15px] leading-snug font-semibold">
                      {m.title}
                    </span>
                    {m.collection && <span className="mt-0.5 truncate text-[12px] text-ink-faint">{m.collection}</span>}
                  </Link>
                ))}
                {filteredSongs.slice(0, 6).map((s) => (
                  <Link
                    key={`song:${s.id}`}
                    to={`/cantus/song/${encodeURIComponent(s.id)}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-line/70 bg-surface p-3 transition-transform hover:-translate-y-0.5 hover:border-line-strong"
                  >
                    <SongArt url={s.artworkUrl} title={s.title} className="aspect-square w-full" rounded="rounded-xl" size={240} />
                    <span className="mt-2.5 flex items-center gap-1 text-[11px] font-bold tracking-[0.1em] text-[var(--cantus-text)] uppercase">
                      <Music2 size={12} aria-hidden /> Song
                    </span>
                    <span lang={lang} className="mt-0.5 line-clamp-2 font-serif text-[15px] leading-snug font-semibold">
                      {s.title}
                    </span>
                    <span className="mt-0.5 truncate text-[12px] text-ink-faint">{s.artist}</span>
                  </Link>
                ))}
                {filteredStations.slice(0, 4).map((s) => (
                  <Link
                    key={`station:${s.id}`}
                    to={`/sonus/station/${s.id}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-line/70 bg-surface p-3 transition-transform hover:-translate-y-0.5 hover:border-line-strong"
                  >
                    <Artwork title={s.name} coverUrl={s.favicon} className="aspect-square w-full" rounded="rounded-xl" />
                    <span className="mt-2.5 flex items-center gap-1 text-[11px] font-bold tracking-[0.1em] text-accent-text uppercase">
                      <Radio size={12} aria-hidden /> Radio
                    </span>
                    <span lang={lang} className="mt-0.5 line-clamp-2 font-serif text-[15px] leading-snug font-semibold">
                      {s.name}
                    </span>
                    {s.country && <span className="mt-0.5 truncate text-[12px] text-ink-faint">{s.country}</span>}
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyToolShelf
                icon={Headphones}
                title="Nothing in your Sonus library yet"
                detail="Follow a podcast, open a free LibriVox audiobook, save a radio station, or import your own audio files."
                to="/sonus"
                actionLabel="Open Sonus"
              />
            )}
          </motion.section>
        )}

        {showWatch && (
          <motion.section {...enter(3)} aria-label="Watching in Visio">
            <ToolHeader
              title="Watching"
              room="Visio"
              to="/visio"
              count={filteredVideos.length}
              action={<AddVideoMenu lang={lang} label="Add video" />}
            />
            {filteredVideos.length > 0 ? (
              <div className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
                {filteredVideos.slice(0, filter === 'watch' ? 30 : 6).map((v) => (
                  <VideoCard key={v.id} media={v} progress={playback?.get(v.id)} roles={tracks?.get(v.id)} />
                ))}
              </div>
            ) : (
              <EmptyToolShelf
                icon={Clapperboard}
                title="No videos or subtitle tracks yet"
                detail="Add a video file with subtitles, or load subtitles for a series or film you watch on your streaming services."
                to="/visio"
                actionLabel="Open Visio"
              />
            )}
          </motion.section>
        )}

        {showCards && (
          <motion.section {...enter(4)} aria-label="Vocabulary decks in Thesaurus">
            <ToolHeader
              title="Vocabulary"
              room="Thesaurus"
              to="/thesaurus"
              count={filteredDecks.length}
              action={
                <Link to="/thesaurus?tab=discover" className={buttonClasses('secondary', 'sm')}>
                  <Plus size={15} aria-hidden /> Ready-made decks
                </Link>
              }
            />
            {filteredDecks.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredDecks.map((d) => {
                  const c = deckCounts?.get(d.id);
                  const dueCount = (c?.due ?? 0) + (c?.new ?? 0) + (c?.learning ?? 0);
                  return (
                    <Link
                      key={d.id}
                      to={`/thesaurus/deck/${d.id}`}
                      className="group flex items-center gap-3.5 rounded-2xl border border-line/70 bg-surface p-4 transition-colors hover:border-line-strong hover:bg-raised"
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sage-soft text-sage-text">
                        <Layers size={20} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-serif text-[17px] font-semibold">{d.name}</span>
                        <span className="mt-0.5 block text-[12.5px] text-ink-soft">
                          {c ? `${c.total} ${c.total === 1 ? 'card' : 'cards'}` : 'Deck'}
                          {dueCount > 0 ? ` · ${dueCount} to review` : ''}
                        </span>
                      </span>
                      <ChevronRight size={18} className="shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <EmptyToolShelf
                icon={Layers}
                title="No vocabulary decks yet"
                detail="Start with a ready-made frequency or theme deck, import an Anki deck, or mark words while reading and listening."
                to="/thesaurus?tab=discover"
                actionLabel="Browse decks"
              />
            )}
          </motion.section>
        )}
      </div>

      <Card className="mt-12 flex flex-col items-start justify-between gap-4 border-dashed p-5 sm:flex-row sm:items-center sm:p-6">
        <div>
          <p className="text-[12px] font-bold tracking-[0.12em] text-accent-text uppercase">Looking for something new?</p>
          <p className="mt-1 font-serif text-xl font-semibold">Discover books, podcasts, series, films and word decks in Explora</p>
          <p className="mt-1 text-[14px] text-ink-soft">Picked for {langName} and your level, ready to add to the right tool in one click.</p>
        </div>
        <Link to="/explora" className={cx(buttonClasses('primary', 'md'), 'shrink-0')}>
          Open Explora <ArrowRight size={16} aria-hidden />
        </Link>
      </Card>
    </>
  );
}

function ToolHeader({ title, room, to, count, action }: { title: string; room: string; to: string; count: number; action?: ReactNode }) {
  return (
    <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2.5">
      <div className="flex items-baseline gap-2.5">
        <Link to={to} className="group inline-flex items-baseline gap-2 hover:text-accent-text">
          <h2 className="font-serif text-[22px] font-semibold tracking-tight">{title}</h2>
          <span className="text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase group-hover:text-accent-text">in {room}</span>
          <ChevronRight size={16} className="self-center text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
        {count > 0 && <span className="text-sm font-bold text-ink-faint tabular-nums">{count}</span>}
      </div>
      {action}
    </header>
  );
}

function EmptyToolShelf({
  icon: Icon,
  title,
  detail,
  to,
  actionLabel,
}: {
  icon: typeof BookOpen;
  title: string;
  detail: string;
  to: string;
  actionLabel: string;
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-line/70 bg-surface/60 p-5 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sunken text-ink-soft">
          <Icon size={19} aria-hidden />
        </span>
        <div>
          <p className="font-serif text-[16.5px] font-semibold">{title}</p>
          <p className="mt-0.5 text-[13.5px] text-ink-soft">{detail}</p>
        </div>
      </div>
      <Link to={to} className={cx(buttonClasses('secondary', 'sm'), 'shrink-0')}>
        {actionLabel} <ArrowRight size={14} aria-hidden />
      </Link>
    </div>
  );
}
