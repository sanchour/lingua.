import { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Pause, Play, Search, SearchX } from 'lucide-react';
import { MusicRoom } from '@/features/cantus/MusicRoom';
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
import { fade, spring } from '@/design/motion';
import { loadMedia, toggle, unlockAudio, usePlayer } from '@/services/audio/engine';
import { AddMenu } from './library/AddMenu';
import { Artwork } from './library/Artwork';
import { Discover } from './library/Discover';
import { LibraryHome } from './library/LibraryHome';
import { MediaRow } from './library/MediaRow';
import { PodcastGrid } from './library/PodcastGrid';

/** Library first (music and podcasts together), then each kind on its own, with discovery. */
type Tab = 'library' | 'music' | 'podcasts';

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
  // Old links: ?tab=discover was podcast discovery, now part of Podcasts; ?q= searches music.
  const requested = params.get('tab');
  const tab: Tab = requested === 'music' || requested === 'podcasts' ? requested : requested === 'discover' ? 'podcasts' : params.get('q') ? 'music' : 'library';
  const setTab = (next: Tab) => {
    setParams(next === 'library' ? {} : { tab: next }, { replace: true });
    window.scrollTo({ top: 0 });
  };
  const discoverRef = useRef<HTMLElement>(null);
  const findPodcasts = () => {
    setTab('podcasts');
    window.setTimeout(() => discoverRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  };

  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useHotkeys({ '/': () => (setTab('library'), searching ? searchRef.current?.focus() : setSearching(true)) }, pointer === 'fine' && tab === 'library');

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
      <PageHeader title="Sonus" eyebrow={`Listen and sing in ${getLanguage(lang)?.name ?? lang}`} actions={<AddMenu lang={lang} onDiscover={findPodcasts} />} />

      {tab === 'library' && (
        <motion.div {...enter(0)} className="mb-9 empty:hidden">
          <ContinueCard media={media} playback={playback} />
        </motion.div>
      )}

      <motion.div {...enter(1)} className="mb-6 flex h-12 items-center gap-2">
        <div className="relative h-full min-w-0 flex-1">
          <AnimatePresence mode="popLayout" initial={false}>
            {searching ? (
              <motion.div key="search" className="absolute inset-0" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={fade}>
                <SearchInput ref={searchRef} value={query} onChange={setQuery} placeholder="Search your audio and episodes" onClose={closeSearch} autoFocus />
              </motion.div>
            ) : (
              <motion.div key="tabs" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade}>
                {/* The sections fit the width as one control: nothing to scroll sideways on a phone. */}
                <Segmented<Tab>
                  block
                  label="Sonus sections"
                  value={tab}
                  onChange={setTab}
                  options={[
                    { value: 'library', label: 'Library' },
                    { value: 'music', label: 'Music' },
                    { value: 'podcasts', label: feeds?.length ? `Podcasts · ${feeds.length}` : 'Podcasts' },
                  ]}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {tab === 'library' && Boolean(media?.length) && (
          <>
            {!searching && <IconButton icon={Search} label="Search" shortcut="/" onClick={() => setSearching(true)} />}
            <SortMenu value={sort} options={SORTS} onChange={(mediaSort) => void patchSetting('ui', { mediaSort })} />
          </>
        )}
      </motion.div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.section key={tab} aria-label={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring.snappy}>
          {tab === 'music' && <MusicRoom initialQuery={params.get('q') ?? ''} />}
          {tab === 'library' &&
            media &&
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
              <LibraryHome lang={lang} media={media} visible={visible} feeds={feeds} playback={playback} transcribed={transcribed} onMusic={() => setTab('music')} onPodcasts={findPodcasts} />
            ))}
          {tab === 'podcasts' && (
            <div className="space-y-10">
              {feeds?.length ? (
                <PodcastGrid feeds={feeds} />
              ) : (
                feeds && <p className="text-[15px] text-ink-soft">Podcasts you follow appear here, with every episode ready to stream, save or transcribe. Find one below.</p>
              )}
              <section ref={discoverRef} aria-label="Find podcasts" className="scroll-mt-24">
                <h2 className="mb-4 text-[12px] font-bold tracking-[0.14em] text-ink-faint uppercase">Find podcasts</h2>
                <Discover lang={lang} feeds={feeds ?? []} />
              </section>
            </div>
          )}
        </motion.section>
      </AnimatePresence>
    </>
  );
}

/** The item playing now, or the last one left unfinished. */
function ContinueCard({ media, playback }: { media?: Media[]; playback?: Map<string, PlaybackProgress> }) {
  const loaded = usePlayer((s) => s.media);
  const playing = usePlayer((s) => s.status === 'playing');
  const item = loaded ?? media?.find((m) => m.kind !== 'spotify' && m.lastPlayedAt && !playback?.get(m.id)?.completed);
  if (!item) return null;
  const progress = playback?.get(item.id);
  const share = progress && item.durationMs ? Math.min(1, progress.positionMs / item.durationMs) : 0;
  const isLoaded = loaded?.id === item.id;

  return (
    <Card className="flex items-center gap-4 p-4 sm:gap-5 sm:p-5">
      <Link to={`/sonus/play/${item.id}`} className="w-20 shrink-0 sm:w-24" aria-label={`Open ${item.title}`}>
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
      <Link to={`/sonus/play/${item.id}`} className="hidden sm:block" aria-label="Open the player">
        <ArrowRight size={18} className="text-ink-faint" aria-hidden />
      </Link>
    </Card>
  );
}
