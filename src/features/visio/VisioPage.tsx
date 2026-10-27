import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Clapperboard, Compass, Film, Search, SearchX, Tv } from 'lucide-react';
import { useApp } from '@/app/context';
import { useFullMotion } from '@/app/motion';
import { PageHeader } from '@/app/PageHeader';
import { RoomTabs } from '@/app/RoomTabs';
import type { RoomTab } from '@/app/RoomTabs';
import { formatDuration } from '@/core/audio/cues';
import { getLanguage } from '@/core/lang/languages';
import { useMediaList, usePlaybackMap } from '@/data/media';
import { patchSetting } from '@/data/settings';
import type { MediaSort } from '@/data/settings';
import type { Media, PlaybackProgress } from '@/data/types';
import { useTrackIndex } from '@/data/video';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { useLayout } from '@/design/hooks/useLayout';
import { buttonClasses, Card, IconButton, SearchInput, searchKey, SortMenu } from '@/design/primitives';
import { fade, spring } from '@/design/motion';
import { PlusChip, RequirePlan } from '@/features/plans/Locked';
import { useCan } from '@/features/plans/usePlan';
import { AddVideoMenu } from './library/AddVideoMenu';
import { Poster } from './library/Poster';
import { VideoCard } from './library/VideoCard';

const ServicesTab = lazy(() => import('./services/ServicesTab').then((m) => ({ default: m.ServicesTab })));

type Tab = 'library' | 'services';
const TABS: Array<RoomTab<Tab>> = [
  { id: 'library', label: 'Library', to: '/visio', icon: Film },
  { id: 'services', label: 'Streaming', to: '/visio?tab=services', icon: Tv },
];

const SORTS: Array<{ value: MediaSort; label: string }> = [
  { value: 'recent', label: 'Recently watched' },
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

export default function VisioPage() {
  const { language, settings } = useApp();
  const lang = language.id;
  const { pointer } = useLayout();
  const fullMotion = useFullMotion();
  const streamingOpen = useCan('streaming');
  const videos = useMediaList(lang, 'watch');
  const playback = usePlaybackMap();
  const tracks = useTrackIndex();
  const sort = settings.ui.mediaSort;

  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const tab: Tab = requested === 'services' || requested === 'streaming' ? 'services' : 'library';

  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useHotkeys({ '/': () => (searching ? searchRef.current?.focus() : setSearching(true)) }, pointer === 'fine' && tab === 'library' && Boolean(videos?.length));

  const current = useMemo(
    () => videos?.find((v) => v.lastPlayedAt && !playback?.get(v.id)?.completed && (playback?.get(v.id)?.positionMs ?? 0) > 5000),
    [videos, playback],
  );

  const visible = useMemo(() => {
    const q = searchKey(query.trim());
    return (videos ?? []).filter((v) => !q || searchKey(`${v.title} ${v.collection ?? ''}`).includes(q)).sort(sorter(sort));
  }, [videos, query, sort]);

  const closeSearch = () => {
    setQuery('');
    setSearching(false);
  };

  return (
    <>
      <PageHeader
        title="Visio"
        eyebrow={`Watch in ${getLanguage(lang)?.name ?? lang}`}
        actions={<AddVideoMenu lang={lang} />}
      />

      <RoomTabs
        label="Visio"
        tabs={streamingOpen ? TABS : TABS.map((t) => (t.id === 'services' ? { ...t, badge: <PlusChip feature="streaming" /> } : t))}
        active={tab}
        keys={!searching}
      />

      {tab === 'services' && (
        <Suspense fallback={null}>
          <RequirePlan feature="streaming">
            <ServicesTab lang={lang} />
          </RequirePlan>
        </Suspense>
      )}

      {tab === 'library' && videos && videos.length === 0 && (
        <EmptyLibrary lang={lang} onServices={() => setParams({ tab: 'services' })} />
      )}

      {tab === 'library' && current && playback && !query && (
        <ContinueCard media={current} progress={playback.get(current.id)} />
      )}

      {tab === 'library' && videos && videos.length > 0 && (
        <>
          <div className="mt-7 mb-5 flex h-11 items-center gap-2">
            <div className="relative h-full min-w-0 flex-1">
              <AnimatePresence mode="popLayout" initial={false}>
                {searching ? (
                  <motion.div key="search" className="absolute inset-0" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={fade}>
                    <SearchInput ref={searchRef} value={query} onChange={setQuery} placeholder="Search titles" onClose={closeSearch} autoFocus />
                  </motion.div>
                ) : (
                  <motion.p key="count" className="flex h-full items-center font-serif text-xl font-semibold" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade}>
                    Your videos <span className="ml-2 font-sans text-sm font-bold text-ink-faint tabular-nums">{videos.length}</span>
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            {!searching && <IconButton icon={Search} label="Search" shortcut="/" onClick={() => setSearching(true)} />}
            <SortMenu value={sort} options={SORTS} onChange={(mediaSort) => void patchSetting('ui', { mediaSort })} />
          </div>

          {visible.length === 0 ? (
            <div className="flex flex-col items-center py-14 text-center text-ink-soft">
              <SearchX size={28} className="mb-3 text-ink-faint" aria-hidden />
              <p className="font-semibold text-ink">Nothing matches “{query.trim()}”</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((m, i) => (
                <motion.div
                  key={m.id}
                  layout={fullMotion ? 'position' : undefined}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring.soft, delay: Math.min(i, 9) * 0.03, layout: spring.fluid }}
                >
                  <VideoCard media={m} progress={playback?.get(m.id)} roles={tracks?.get(m.id)} />
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

function ContinueCard({ media, progress }: { media: Media; progress?: PlaybackProgress }) {
  const share = progress && media.durationMs ? progress.positionMs / media.durationMs : 0;
  const left = media.durationMs && progress ? Math.max(0, media.durationMs - progress.positionMs) : 0;
  return (
    <Card className="flex items-center gap-4 p-4 sm:gap-5 sm:p-5">
      <Link to={`/visio/watch/${media.id}`} className="w-28 shrink-0 sm:w-36" aria-label={`Continue watching ${media.title}`}>
        <Poster title={media.title} coverBlobId={media.coverBlobId} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold tracking-[0.12em] text-accent-text uppercase">Continue watching</p>
        <p lang={media.lang} className="mt-1 line-clamp-2 font-serif text-xl leading-tight font-semibold">
          {media.title}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 max-w-48 flex-1 overflow-hidden rounded-full bg-sunken">
            <div className="h-full origin-left rounded-full bg-accent" style={{ transform: `scaleX(${Math.max(0.03, share)})` }} />
          </div>
          {left > 0 && <span className="text-xs font-semibold text-ink-faint tabular-nums">{formatDuration(left)} left</span>}
        </div>
      </div>
      <div className="hidden shrink-0 sm:block">
        <Link to={`/visio/watch/${media.id}`} className={buttonClasses('primary', 'md')}>
          Continue <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
    </Card>
  );
}

function EmptyLibrary({ lang, onServices }: { lang: string; onServices: () => void }) {
  const name = getLanguage(lang)?.name ?? lang;
  return (
    <Card className="flex flex-col items-center px-6 py-8 text-center sm:py-10">
      <div className="mb-5 grid size-16 place-items-center rounded-2xl bg-accent-soft text-accent-text">
        <Clapperboard size={28} aria-hidden />
      </div>
      <h2 className="font-serif text-2xl font-semibold">Nothing on screen yet</h2>
      <p className="mt-2 max-w-md text-[15px] leading-relaxed text-ink-soft">
        Add a video and its subtitles, or just the subtitles for a show you watch elsewhere. Every line is clickable; pause on any word to look it up or save it.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <AddVideoMenu lang={lang} label="Add a video or subtitles" />
        <button type="button" onClick={onServices} className={buttonClasses('secondary', 'md')}>
          <Tv size={17} aria-hidden /> Browse {name} streaming
        </button>
        <Link to="/explora" className={buttonClasses('secondary', 'md')}>
          <Compass size={17} aria-hidden /> Discover in Explora
        </Link>
      </div>
    </Card>
  );
}
