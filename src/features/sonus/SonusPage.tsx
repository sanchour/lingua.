import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { ChevronLeft, Music2, Search, SearchX } from 'lucide-react';
import type { LeftCantusState } from '@/features/cantus/room/nav';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { RoomTabs } from '@/app/RoomTabs';
import type { RoomTab } from '@/app/RoomTabs';
import { playlistNames, useFeeds, useMediaList, usePlaybackMap, useTranscribedIds } from '@/data/media';
import { patchSetting } from '@/data/settings';
import type { MediaSort } from '@/data/settings';
import type { Media } from '@/data/types';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { useLayout } from '@/design/hooks/useLayout';
import { IconButton, SearchInput, searchKey, SortMenu } from '@/design/primitives';
import { getLanguage } from '@/core/lang/languages';
import { spring } from '@/design/motion';
import { toast } from '@/state/ui';
import { useGate } from '@/features/plans/PlanRoute';
import { AddMenu } from './library/AddMenu';
import { LIBRARY_VIEWS, LibraryHome } from './library/LibraryHome';
import type { LibraryView } from './library/LibraryHome';
import { MediaRow } from './library/MediaRow';

const RadioTab = lazy(() => import('./radio/RadioTab'));
const BooksTab = lazy(() => import('./library/BooksTab'));

type Tab = 'library' | 'books' | 'radio';
const TABS: Array<RoomTab<Tab>> = [
  { id: 'library', label: 'Library', to: '/sonus' },
  { id: 'books', label: 'Audiobooks', short: 'Books', to: '/sonus?tab=books' },
  { id: 'radio', label: 'Radio', to: '/sonus?tab=radio' },
];
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

/**
 * Sonus: the listening room for podcasts, audiobooks, radio and your own audio; Sonus+ (music and
 * podcasts to find) opens from the end of the tab strip. Watching has its own room in Visio.
 */
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
  // Music and podcasts live in Sonus+; streaming and watch links go to Visio.
  const requested = params.get('tab');
  const asked = params.get('q');
  const askedShow = params.get('show');
  useEffect(() => {
    const to = asked
      ? `/cantus/search?q=${encodeURIComponent(asked)}`
      : requested === 'music'
        ? '/cantus/music'
        : requested === 'podcasts' || requested === 'discover'
          ? '/cantus/podcasts'
          : requested === 'streaming' || requested === 'services'
            ? '/visio?tab=services'
            : askedShow === 'watch'
              ? '/visio'
              : null;
    if (to) navigate(to, { replace: true });
  }, [requested, asked, askedShow, navigate]);
  // Back from Sonus+ (its X): say the room is closed and the song keeps its place.
  const leftRoom = Boolean((useLocation().state as LeftCantusState | null)?.leftCantus);
  useEffect(() => {
    if (leftRoom) toast('Back in Lingua. Sonus+ closed; the song keeps its place.');
  }, [leftRoom]);
  const findPodcasts = () => navigate('/cantus/podcasts');
  const tab: Tab = requested === 'radio' || requested === 'books' ? requested : requested === 'audiobooks' ? 'books' : 'library';

  // Library › Songs, Podcasts, Episodes, Your audio: a page of their own, which Back leaves.
  const view = tab === 'library' ? ((Object.keys(LIBRARY_VIEWS) as LibraryView[]).find((v) => v === params.get('view')) ?? null) : null;
  const setView = (next: LibraryView | null) => {
    setParams(next ? { view: next } : {});
    window.scrollTo({ top: 0 });
  };
  const listsMedia = !view || view === 'episodes' || view === 'audio';

  const [playlist, setPlaylist] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useHotkeys({ '/': () => (searching ? searchRef.current?.focus() : setSearching(true)) }, pointer === 'fine' && tab === 'library');

  const visible = useMemo(() => {
    const q = searchKey(query.trim());
    return (media ?? []).filter((m) => (!playlist || m.playlists?.includes(playlist)) && (!q || searchKey(`${m.title} ${m.collection ?? ''} ${m.artist ?? ''}`).includes(q))).sort(sorter(sort));
  }, [media, query, sort, playlist]);
  const lists = useMemo(() => playlistNames(media ?? []), [media]);

  const closeSearch = () => {
    setQuery('');
    setSearching(false);
  };

  const toolbar = (view || Boolean(media?.length)) && (
    <div className="mb-5 flex h-12 items-center gap-2">
      <div className="relative h-full min-w-0 flex-1">
        {searching ? (
          <SearchInput ref={searchRef} value={query} onChange={setQuery} placeholder="Search what you listen to" onClose={closeSearch} autoFocus />
        ) : view ? (
          <span className="flex h-full items-center gap-2.5">
            <button type="button" onClick={() => setView(null)} aria-label="Back to your library" className="grid size-10 place-items-center rounded-full bg-sunken text-ink-soft transition-colors hover:text-ink">
              <ChevronLeft size={20} aria-hidden />
            </button>
            <h2 className="font-serif text-[24px] font-semibold tracking-tight">{LIBRARY_VIEWS[view]}</h2>
          </span>
        ) : (
          <h2 className="font-serif text-[24px] leading-[48px] font-semibold tracking-tight">Listen</h2>
        )}
      </div>
      {listsMedia && Boolean(media?.length) && (
        <>
          {!searching && <IconButton icon={Search} label="Search" shortcut="/" onClick={() => setSearching(true)} />}
          <SortMenu value={sort} options={SORTS} onChange={(mediaSort) => void patchSetting('ui', { mediaSort })} />
        </>
      )}
    </div>
  );

  const chips = lists.length > 0 && (
    <div role="group" aria-label="Playlists" className="mb-4 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[12.5px] font-semibold text-ink-faint">Playlists</span>
      {[null, ...lists].map((n) => (
        <button key={n ?? 'all'} type="button" aria-pressed={playlist === n} onClick={() => setPlaylist(n)} className={`rounded-full border px-3 py-1 text-[13px] font-semibold ${playlist === n ? 'border-accent bg-accent-soft text-accent-text' : 'border-line text-ink-soft hover:bg-surface'}`}>
          {n ?? 'Everything'}
        </button>
      ))}
    </div>
  );

  const results = query.trim() || playlist ? (
    visible.length ? (
      <div className="-mx-2 flex flex-col">
        {visible.map((m) => (
          <MediaRow key={m.id} media={m} progress={playback?.get(m.id)} hasTranscript={Boolean(transcribed?.has(m.id))} />
        ))}
      </div>
    ) : (
      <div className="flex flex-col items-center py-14 text-center text-ink-soft">
        <SearchX size={28} className="mb-3 text-ink-faint" aria-hidden />
        <p className="font-semibold text-ink">{query.trim() ? `Nothing matches “${query.trim()}”` : 'Nothing in this playlist yet'}</p>
      </div>
    )
  ) : null;

  return (
    <>
      <PageHeader
        title="Sonus"
        eyebrow={`Listen in ${getLanguage(lang)?.name ?? lang}`}
        actions={<AddMenu lang={lang} onDiscover={findPodcasts} label="Add" />}
      />

      <RoomTabs label="Sonus" tabs={TABS} active={tab} keys={!searching} end={<SonusPlusLink />} />

      {tab === 'library' && !view && (
        <p className="-mt-2 mb-4 text-[13.5px] text-ink-soft">
          <Link to="/sonus/words" className="font-semibold text-ink underline decoration-line-strong underline-offset-4">
            Your words, read aloud
          </Link>{' '}
          for the commute.
        </p>
      )}

      {tab !== 'library' && (
        <Suspense fallback={null}>
          {tab === 'radio' ? <RadioTab lang={lang} flag={language.flag} /> : <BooksTab lang={lang} />}
        </Suspense>
      )}

      {tab === 'library' && media && feeds && (
        <motion.section key={view ?? 'home'} {...enter(1)} aria-label={view ? LIBRARY_VIEWS[view] : 'Your library'}>
          <LibraryHome
            lang={lang}
            media={media}
            visible={visible}
            feeds={feeds}
            playback={playback}
            transcribed={transcribed}
            view={view}
            onView={setView}
            show="listen"
            toolbar={
              <>
                {toolbar}
                {chips}
              </>
            }
            results={results}
            onMusic={() => navigate('/cantus/music')}
            onPodcasts={findPodcasts}
            onBooks={() => navigate('/sonus?tab=books')}
            onRadio={() => navigate('/sonus?tab=radio')}
          />
        </motion.section>
      )}
    </>
  );
}

/** The way into Sonus+, dark like the room, at the end of the tab strip. */
function SonusPlusLink() {
  const gate = useGate('sonusPlus');
  return (
    <Link
      to="/cantus"
      onClick={gate ?? undefined}
      aria-label="Open Sonus+: songs to sing and learn, and podcasts"
      className="group relative inline-flex h-9 items-center gap-2 overflow-hidden rounded-full bg-[#120e10] pr-3.5 pl-1.5 text-[#f6eef0] shadow-elev-1 transition-transform active:scale-[0.98]"
    >
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_0%,rgb(180_88_126/0.5),transparent_60%)]" aria-hidden />
      <span className="relative grid size-6.5 place-items-center rounded-full bg-[linear-gradient(135deg,#e8a0bf,#b4587e)] text-[#1a1215]">
        <Music2 size={14} aria-hidden />
      </span>
      <span className="relative text-[14px] font-extrabold tracking-[-0.01em]">
        Sonus<span className="text-[#e8a0bf]">+</span>
      </span>
      {gate && <span className="relative ml-0.5 rounded-full bg-[#f6eef0]/15 px-1.5 text-[11px] font-bold">Lingua+</span>}
    </Link>
  );
}
