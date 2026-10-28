import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  Bookmark,
  BookA,
  BookHeadphones,
  BookOpen,
  BookPlus,
  Captions,
  Check,
  Film,
  Gamepad2,
  MonitorPlay,
  Music2,
  Play,
  Podcast,
  Radio,
  Rss,
  Tv,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Level } from '@/core/lang/levels';
import { ESTIMATED, inBands, LEVEL_HUE, LEVEL_WHY, LEVELS } from '@/core/mundus/explore';
import type { Band, LevelFilter } from '@/core/mundus/explore';
import { pickLinks } from '@/core/mundus/links';
import { countryName, matchProviders, serviceById } from '@/core/mundus/services';
import { GROUP_KIND } from '@/core/mundus/types';
import type { Pick, PickGroup, PickLevel, Picks } from '@/core/mundus/types';
import type { RadioStation } from '@/data/types';
import { Button } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { discoverFor } from '@/features/cantus/discover';
import type { PickedArtist } from '@/features/cantus/discover';
import { addBookToCodex, addSubtitlesFor, followPodcast } from '@/features/mundus/actions';
import { Art } from '@/features/mundus/Art';
import { pickKey, useAudiobookPicks, usePickLookups, useRadioPicks, useStreaming } from '@/features/mundus/hooks';
import type { PickLookup } from '@/features/mundus/hooks';
import { LinkPill } from '@/features/mundus/PicksView';
import { ServiceMark } from '@/features/mundus/ServiceBadge';
import { Artwork } from '@/features/sonus/library/Artwork';
import { sonusBase } from '@/features/sonus/paths';
import { countryName as radioCountry } from '@/services/radio/stations';
import { openLibrivoxBook } from '@/services/sonus/librivox';
import type { LibrivoxHit } from '@/services/sonus/librivox';
import { pickImageQuery } from '@/services/mundus/images';
import { posterUrl, trailerUrl } from '@/services/mundus/tmdb';
import { toast } from '@/state/ui';
import { toggleSaved, useSaved } from './saved';

type Kind = PickGroup | 'music' | 'radio' | 'audiobooks';

const KINDS: Array<{ id: Kind; label: string; icon: LucideIcon; hue: string }> = [
  { id: 'series', label: 'Series', icon: Tv, hue: '#c86d51' },
  { id: 'films', label: 'Films', icon: Film, hue: '#b56fa0' },
  { id: 'books', label: 'Books', icon: BookOpen, hue: '#6b8e78' },
  { id: 'audiobooks', label: 'Audiobooks', icon: BookHeadphones, hue: '#7c8f4e' },
  { id: 'podcasts', label: 'Podcasts', icon: Podcast, hue: '#5f87a8' },
  { id: 'music', label: 'Music', icon: Music2, hue: '#d49b54' },
  { id: 'radio', label: 'Radio', icon: Radio, hue: '#4f93a0' },
  { id: 'youtube', label: 'YouTube', icon: MonitorPlay, hue: '#cf6a6a' },
  { id: 'games', label: 'Video games', icon: Gamepad2, hue: '#8a7fb0' },
  { id: 'dictionaries', label: 'Dictionaries', icon: BookA, hue: '#9a8466' },
];
const KIND = Object.fromEntries(KINDS.map((k) => [k.id, k])) as Record<Kind, (typeof KINDS)[number]>;

const EASE_LEVEL: Record<PickedArtist['ease'], PickLevel> = { clear: 'A2', medium: 'B1', fast: 'B2' };
const TALL = new Set<Kind>(['series', 'films', 'books', 'audiobooks']);

/** One thing to explore, whatever it is: a pick, an artist, a station or a book to hear. */
interface Item {
  id: string;
  kind: Kind;
  title: string;
  sub?: string;
  level: PickLevel;
  /** The level is an estimate (radio and audiobooks carry none of their own). */
  estimated?: boolean;
  pick?: Pick;
  artist?: PickedArtist;
  station?: RadioStation;
  book?: LibrivoxHit;
}

const tintOf = (hue: string) => ({
  background: `linear-gradient(160deg, color-mix(in oklab, ${hue} 26%, var(--color-surface)), color-mix(in oklab, ${hue} 12%, var(--color-surface)))`,
  color: `color-mix(in oklab, ${hue} 80%, var(--color-ink))`,
});

const label = 'text-[12px] font-bold tracking-[0.14em] text-ink-faint uppercase';

const BAND_HINT: Record<Band, string> = {
  at: 'Enjoyable now, with subtitles or a dictionary at hand.',
  stretch: 'A step above you: harder, and worth it.',
  easier: 'Relaxed, for when you want to just enjoy it.',
  level: 'Everything at this level.',
};

/**
 * Explore (5.2-7): everything worth watching, reading and hearing in the language, in one place. Kinds and level on the left,
 * picture tiles with the level large in three bands (at your level, a stretch, easier), and a side bar with the rest.
 */
export function ExploreAll({ lang, picks, level }: { lang: string; picks: Picks | null; level: Level }) {
  const [params, setParams] = useSearchParams();
  const requested = params.get('kind');
  const kind: Kind | 'all' | 'saved' = requested === 'saved' ? 'saved' : KINDS.some((k) => k.id === requested) ? (requested as Kind) : 'all';
  const [filter, setFilter] = useState<LevelFilter>('mine');
  const [openId, setOpenId] = useState<string | null>(null);
  const saved = useSaved(lang);
  const streaming = useStreaming();
  const lookups = usePickLookups(lang, picks, streaming.country, streaming.services.length ? streaming.token : '');
  const stations = useRadioPicks(lang);
  const audiobooks = useAudiobookPicks(lang);

  const setKind = (next: typeof kind) => {
    setOpenId(null);
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (next === 'all') p.delete('kind');
        else p.set('kind', next);
        return p;
      },
      { replace: true },
    );
  };

  const items = useMemo(() => {
    const out: Item[] = [];
    for (const group of ['series', 'films', 'books', 'podcasts', 'youtube', 'games', 'dictionaries'] as const) {
      for (const pick of picks?.[group] ?? []) {
        out.push({ id: `${group}:${pickKey(pick)}`, kind: group, title: pick.title, sub: [group === 'dictionaries' ? undefined : pick.by, pick.year].filter(Boolean).join(' · ') || undefined, level: pick.level, pick });
      }
    }
    for (const artist of discoverFor(lang)?.artists ?? []) out.push({ id: `music:${artist.name}`, kind: 'music', title: artist.name, sub: 'Artist', level: EASE_LEVEL[artist.ease], artist });
    for (const station of stations) {
      out.push({ id: `radio:${station.id}`, kind: 'radio', title: station.name, sub: radioCountry(station.countryCode, station.country) || 'Radio', level: ESTIMATED.radio, estimated: true, station });
    }
    for (const book of audiobooks) out.push({ id: `audiobooks:${book.identifier}`, kind: 'audiobooks', title: book.title, sub: book.author, level: ESTIMATED.audiobooks, estimated: true, book });
    return out;
  }, [picks, stations, audiobooks, lang]);

  const counts = useMemo(() => {
    const map = new Map<Kind, number>();
    for (const i of items) map.set(i.kind, (map.get(i.kind) ?? 0) + 1);
    return map;
  }, [items]);

  const shown = items.filter((i) => (kind === 'all' ? true : kind === 'saved' ? saved.includes(i.id) : i.kind === kind));
  const bands = inBands(shown, level, filter);
  const open = items.find((i) => i.id === openId) ?? null;

  // Escape closes the side bar.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenId(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const note = kind !== 'all' && kind !== 'saved' ? picks?.notes?.[kind as PickGroup] : undefined;

  return (
    <div className={cx('grid gap-7', open ? 'grid-cols-[172px_minmax(0,1fr)_330px]' : 'grid-cols-[172px_minmax(0,1fr)]')}>
      <nav aria-label="Kinds and level" className="sticky top-6 flex flex-col gap-6 self-start">
        <div role="group" aria-label="Kinds" className="flex flex-col gap-0.5">
          <Row active={kind === 'all'} onClick={() => setKind('all')} count={items.length}>
            Everything
          </Row>
          {saved.length > 0 && (
            <Row active={kind === 'saved'} onClick={() => setKind('saved')} icon={Bookmark} count={saved.length}>
              Saved
            </Row>
          )}
          {KINDS.filter((k) => counts.get(k.id)).map((k) => (
            <Row key={k.id} active={kind === k.id} onClick={() => setKind(k.id)} icon={k.icon} count={counts.get(k.id)}>
              {k.label}
            </Row>
          ))}
        </div>
        <div role="group" aria-label="Level" className="flex flex-col gap-0.5 border-t border-line pt-5">
          <Row active={filter === 'mine'} onClick={() => setFilter('mine')}>
            Around my level
          </Row>
          <Row active={filter === 'any'} onClick={() => setFilter('any')}>
            Any level
          </Row>
          <div className="mt-1.5 flex flex-wrap gap-1.5 px-1">
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={filter === l}
                onClick={() => setFilter(l)}
                className={cx('h-8 min-w-10 rounded-lg px-2 text-[13px] font-bold transition-[background-color,color]', filter === l ? 'text-white' : 'bg-sunken text-ink-soft hover:text-ink')}
                style={filter === l ? { background: LEVEL_HUE[l] } : undefined}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="min-w-0">
        {!picks && (
          <p className="mb-6 max-w-2xl text-[14px] leading-relaxed text-ink-soft">
            Series, films, books and podcasts picked by hand come with the twenty main languages. Here, Sonus et Visio › Streaming lists what streams in the language on your services.
          </p>
        )}
        {note && <p className="mb-5 max-w-2xl text-[14px] text-ink-soft">{note}</p>}
        {bands.length === 0 && (
          <p className="py-16 text-center text-[15px] text-ink-soft">
            {kind === 'saved' ? 'Things you save gather here.' : 'Nothing at this level here yet. Try another level, or Any level.'}
          </p>
        )}
        <div className="space-y-10">
          {bands.map((b) => (
            <section key={b.band} aria-label={b.title}>
              <h2 className="flex items-baseline gap-3 font-serif text-[22px] font-semibold whitespace-nowrap">
                {b.title}
                <span className="text-[13px] font-semibold text-ink-faint tabular-nums">{b.items.length}</span>
              </h2>
              <p className="mt-0.5 mb-3 text-[13px] text-ink-soft">{BAND_HINT[b.band]}</p>
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-4 gap-y-6">
                {b.items.map((item) => (
                  <Tile key={item.id} item={item} lang={lang} lookup={item.pick && (item.kind === 'series' || item.kind === 'films') ? lookups.get(pickKey(item.pick)) : undefined} active={item.id === openId} saved={saved.includes(item.id)} onOpen={() => setOpenId(item.id === openId ? null : item.id)} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      {open && <SideBar item={open} lang={lang} level={level} lookup={open.pick ? lookups.get(pickKey(open.pick)) : undefined} saved={saved.includes(open.id)} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function Row({ active, onClick, icon: Icon, count, children }: { active: boolean; onClick: () => void; icon?: LucideIcon; count?: number; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={cx('flex h-9 items-center gap-2.5 rounded-lg px-3 text-left text-[14px] font-semibold transition-colors', active ? 'bg-inverse text-on-inverse' : 'text-ink-soft hover:bg-sunken hover:text-ink')}>
      {Icon && <Icon size={16} aria-hidden />}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {count !== undefined && <span className={cx('text-[12px] tabular-nums', active ? 'text-on-inverse/70' : 'text-ink-faint')}>{count}</span>}
    </button>
  );
}

/** The level, large: a coloured badge that reads at a glance. */
function LevelBadge({ level, estimated, size = 'md' }: { level: PickLevel; estimated?: boolean; size?: 'md' | 'lg' }) {
  return (
    <span
      title={estimated ? `About ${level} (estimated)` : `From ${level}`}
      className={cx('inline-flex items-center justify-center rounded-lg font-bold text-white tabular-nums shadow-elev-1', size === 'lg' ? 'h-9 min-w-12 px-3 text-[18px]' : 'h-7 min-w-9 px-2 text-[15px]')}
      style={{ background: LEVEL_HUE[level] }}
    >
      {estimated && '~'}
      {level}
    </span>
  );
}

/** What a tile or the side bar shows for an item: its picture, a poster when TMDB has one, else a drawn cover. */
function Picture({ item, lang, lookup }: { item: Item; lang: string; lookup?: PickLookup }) {
  const k = KIND[item.kind];
  const cover = (
    <span className="flex size-full items-center justify-center" style={tintOf(k.hue)}>
      <k.icon size={30} strokeWidth={1.6} aria-hidden />
    </span>
  );
  const poster = posterUrl(lookup?.title.posterPath, 'w342');
  if (poster) return <img src={poster} alt="" loading="lazy" decoding="async" className="size-full object-cover" />;
  if (item.station) return <Artwork title={item.station.name} coverUrl={item.station.favicon} className="block size-full" rounded="rounded-none" />;
  if (item.book) return <Artwork title={item.book.title} coverUrl={item.book.coverUrl} className="block size-full" rounded="rounded-none" />;
  if (item.artist) return <Art query={{ kind: 'wiki', q: `${item.artist.name} singer band`, must: item.artist.name, lang }} fallback={cover} />;
  if (item.pick) return <Art query={pickImageQuery(item.pick, item.kind as PickGroup, lang)} fit={item.kind === 'dictionaries' ? 'contain' : 'cover'} fallback={cover} />;
  return cover;
}

function Tile({ item, lang, lookup, active, saved, onOpen }: { item: Item; lang: string; lookup?: PickLookup; active: boolean; saved: boolean; onOpen: () => void }) {
  const k = KIND[item.kind];
  return (
    <li>
      <button type="button" onClick={onOpen} aria-pressed={active} className="no-callout group block w-full text-left">
        <span className={cx('relative block overflow-hidden rounded-2xl shadow-elev-1 transition-[transform,box-shadow] duration-150 group-hover:-translate-y-0.5 group-active:scale-[0.97]', TALL.has(item.kind) ? 'aspect-[2/3]' : 'aspect-square', active && 'ring-2 ring-accent')}>
          <Picture item={item} lang={lang} lookup={lookup} />
          <span className="absolute top-2 left-2">
            <LevelBadge level={item.level} estimated={item.estimated} />
          </span>
          {saved && (
            <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-raised/90 text-accent-text" aria-label="Saved">
              <Bookmark size={13} fill="currentColor" aria-hidden />
            </span>
          )}
        </span>
        <span lang={item.kind === 'dictionaries' || item.kind === 'radio' ? undefined : lang} className="mt-2 line-clamp-2 block text-[14px] leading-snug font-semibold">
          {item.title}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-[12.5px] text-ink-faint">
          <k.icon size={12} aria-hidden />
          <span className="truncate">{[k.label.replace(/s$/, ''), item.sub].filter(Boolean).join(' · ')}</span>
        </span>
      </button>
    </li>
  );
}

/** The bar on the right: the rest of what to know about one item, and what to do with it. */
function SideBar({ item, lang, level, lookup, saved, onClose }: { item: Item; lang: string; level: Level; lookup?: PickLookup; saved: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const streaming = useStreaming();
  const [busy, setBusy] = useState(false);
  const [trailer, setTrailer] = useState<string | null>(null);
  const k = KIND[item.kind];
  const screen = item.kind === 'series' || item.kind === 'films';

  // With a TMDB key, the trailer itself; without one, a YouTube search (pickLinks has it).
  useEffect(() => {
    setTrailer(null);
    if (!screen || !lookup || !streaming.token) return;
    let alive = true;
    trailerUrl(lookup.title.type, lookup.title.id, streaming.token)
      .then((url) => alive && setTrailer(url))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [screen, lookup, streaming.token]);

  const links = useMemo(() => (item.pick ? pickLinks(item.pick, GROUP_KIND[item.kind as PickGroup], { lang, country: streaming.country, services: streaming.services }) : []), [item, lang, streaming.country, streaming.services]);
  const mine = screen && item.pick ? (lookup ? matchProviders(lookup.where.stream, streaming.services) : (item.pick.on ?? []).filter((id) => streaming.services.includes(id))) : [];
  const description = item.pick?.why ?? item.artist?.why ?? (item.station ? 'Live radio: the quickest way to hear how people really talk.' : item.book ? 'A free LibriVox recording read aloud: follow it with the text.' : '');
  const overview = lookup?.title.overview;

  const run = async (job: () => Promise<void>) => {
    setBusy(true);
    try {
      await job();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'That didn’t work. Try again in a moment.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  // Where it opens in Lingua: a book into Codex, a podcast into Sonus, a station plays, a film into Visio.
  const action = (() => {
    if (item.kind === 'books' && item.pick) {
      const pick = item.pick;
      return (
        <Button icon={BookPlus} loading={busy} onClick={() => void run(async () => {
          const added = await addBookToCodex(lang, pick);
          toast(added ? `“${pick.title}” is on your Codex wishlist.` : 'It’s already in Codex.', { tone: added ? 'success' : 'default', action: { label: 'Codex', onClick: () => navigate('/codex') } });
        })}>
          Add to Codex
        </Button>
      );
    }
    if (item.kind === 'podcasts' && item.pick) {
      const pick = item.pick;
      return (
        <Button icon={Rss} loading={busy} onClick={() => void run(async () => {
          const feedId = await followPodcast(lang, pick);
          if (feedId) navigate(`${sonusBase()}/podcast/${feedId}`);
          else toast('Apple’s podcast directory doesn’t have it under that name. Try Spotify or Apple Podcasts.', { duration: 6000 });
        })}>
          Follow in Sonus
        </Button>
      );
    }
    if (screen && item.pick) {
      const pick = item.pick;
      return (
        <Button icon={Captions} loading={busy} onClick={() => void run(async () => {
          const id = await addSubtitlesFor(lang, pick.title);
          if (id) navigate(`/visio/watch/${id}`);
        })}>
          Add its subtitles
        </Button>
      );
    }
    if (item.station) return <Button icon={Play} onClick={() => navigate(`${sonusBase()}/station/${item.station!.id}`)}>Play in Sonus</Button>;
    if (item.book) {
      const book = item.book;
      return (
        <Button icon={Play} loading={busy} onClick={() => void run(async () => navigate(`${sonusBase()}/book/${await openLibrivoxBook(lang, book.identifier)}`))}>
          Listen in Sonus
        </Button>
      );
    }
    if (item.artist) return <Button icon={Music2} onClick={() => navigate(`/sonus?tab=music&q=${encodeURIComponent(item.artist!.name)}`)}>Songs in Sonus</Button>;
    return null;
  })();

  return (
    <aside aria-label={item.title} className="sticky top-6 max-h-[calc(100vh-3rem)] self-start overflow-y-auto rounded-3xl border border-line/70 bg-surface p-5">
      <div className="flex items-start gap-3">
        <span className={cx('block shrink-0 overflow-hidden rounded-xl shadow-elev-1', TALL.has(item.kind) ? 'aspect-[2/3] w-24' : 'size-24')}>
          <Picture item={item} lang={lang} lookup={lookup} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cx(label, 'flex items-center gap-1.5')}>
            <k.icon size={12} aria-hidden /> {k.label.replace(/s$/, '')}
          </p>
          <h2 lang={item.kind === 'dictionaries' || item.kind === 'radio' ? undefined : lang} className="mt-1 font-serif text-[21px] leading-snug font-semibold">
            {item.title}
          </h2>
          {(item.pick?.en || item.sub) && <p className="mt-0.5 text-[13px] text-ink-faint">{[item.pick?.en, item.sub].filter(Boolean).join(' · ')}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-full text-ink-faint transition-colors hover:bg-sunken hover:text-ink">
          <X size={16} aria-hidden />
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <LevelBadge level={item.level} estimated={item.estimated} size="lg" />
        <p className="min-w-0 flex-1 text-[13px] leading-snug text-ink-soft">
          {LEVEL_WHY[item.level]}
          {item.estimated && ' This level is an estimate.'}
          {' '}
          {LEVELS.indexOf(item.level) <= Math.max(0, LEVELS.indexOf(level as PickLevel)) ? 'You can enjoy it now.' : LEVELS.indexOf(item.level) === Math.max(0, LEVELS.indexOf(level as PickLevel)) + 1 ? 'A stretch: worth a try.' : 'Come back to it later.'}
        </p>
      </div>

      {description && <p className="mt-4 text-[14.5px] leading-relaxed">{description}</p>}
      {overview && <p className="mt-2 line-clamp-5 text-[13.5px] leading-relaxed text-ink-soft">{overview}</p>}

      {screen && (
        <div className="mt-4">
          <p className={label}>Where to watch</p>
          {mine.length > 0 ? (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-[13.5px] font-semibold text-sage-text">
              <Check size={14} strokeWidth={3} aria-hidden />
              {mine.map((id) => (
                <span key={id} className="inline-flex items-center gap-1.5">
                  <ServiceMark service={id} size={20} /> {serviceById(id)?.name}
                </span>
              ))}
              <span className="font-normal text-ink-soft">in {countryName(streaming.country)}</span>
            </p>
          ) : (
            lookup &&
            streaming.services.length > 0 && <p className="mt-2 text-[13px] text-ink-faint">Not on your services in {countryName(streaming.country)}.</p>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {action}
        <Button variant={saved ? 'accent' : 'secondary'} icon={Bookmark} aria-pressed={saved} onClick={() => toggleSaved(lang, item.id)}>
          {saved ? 'Saved' : 'Save'}
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {screen && trailer && <LinkPill link={{ label: 'Trailer', url: trailer }} />}
        {links
          .filter((l) => !(screen && trailer && l.label === 'Trailer'))
          .map((l) => (
            <LinkPill key={l.label} link={l} />
          ))}
        {item.station?.homepage && <LinkPill link={{ label: 'Website', url: item.station.homepage }} />}
        {item.artist && <LinkPill link={{ label: 'YouTube', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(item.artist.name)}` }} />}
      </div>
      {screen && (
        <p className="mt-4 text-[12.5px] leading-snug text-ink-faint">
          Watched somewhere else? Add its subtitles and Visio turns the episode into a lesson. <Link to="/sonus?tab=streaming" className="font-semibold text-accent-text hover:underline">Your services</Link>
        </p>
      )}
    </aside>
  );
}
