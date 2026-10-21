import { Children, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  BookA,
  BookHeadphones,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Film,
  Gamepad2,
  GraduationCap,
  Headphones,
  Library,
  MonitorPlay,
  Music2,
  Newspaper,
  Podcast,
  Radio,
  Sparkles,
  Tv,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getLanguage } from '@/core/lang/languages';
import type { Level } from '@/core/lang/levels';
import { newsSources } from '@/core/lang/news';
import { STARTER_THEMES } from '@/core/lang/starter';
import { tipsFor } from '@/core/mundus/tips';
import { GROUP_KIND, withinReach } from '@/core/mundus/types';
import type { Pick, PickGroup, PickKind, Picks } from '@/core/mundus/types';
import { useChallenges } from '@/data/challenges';
import { starterKey, useStarterList } from '@/data/starter';
import { Drawer, Segmented } from '@/design/primitives';
import { useLayout } from '@/design/hooks/useLayout';
import { cx } from '@/lib/cx';
import { discoverFor } from '@/features/cantus/discover';
import { Artwork } from '@/features/sonus/library/Artwork';
import { TitleSheet } from '@/features/visio/services/TitleSheet';
import type { SheetTitle } from '@/features/visio/services/TitleSheet';
import { countryName as radioCountry } from '@/services/radio/stations';
import { freeCourses } from '@/services/sonus/courses';
import { openLibrivoxBook } from '@/services/sonus/librivox';
import { pickImageQuery, THEME_ARTICLE } from '@/services/mundus/images';
import { posterUrl } from '@/services/mundus/tmdb';
import { Art } from './Art';
import { toast } from '@/state/ui';
import { pickKey, useAudiobookPicks, usePickLookups, useRadioPicks, useStreaming } from './hooks';
import type { PickLookup } from './hooks';
import { PickCard } from './PicksView';
import { TIP_ICONS } from './TipsView';
import { sonusBase } from '@/features/sonus/paths';

/** The shelves, each named for the room its picks open in. `?shelf=` scrolls to one. */
export type ShelfId = 'watch' | 'read' | 'listen' | 'radio' | 'words' | 'play' | 'beyond';

const HUE: Record<string, string> = {
  series: '#c86d51',
  films: '#b56fa0',
  books: '#6b8e78',
  music: '#d49b54',
  podcasts: '#5f87a8',
  youtube: '#cf6a6a',
  games: '#8a7fb0',
  dictionaries: '#9a8466',
  news: '#4f93a0',
  words: '#7c8f4e',
};
const ICON: Record<PickGroup, LucideIcon> = { series: Tv, films: Film, books: BookOpen, podcasts: Podcast, youtube: MonitorPlay, games: Gamepad2, dictionaries: BookA };

const tint = (hue: string): CSSProperties => ({
  background: `linear-gradient(160deg, color-mix(in oklab, ${hue} 26%, var(--color-surface)), color-mix(in oklab, ${hue} 12%, var(--color-surface)))`,
  color: `color-mix(in oklab, ${hue} 80%, var(--color-ink))`,
});

type Reach = 'mine' | 'all';
interface Opened {
  pick: Pick;
  group: PickGroup;
}

/**
 * Mundus › Explore: something for every room, on shelves that scroll sideways. Each item opens
 * where it lives in Lingua: a series in Visio, a book in Codex, a podcast, audiobook, station or
 * artist in Sonus, a deck in Thesaurus.
 */
export function ExploreView({ lang, picks, level }: { lang: string; picks: Picks | null; level: Level }) {
  const [params] = useSearchParams();
  const [reach, setReach] = useState<Reach>('mine');
  const [opened, setOpened] = useState<Opened | null>(null);
  const [sheet, setSheet] = useState<SheetTitle | null>(null);
  const streaming = useStreaming();
  const lookups = usePickLookups(lang, picks, streaming.country, streaming.services.length ? streaming.token : '');
  const name = getLanguage(lang)?.name ?? lang;

  const fits = (p: Pick) => reach === 'all' || withinReach(p.level, level);
  const list = (group: PickGroup) => (picks?.[group] ?? []).filter(fits);

  const open = (pick: Pick, group: PickGroup) => {
    if (group === 'series' || group === 'films') {
      const lookup = lookups.get(pickKey(pick));
      setSheet({ pick, type: group === 'series' ? 'tv' : 'movie', tmdb: lookup?.title });
    } else setOpened({ pick, group });
  };

  // `?shelf=listen` (from a room's "Ideas from Mundus") brings that shelf into view.
  const wanted = params.get('shelf');
  useEffect(() => {
    if (!wanted) return;
    const t = window.setTimeout(() => document.getElementById(`shelf-${wanted}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
    return () => window.clearTimeout(t);
  }, [wanted]);

  const pickTile = (group: PickGroup) => (p: Pick) => <PickTile key={pickKey(p)} pick={p} group={group} lang={lang} lookup={lookups.get(pickKey(p))} onOpen={() => open(p, group)} />;

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-[15px] leading-relaxed text-ink-soft">Something for every room: tap one and it opens in Lingua, ready to watch, read, hear or study.</p>
        <Segmented<Reach>
          label="Level"
          value={reach}
          onChange={setReach}
          options={[
            { value: 'mine', label: 'For my level' },
            { value: 'all', label: 'Everything' },
          ]}
        />
      </div>


      <div className="mt-10 space-y-10">
        <Shelf id="watch" title="Watch" room="Sonus et Visio" icon={Clapperboard} more={picks ? '/mentis/picks?kind=series' : undefined}>
          {list('series').map(pickTile('series'))}
          {list('films').map(pickTile('films'))}
          {list('youtube').map(pickTile('youtube'))}
        </Shelf>

        <ReadShelf lang={lang} books={list('books')} tile={pickTile('books')} />

        <ListenShelf lang={lang} podcasts={list('podcasts')} tile={pickTile('podcasts')} />

        <RadioShelf lang={lang} level={level} reach={reach} />

        <WordsShelf lang={lang} />

        <Shelf id="play" title="Play and look up" icon={Gamepad2} more={picks ? '/mentis/picks?kind=games' : undefined}>
          {list('games').map(pickTile('games'))}
          {(picks?.dictionaries ?? []).map(pickTile('dictionaries'))}
        </Shelf>

        <BeyondShelf lang={lang} />
      </div>

      {!picks && (
        <p className="mt-10 text-[14px] leading-relaxed text-ink-faint">
          Series, films, books and podcasts picked by hand come with the twenty main languages. For {name}, Sonus et Visio › Streaming lists what streams in it on your services.
        </p>
      )}

      <Drawer open={Boolean(opened)} onClose={() => setOpened(null)} title={opened?.pick.title ?? ''}>
        {opened && <PickCard pick={opened.pick} kind={GROUP_KIND[opened.group]} lang={lang} level={level} hue={HUE[opened.group]} icon={ICON[opened.group]} />}
      </Drawer>
      <TitleSheet lang={lang} title={sheet} onClose={() => setSheet(null)} />
    </div>
  );
}

// ── Shelves ────────────────────────────────────────────────────────────────

function Shelf({ id, title, room, icon: Icon, more, children }: { id: ShelfId; title: string; room?: string; icon: LucideIcon; more?: string; children: ReactNode }) {
  const { pointer } = useLayout();
  const row = useRef<HTMLUListElement>(null);
  if (!Children.toArray(children).length) return null;
  const scroll = (dir: 1 | -1) => row.current?.scrollBy({ left: dir * row.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <section id={`shelf-${id}`} aria-label={title} className="scroll-mt-24">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-sunken text-ink-soft" aria-hidden>
          <Icon size={16} />
        </span>
        <h2 className="min-w-0 flex-1 font-serif text-[21px] leading-tight font-semibold">
          {title}
          {room && <span className="ml-2 align-middle text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">in {room}</span>}
        </h2>
        {pointer === 'fine' && (
          <span className="flex gap-1">
            <ArrowButton icon={ChevronLeft} label="Back" onClick={() => scroll(-1)} />
            <ArrowButton icon={ChevronRight} label="More" onClick={() => scroll(1)} />
          </span>
        )}
        {more && (
          <Link to={more} className="hit inline-flex shrink-0 items-center gap-0.5 text-[13px] font-semibold text-ink-soft hover:text-ink">
            See all <ChevronRight size={14} aria-hidden />
          </Link>
        )}
      </div>
      {/* No scroll anchoring: stations that arrive late go first without sliding the row. */}
      <ul ref={row} className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 [overflow-anchor:none] [scrollbar-width:none]">
        {children}
      </ul>
    </section>
  );
}

function ArrowButton({ icon: Icon, label: name, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={name} onClick={onClick} className="grid size-8 place-items-center rounded-full border border-line text-ink-soft transition-colors hover:border-line-strong hover:text-ink">
      <Icon size={16} aria-hidden />
    </button>
  );
}

/** One item on a shelf: its art (a poster, a cover, or a tinted card with its kind), name and a line. */
function Tile({ title, sub, art, tall, lang, titled, onClick }: { title: string; sub?: string; art: ReactNode; tall?: boolean; lang?: string; titled?: boolean; onClick: () => void }) {
  return (
    <li className="w-[124px] shrink-0 snap-start sm:w-36">
      <button type="button" onClick={onClick} aria-label={titled ? [title, sub].filter(Boolean).join(', ') : undefined} className="no-callout group block w-full text-left">
        <span className={cx('block overflow-hidden rounded-2xl shadow-elev-1 transition-transform duration-150 group-hover:-translate-y-0.5 group-active:scale-[0.97]', tall ? 'aspect-[2/3]' : 'aspect-square')}>{art}</span>
        {!titled && (
          <span lang={lang} className="mt-2 line-clamp-2 block text-[14px] leading-snug font-semibold">
            {title}
          </span>
        )}
        {sub && <span className={cx('block truncate text-[12.5px] text-ink-faint', titled ? 'mt-2' : 'mt-0.5')}>{sub}</span>}
      </button>
    </li>
  );
}

/** A cover drawn for an item without a picture: the kind's colour and icon, the title set in serif. */
function Cover({ hue, icon: Icon, title, lang }: { hue: string; icon: LucideIcon; title?: string; lang?: string }) {
  return (
    <span className={cx('flex size-full flex-col p-3', title ? 'justify-between' : 'items-center justify-center')} style={tint(hue)}>
      <Icon size={title ? 20 : 30} strokeWidth={1.7} aria-hidden />
      {title && (
        <span lang={lang} className="line-clamp-4 font-serif text-[15px] leading-tight font-semibold text-ink/85" aria-hidden>
          {title}
        </span>
      )}
    </span>
  );
}

function PickTile({ pick, group, lang, lookup, onOpen }: { pick: Pick; group: PickGroup; lang: string; lookup?: PickLookup; onOpen: () => void }) {
  const kind: PickKind = GROUP_KIND[group];
  const tall = kind === 'series' || kind === 'film' || kind === 'book';
  const poster = posterUrl(lookup?.title.posterPath, 'w185');
  const sub = [group === 'series' ? 'Series' : group === 'films' ? 'Film' : group === 'youtube' ? 'YouTube' : group === 'dictionaries' ? 'Dictionary' : pick.by, pick.level].filter(Boolean).join(' · ');
  return (
    <Tile
      title={pick.title}
      sub={sub}
      tall={tall}
      lang={group === 'dictionaries' ? undefined : lang}
      onClick={onOpen}
      art={poster ? <img src={poster} alt="" loading="lazy" decoding="async" className="size-full object-cover" /> : <Art query={pickImageQuery(pick, group, lang)} fit={group === 'dictionaries' ? 'contain' : 'cover'} fallback={<Cover hue={HUE[group]} icon={ICON[group]} />} />}
    />
  );
}

function ReadShelf({ lang, books, tile }: { lang: string; books: Pick[]; tile: (p: Pick) => ReactNode }) {
  const navigate = useNavigate();
  const news = newsSources(lang);
  return (
    <Shelf id="read" title="Read" room="Codex" icon={BookOpen} more={books.length ? '/mentis/picks?kind=books' : undefined}>
      {books.map(tile)}
      {news.map((s) => (
        <Tile key={s.id} title={s.name} sub="News · today’s articles" onClick={() => navigate('/codex/new?way=news')} art={<Art query={{ kind: 'wiki', q: `${s.name} newspaper`, must: s.name }} fit="contain" fallback={<Cover hue={HUE.news} icon={Newspaper} />} />} />
      ))}
    </Shelf>
  );
}

function ListenShelf({ lang, podcasts, tile }: { lang: string; podcasts: Pick[]; tile: (p: Pick) => ReactNode }) {
  const navigate = useNavigate();
  const books = useAudiobookPicks(lang);
  const courses = freeCourses(lang);
  const [opening, setOpening] = useState<string | null>(null);
  const openBook = async (identifier: string) => {
    setOpening(identifier);
    try {
      navigate(`${sonusBase()}/book/${await openLibrivoxBook(lang, identifier)}`);
    } catch {
      toast('LibriVox didn’t answer. Try again in a moment.', { tone: 'error' });
    } finally {
      setOpening(null);
    }
  };
  return (
    <Shelf id="listen" title="Listen" room="Sonus et Visio" icon={Headphones} more={podcasts.length ? '/mentis/picks?kind=podcasts' : undefined}>
      {podcasts.map(tile)}
      {books.map((b) => (
        <Tile
          key={b.identifier}
          title={b.title}
          sub={opening === b.identifier ? 'Opening…' : ['Audiobook', b.author].filter(Boolean).join(' · ')}
          tall
          onClick={() => void openBook(b.identifier)}
          art={<Artwork title={b.title} coverUrl={b.coverUrl} className="block size-full" rounded="rounded-none" />}
        />
      ))}
      {courses.map((c) => (
        <Tile key={c.url} title={c.name} sub={`Course · ${c.by}`} onClick={() => navigate('/sonus?tab=books')} art={<Cover hue={HUE.podcasts} icon={GraduationCap} />} />
      ))}
    </Shelf>
  );
}

function RadioShelf({ lang, level, reach }: { lang: string; level: Level; reach: Reach }) {
  const navigate = useNavigate();
  const stations = useRadioPicks(lang);
  const artists = (discoverFor(lang)?.artists ?? []).filter((a) => reach === 'all' || withinReach(a.ease === 'clear' ? 'A2' : a.ease === 'medium' ? 'B1' : 'B2', level));
  return (
    <Shelf id="radio" title="Radio and music" room="Sonus et Visio" icon={Radio}>
      {stations.map((s) => (
        <Tile
          key={s.id}
          title={s.name}
          sub={['Radio', radioCountry(s.countryCode, s.country)].filter(Boolean).join(' · ')}
          onClick={() => navigate(`${sonusBase()}/station/${s.id}`)}
          art={<Artwork title={s.name} coverUrl={s.favicon} className="block size-full" rounded="rounded-none" />}
        />
      ))}
      {artists.map((a) => (
        <Tile key={a.name} title={a.name} sub="Artist · songs in Sonus" onClick={() => navigate(`/sonus?tab=music&q=${encodeURIComponent(a.name)}`)} art={<Art query={{ kind: 'wiki', q: `${a.name} singer band`, must: a.name, lang }} fallback={<Cover hue={HUE.music} icon={Music2} />} />} />
      ))}
    </Shelf>
  );
}

function WordsShelf({ lang }: { lang: string }) {
  const navigate = useNavigate();
  const list = useStarterList(lang);
  if (!list) return null;
  const themes = STARTER_THEMES.filter((t) => (list.themes[t.id]?.length ?? 0) >= 8);
  return (
    <Shelf id="words" title="Words" room="Thesaurus" icon={Library} more="/thesaurus?tab=discover">
      {list.lemmaFreq.length >= 100 && (
        <Tile title="Top 100 words" sub="The words you meet most" onClick={() => navigate('/thesaurus/ready/' + starterKey({ kind: 'frequency', milestone: 100 }))} art={<Art query={{ kind: 'article', title: 'Dictionary' }} fallback={<Cover hue={HUE.words} icon={Library} />} />} />
      )}
      {themes.map((t) => (
        <Tile key={t.id} title={t.name} sub={`${list.themes[t.id].length} words`} onClick={() => navigate('/thesaurus/ready/' + starterKey({ kind: 'theme', id: t.id }))} art={<Art query={THEME_ARTICLE[t.id] ? { kind: 'article', title: THEME_ARTICLE[t.id] } : null} fallback={<Cover hue={HUE.words} icon={BookHeadphones} />} />} />
      ))}
    </Shelf>
  );
}

function BeyondShelf({ lang }: { lang: string }) {
  const navigate = useNavigate();
  const done = useChallenges(lang);
  const tips = useMemo(() => tipsFor(lang), [lang]);
  const doneIds = new Set((done ?? []).map((r) => r.tipId));
  const open = tips.filter((t) => !doneIds.has(t.id)).slice(0, 10);
  return (
    <Shelf id="beyond" title="Beyond the app" icon={Sparkles} more="/mentis/try">
      {open.map((t) => (
        <Tile key={t.id} title={t.title} sub="A small challenge" onClick={() => navigate('/mentis/try')} art={<Cover hue="#6b8e78" icon={TIP_ICONS[t.icon]} />} />
      ))}
    </Shelf>
  );
}
