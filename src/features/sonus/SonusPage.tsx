import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight, Music2, Pause, Play, Search, SearchX } from 'lucide-react';
import type { LeftCantusState } from '@/features/cantus/room/nav';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { formatDuration } from '@/core/audio/cues';
import { useFeeds, useMediaList, usePlaybackMap, useTranscribedIds } from '@/data/media';
import { patchSetting } from '@/data/settings';
import type { MediaSort } from '@/data/settings';
import type { Media, PlaybackProgress } from '@/data/types';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { useLayout } from '@/design/hooks/useLayout';
import { Card, IconButton, SearchInput, searchKey, Segmented, SortMenu } from '@/design/primitives';
import { getLanguage } from '@/core/lang/languages';
import { spring } from '@/design/motion';
import { loadMedia, toggle, unlockAudio, usePlayer } from '@/services/audio/engine';
import { AddMenu } from './library/AddMenu';
import { Artwork } from './library/Artwork';
import { LibraryHome } from './library/LibraryHome';
import { MediaRow } from './library/MediaRow';
import { sonusBase } from '@/features/sonus/paths';

const RadioTab = lazy(() => import('./radio/RadioTab'));
const BooksTab = lazy(() => import('./library/BooksTab'));

type Tab = 'library' | 'books' | 'radio';
const SORTS: Array<{ value: MediaSort; label: string }> = [
  { value: 'recent', label: 'Recently played' },
  { value: 'added', label: 'Recently added' },
  { value: 'title', label: 'Title' },
  { value: 'longest', label: 'Longest first' },
  { value: 'shortest', label: 'Shortest first' },
];

function sorter(sort: MediaSort): (a: Media, b: Media) => number {
  const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
  switch (sort) {
    case 'added':
      return (a, b) => b.createdAt - a.createdAt;
    case 'title':
      return (a, b) => collator.compare(a.title, b.title);
    case 'longest':
      return (a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0);
    case 'shortest':
      return (a, b) => (a.durationMs ?? Infinity) - (b.durationMs ?? Infinity);
    default:
      return (a, b) => (b.lastPlayedAt ?? b.createdAt) - (a.lastPlayedAt ?? a.createdAt);
  }
}

const enter = (i: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { ...spring.soft, delay: 0.05 * i } });

export default function SonusPage() {
  const { language, settings } = useApp();
  const lang = language.id;
  const { pointer } = useLayout();
  const media = useMediaList(lang);
  const feeds = useFeeds(lang);
  const playback = usePlaybackMap();
  const transcribed = useTranscribedIds();
  const sort = settings.ui.mediaSort;

  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  // Sonus is your library, audiobooks and the radio; music and podcasts live in Sonus+ (old links,
  // and ?q=, a song search, open it there).
  const requested = params.get('tab');
  const asked = params.get('q');
  useEffect(() => {
    const to = asked
      ? `/cantus/search?q=${encodeURIComponent(asked)}`
      : requested === 'music'
        ? '/cantus/music'
        : requested === 'podcasts' || requested === 'discover'
          ? '/cantus/podcasts'
          : null;
    if (to) navigate(to, { replace: true });
  }, [requested, asked, navigate]);
  // Back from Sonus+ (its X): the card says the room is closed.
  const leftRoom = Boolean((useLocation().state as LeftCantusState | null)?.leftCantus);
  const findPodcasts = () => navigate('/cantus/podcasts');
  const tab: Tab = requested === 'radio' || requested === 'books' ? requested : requested === 'audiobooks' ? 'books' : 'library';
  const setTab = (next: Tab) => {
    setParams(next === 'library' ? {} : { tab: next }, { replace: true });
    window.scrollTo({ top: 0 });
  };

  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useHotkeys({ '/': () => (searching ? searchRef.current?.focus() : setSearching(true)) }, pointer === 'fine' && tab === 'library');

  const visible = useMemo(() => {
    const q = searchKey(query.trim());
    return (media ?? []).filter((m) => !q || searchKey(`${m.title} ${m.collection ?? ''} ${m.artist ?? ''}`).includes(q)).sort(sorter(sort));
  }, [media, query, sort]);

  const closeSearch = () => {
    setQuery('');
    setSearching(false);
  };

  return (
    <>
      <PageHeader title="Sonus" eyebrow={`Your library in ${getLanguage(lang)?.name ?? lang}`} actions={<AddMenu lang={lang} onDiscover={findPodcasts} />} />

      <motion.div {...enter(0)} className="mb-6">
        <Segmented<Tab>
          block
          label="Sonus"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'library', label: 'Library' },
            { value: 'books', label: 'Audiobooks', short: 'Books' },
            { value: 'radio', label: 'Radio' },
          ]}
        />
      </motion.div>

      {tab !== 'library' && (
        <Suspense fallback={null}>
          {tab === 'radio' ? <RadioTab lang={lang} flag={language.flag} /> : <BooksTab lang={lang} />}
        </Suspense>
      )}

      {tab === 'library' && (
      <>
      <motion.div {...enter(1)} className="mb-9 grid gap-4 lg:grid-cols-2">
        <SonusPlusCard left={leftRoom} />
        <ContinueCard media={media} playback={playback} />
      </motion.div>

      {Boolean(media?.length) && (
        <motion.div {...enter(2)} className="mb-5 flex h-12 items-center gap-2">
          <div className="relative h-full min-w-0 flex-1">
            {searching ? (
              <SearchInput ref={searchRef} value={query} onChange={setQuery} placeholder="Search your audio and episodes" onClose={closeSearch} autoFocus />
            ) : (
              <h2 className="text-[12px] leading-[48px] font-bold tracking-[0.14em] text-ink-faint uppercase">Your library</h2>
            )}
          </div>
          {!searching && <IconButton icon={Search} label="Search" shortcut="/" onClick={() => setSearching(true)} />}
          <SortMenu value={sort} options={SORTS} onChange={(mediaSort) => void patchSetting('ui', { mediaSort })} />
        </motion.div>
      )}

      <motion.section {...enter(2)} aria-label="Your library">
        {media &&
          feeds &&
          (query.trim() ? (
            visible.length ? (
              <div className="-mx-2 flex flex-col">
                {visible.map((m) => (
                  <MediaRow key={m.id} media={m} progress={playback?.get(m.id)} hasTranscript={Boolean(transcribed?.has(m.id))} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-14 text-center text-ink-soft">
                <SearchX size={28} className="mb-3 text-ink-faint" aria-hidden />
                <p className="font-semibold text-ink">Nothing matches “{query.trim()}”</p>
              </div>
            )
          ) : (
            <LibraryHome lang={lang} media={media} visible={visible} feeds={feeds} playback={playback} transcribed={transcribed} onMusic={() => navigate('/cantus/music')} onPodcasts={findPodcasts} onBooks={() => setTab('books')} onRadio={() => setTab('radio')} />
          ))}
      </motion.section>
      </>
      )}
    </>
  );
}

/** The item playing now, or the last one left unfinished. */
function ContinueCard({ media, playback }: { media?: Media[]; playback?: Map<string, PlaybackProgress> }) {
  // A live station has its own card in Radio.
  const loaded = usePlayer((s) => (s.media?.kind === 'radio' ? null : s.media));
  const playing = usePlayer((s) => s.status === 'playing');
  const item = loaded ?? media?.find((m) => m.kind !== 'spotify' && m.lastPlayedAt && !playback?.get(m.id)?.completed);
  if (!item) return null;
  const progress = playback?.get(item.id);
  const share = progress && item.durationMs ? Math.min(1, progress.positionMs / item.durationMs) : 0;
  const isLoaded = loaded?.id === item.id;

  return (
    <Card className="flex items-center gap-4 p-4 sm:gap-5 sm:p-5">
      <Link to={`${sonusBase()}/play/${item.id}`} className="w-20 shrink-0 sm:w-24" aria-label={`Open ${item.title}`}>
        <Artwork title={item.title} coverBlobId={item.coverBlobId} coverUrl={item.coverUrl} className="w-full" rounded="rounded-2xl" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold tracking-[0.12em] text-sage-text uppercase">{isLoaded && playing ? 'Now playing' : 'Continue listening'}</p>
        <p lang={item.lang} className="mt-1 line-clamp-2 font-serif text-xl leading-tight font-semibold">
          {item.title}
        </p>
        {(item.collection ?? item.artist) && <p className="truncate text-sm text-ink-soft">{item.collection ?? item.artist}</p>}
        {item.durationMs && share > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 max-w-48 flex-1 overflow-hidden rounded-full bg-sunken">
              <div className="h-full origin-left rounded-full bg-accent" style={{ transform: `scaleX(${Math.max(0.02, share)})` }} />
            </div>
            <span className="text-xs font-semibold text-ink-faint tabular-nums">{formatDuration(item.durationMs - (progress?.positionMs ?? 0))} left</span>
          </div>
        )}
      </div>
      <button
        type="button"
        aria-label={isLoaded && playing ? 'Pause' : 'Play'}
        onClick={() => {
          if (isLoaded) return toggle();
          unlockAudio();
          void loadMedia(item, { autoplay: true });
        }}
        className="grid size-14 shrink-0 place-items-center rounded-full bg-inverse text-on-inverse shadow-elev-2 transition-transform duration-150 active:scale-90"
      >
        {isLoaded && playing ? <Pause size={22} className="fill-current" aria-hidden /> : <Play size={22} className="translate-x-0.5 fill-current" aria-hidden />}
      </button>
      <Link to={`${sonusBase()}/play/${item.id}`} className="hidden sm:block" aria-label="Open the player">
        <ArrowRight size={18} className="text-ink-faint" aria-hidden />
      </Link>
    </Card>
  );
}

/** The way into Sonus+, dark like the room; back from it, it says the room is closed. */
function SonusPlusCard({ left }: { left: boolean }) {
  return (
    <Link
      to="/cantus"
      className="group relative flex min-h-[152px] flex-col justify-between overflow-hidden rounded-3xl bg-[#120e10] p-5 text-[#f6eef0] shadow-elev-1 transition-transform active:scale-[0.99] sm:p-6"
      aria-label="Open Sonus+"
    >
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_10%_-10%,rgb(180_88_126/0.55),transparent_60%),radial-gradient(90%_70%_at_100%_0%,rgb(110_47_75/0.5),transparent_60%)]" aria-hidden />
      <span className="relative flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-[linear-gradient(135deg,#e8a0bf,#b4587e)] text-[#1a1215]">
          <Music2 size={20} aria-hidden />
        </span>
        <span className="text-[22px] font-extrabold tracking-[-0.02em]">
          Sonus<span className="text-[#e8a0bf]">+</span>
        </span>
      </span>
      <span className="relative mt-4 block">
        <span className="block text-[15px] font-semibold">{left ? 'Back in Lingua. Sonus+ closed; the song keeps its place.' : 'Songs to sing and learn, and podcasts'}</span>
        <span className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-[#f6eef0] px-4 text-[14px] font-bold text-[#1a1215]">
          Open Sonus+ <ArrowRight size={16} aria-hidden />
        </span>
      </span>
    </Link>
  );
}
