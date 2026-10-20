// Search in Cantus: live as you type, from Apple, LRCLIB and your Spotify at once (see
// services/cantus/search.ts). A top result, then songs, artists and albums; chips to keep one kind;
// recent searches and styles to browse while the field is empty. Enter opens the top result.
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { History, LoaderCircle, Pause, Play, SearchX, X } from 'lucide-react';
import { useApp } from '@/app/context';
import { formatClock } from '@/core/audio/cues';
import { getLanguage } from '@/core/lang/languages';
import { SearchInput } from '@/design/primitives';
import { cx } from '@/lib/cx';
import type { SongHit } from '@/services/cantus/catalog';
import { searchCatalog, spotifyKnown } from '@/services/cantus/search';
import type { AlbumHit, ArtistHit, CatalogResults } from '@/services/cantus/search';
import { discoverFor } from '../discover';
import { SongArt } from '../SongArt';
import { useOpenSong, usePreview } from './open';
import { enter, hueOf, RoomTitle, SkeletonTiles, StyleGrid } from './rails';

type Kind = 'all' | 'songs' | 'artists' | 'albums';
const KINDS: Array<[Kind, string]> = [
  ['all', 'All'],
  ['songs', 'Songs'],
  ['artists', 'Artists'],
  ['albums', 'Albums'],
];

const RECENT = 'lingua.cantus.searches';
function recentSearches(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT) ?? '[]') as unknown;
    return Array.isArray(list) ? list.filter((s): s is string => typeof s === 'string').slice(0, 8) : [];
  } catch {
    return [];
  }
}
function keepRecent(list: string[]): void {
  try {
    localStorage.setItem(RECENT, JSON.stringify(list.slice(0, 8)));
  } catch {
    // Private mode or full: no recent searches.
  }
}

export function SearchPage() {
  const { language, settings } = useApp();
  const lang = language.id;
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [exact, setExact] = useState(false);
  const [kind, setKind] = useState<Kind>('all');
  const q = query.trim();
  // The address follows the field (only while Search is the page: under a song it's the song's).
  const shown = useLocation().pathname.replace(/\/+$/, '') === '/cantus/search';
  useEffect(() => {
    if (shown && (params.get('q') ?? '') !== q) setParams(q ? { q } : {}, { replace: true });
  }, [shown, q, params, setParams]);
  useEffect(() => setExact(false), [q]);

  const [recent, setRecent] = useState(recentSearches);
  const remember = (term: string) => {
    const next = [term, ...recent.filter((r) => r.toLocaleLowerCase() !== term.toLocaleLowerCase())];
    setRecent(next.slice(0, 8));
    keepRecent(next);
  };
  const forget = (term?: string) => {
    const next = term ? recent.filter((r) => r !== term) : [];
    setRecent(next);
    keepRecent(next);
  };

  const connected = Boolean(settings.spotify.refreshToken);
  const [results, setResults] = useState<CatalogResults | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'failed'>('idle');
  useEffect(() => {
    if (!q) {
      setResults(null);
      setState('idle');
      return;
    }
    const ctl = new AbortController();
    setState('loading');
    // Waits for a pause in typing; a new letter stops the search before it.
    const timer = window.setTimeout(() => {
      searchCatalog(lang, q, { signal: ctl.signal, exact, known: connected ? spotifyKnown : undefined })
        .then((r) => {
          setResults(r);
          setState('idle');
        })
        .catch(() => !ctl.signal.aborted && setState('failed'));
    }, 220);
    return () => {
      window.clearTimeout(timer);
      ctl.abort();
    };
  }, [lang, q, exact, connected]);

  const { opening, openHit } = useOpenSong(lang);
  const open = (hit: SongHit) => {
    remember(q);
    void openHit(hit);
  };
  const pickArtist = (a: ArtistHit) => {
    remember(q);
    setQuery(a.name);
    setKind('all');
  };
  const pickAlbum = (a: AlbumHit) => {
    remember(q);
    setQuery(`${a.name} ${a.artist}`);
    setKind('songs');
  };
  const current = results && fold(results.query) === fold(q) ? results : null;
  const submit = () => {
    const top = current?.top;
    if (!top) return;
    if (top.kind === 'song') open(top.song);
    else pickArtist(top.artist);
  };

  const picks = discoverFor(lang);
  return (
    <>
      <RoomTitle>Search</RoomTitle>
      <form
        role="search"
        className="mb-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <SearchInput value={query} onChange={setQuery} placeholder={`Songs, artists or albums in ${getLanguage(lang)?.name ?? lang}`} onClose={q ? () => setQuery('') : undefined} autoFocus={!q} />
      </form>

      {!q ? (
        <>
          {recent.length > 0 && (
            <section aria-label="Recent searches" className="room-section">
              <div className="room-head">
                <h2>Recent searches</h2>
                <button type="button" onClick={() => forget()} className="ml-auto text-[13px] font-semibold text-ink-faint hover:text-ink">
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.map((term) => (
                  <span key={term} className="room-pill-glass flex h-9 items-center rounded-full pl-3 text-[14px] font-semibold">
                    <button type="button" onClick={() => setQuery(term)} className="flex items-center gap-1.5">
                      <History size={14} className="text-ink-faint" aria-hidden /> {term}
                    </button>
                    <button type="button" aria-label={`Forget ${term}`} onClick={() => forget(term)} className="grid size-9 place-items-center text-ink-faint hover:text-ink">
                      <X size={14} aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
            </section>
          )}
          {picks && picks.styles.length > 0 && <StyleGrid styles={picks.styles} onPick={setQuery} />}
        </>
      ) : (
        <>
          <div className="mb-5 flex gap-2" role="group" aria-label="Show">
            {KINDS.map(([k, label]) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={cx('h-9 rounded-full px-4 text-[14px] font-bold transition-colors', kind === k ? 'bg-[var(--room-pill)] text-[var(--room-pill-ink)]' : 'bg-[var(--room-fill)] text-[var(--room-soft)] hover:bg-[var(--room-fill-strong)]')}>
                {label}
              </button>
            ))}
          </div>
          {current?.corrected && !exact && (
            <p className="mb-5 text-[14px] text-ink-soft">
              Showing results for <b className="text-ink">{current.corrected}</b>.{' '}
              <button type="button" onClick={() => setExact(true)} className="font-semibold text-[var(--room-rose)] hover:underline">
                Search for “{q}” instead
              </button>
            </p>
          )}
          {state === 'failed' ? (
            <p className="py-10 text-center text-[15px] text-ink-soft">The music search didn’t answer. Check the connection and try again.</p>
          ) : !current ? (
            <SkeletonTiles label="Searching" />
          ) : !current.songs.length && !current.artists.length && !current.albums.length ? (
            <div className="py-12 text-center text-ink-soft">
              <SearchX size={26} className="mx-auto mb-2 text-ink-faint" aria-hidden />
              Nothing for “{q}”. Try the song’s name with the artist’s.
            </div>
          ) : (
            <Found results={current} kind={kind} lang={lang} opening={opening} onOpen={open} onArtist={pickArtist} onAlbum={pickAlbum} onKind={setKind} />
          )}
        </>
      )}
    </>
  );
}

const fold = (s: string) => s.trim().toLocaleLowerCase();

function Found({
  results,
  kind,
  lang,
  opening,
  onOpen,
  onArtist,
  onAlbum,
  onKind,
}: {
  results: CatalogResults;
  kind: Kind;
  lang: string;
  opening: string | null;
  onOpen: (hit: SongHit) => void;
  onArtist: (a: ArtistHit) => void;
  onAlbum: (a: AlbumHit) => void;
  onKind: (k: Kind) => void;
}) {
  const [more, setMore] = useState(false);
  useEffect(() => setMore(false), [results, kind]);
  const busy = (hit: SongHit) => opening === String(hit.itunesId);
  const songs = kind === 'all' ? results.songs.slice(0, 6) : more ? results.songs : results.songs.slice(0, 20);
  const head = (title: string, k: Kind, count: number) => (
    <div className="room-head">
      <h2>{title}</h2>
      {kind === 'all' && count > (k === 'songs' ? 6 : 0) && (
        <button type="button" onClick={() => onKind(k)} className="ml-auto text-[13px] font-semibold text-ink-faint hover:text-ink">
          See all
        </button>
      )}
    </div>
  );
  return (
    <>
      {kind === 'all' && results.top ? (
        <div className="room-section grid gap-6 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
          <section aria-label="Top result">
            <h2 className="room-head">Top result</h2>
            <TopCard results={results} lang={lang} busy={results.top.kind === 'song' && busy(results.top.song)} onOpen={onOpen} onArtist={onArtist} />
          </section>
          {results.songs.length > 0 && (
            <section aria-label="Songs" className="min-w-0">
              {head('Songs', 'songs', results.songs.length)}
              <SongRows songs={songs.slice(0, 5)} lang={lang} busy={busy} onOpen={onOpen} />
            </section>
          )}
        </div>
      ) : (
        (kind === 'all' || kind === 'songs') &&
        results.songs.length > 0 && (
          <section aria-label="Songs" className="room-section">
            {head('Songs', 'songs', results.songs.length)}
            <SongRows songs={songs} lang={lang} busy={busy} onOpen={onOpen} />
            {kind === 'songs' && !more && results.songs.length > 20 && (
              <button type="button" onClick={() => setMore(true)} className="room-pill-glass mt-3 h-10 rounded-full px-5 text-[14px] font-semibold">
                Show more
              </button>
            )}
          </section>
        )
      )}
      {(kind === 'all' || kind === 'artists') && results.artists.length > 0 && (
        <section aria-label="Artists" className="room-section">
          {head('Artists', 'artists', kind === 'all' ? results.artists.length : 0)}
          <ul className={cx(kind === 'all' ? 'room-rail' : 'room-grid', 'is-round')}>
            {results.artists.map((a, i) => (
              <motion.li key={a.artistId} {...enter(i)}>
                <button type="button" onClick={() => onArtist(a)} className="group block w-full text-center">
                  <span className="room-face transition-transform duration-150 group-active:scale-[0.97]" style={{ '--hue': hueOf(a.name) } as CSSProperties} aria-hidden>
                    {a.name.charAt(0)}
                  </span>
                  <span className="mt-2 block truncate text-[13.5px] font-bold">{a.name}</span>
                  <span className="block text-[12px] text-ink-faint">Artist</span>
                </button>
              </motion.li>
            ))}
          </ul>
        </section>
      )}
      {(kind === 'all' || kind === 'albums') && results.albums.length > 0 && (
        <section aria-label="Albums" className="room-section">
          {head('Albums', 'albums', kind === 'all' ? results.albums.length : 0)}
          <ul className={kind === 'all' ? 'room-rail' : 'room-grid'}>
            {results.albums.map((a, i) => (
              <motion.li key={a.collectionId} {...enter(i)}>
                <button type="button" onClick={() => onAlbum(a)} className="group block w-full text-left">
                  <SongArt url={a.artworkUrl} title={a.name} className="room-art w-full transition-transform duration-150 group-active:scale-[0.97]" rounded="rounded-xl" size={400} />
                  <span className="mt-2 block truncate text-[14px] font-bold">{a.name}</span>
                  <span className="block truncate text-[12.5px] text-ink-faint">{[a.single ? 'Single' : 'Album', a.year, a.artist].filter(Boolean).join(' · ')}</span>
                </button>
              </motion.li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function TopCard({ results, lang, busy, onOpen, onArtist }: { results: CatalogResults; lang: string; busy: boolean; onOpen: (hit: SongHit) => void; onArtist: (a: ArtistHit) => void }) {
  const top = results.top!;
  if (top.kind === 'artist') {
    const a = top.artist;
    return (
      <button type="button" onClick={() => onArtist(a)} className="flex w-full flex-col items-start gap-4 rounded-[20px] bg-[var(--room-fill)] p-5 text-left transition-colors hover:bg-[var(--room-fill-strong)]">
        <span className="room-face w-24 text-[34px]" style={{ '--hue': hueOf(a.name) } as CSSProperties} aria-hidden>
          {a.name.charAt(0)}
        </span>
        <span>
          <span className="block text-[26px] leading-tight font-extrabold">{a.name}</span>
          <span className="text-[13.5px] text-ink-soft">Artist{a.genre ? ` · ${a.genre}` : ''}</span>
        </span>
      </button>
    );
  }
  const s = top.song;
  return (
    <div className="relative flex flex-col items-start gap-4 rounded-[20px] bg-[var(--room-fill)] p-5">
      <SongArt url={s.artworkUrl} title={s.title} className="room-art w-24" rounded="rounded-xl" size={300} />
      <span className="min-w-0">
        <span lang={lang} className="line-clamp-2 block text-[24px] leading-tight font-extrabold">
          {s.title}
        </span>
        <span className="block truncate text-[13.5px] text-ink-soft">Song · {s.artist}</span>
      </span>
      <button type="button" onClick={() => onOpen(s)} aria-label={`Open ${s.title}`} className="room-pill-light absolute right-5 bottom-5 grid size-12 place-items-center rounded-full shadow-elev-1 transition-transform active:scale-90">
        {busy ? <LoaderCircle size={20} className="animate-spin" aria-hidden /> : <Play size={20} className="translate-x-px fill-current" aria-hidden />}
      </button>
    </div>
  );
}

function SongRows({ songs, lang, busy, onOpen }: { songs: SongHit[]; lang: string; busy: (hit: SongHit) => boolean; onOpen: (hit: SongHit) => void }) {
  return (
    <ul className="-mx-2">
      {songs.map((hit) => (
        <SongRow key={hit.itunesId} hit={hit} lang={lang} busy={busy(hit)} onOpen={() => onOpen(hit)} />
      ))}
    </ul>
  );
}

function SongRow({ hit, lang, busy, onOpen }: { hit: SongHit; lang: string; busy: boolean; onOpen: () => void }) {
  const { playing, toggle } = usePreview(hit.previewUrl);
  return (
    <li className="flex items-center gap-1 rounded-xl px-2 transition-colors hover:bg-[var(--room-fill)]">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 py-2 text-left">
        <span className="relative shrink-0">
          <SongArt url={hit.artworkUrl} title={hit.title} className="size-12" rounded="rounded-lg" size={200} />
          {busy && (
            <span className="absolute inset-0 grid place-items-center rounded-lg bg-black/40 text-white">
              <LoaderCircle size={16} className="animate-spin" aria-hidden />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span lang={lang} className="block truncate text-[15px] font-bold">
            {hit.title}
          </span>
          <span className="block truncate text-[13px] text-ink-faint">{[hit.artist, hit.album].filter(Boolean).join(' · ')}</span>
        </span>
        {hit.durationMs && <span className="hidden text-[12.5px] text-ink-faint tabular-nums sm:block">{formatClock(hit.durationMs)}</span>}
      </button>
      {hit.previewUrl && (
        <button type="button" onClick={toggle} aria-label={playing ? 'Stop the 30-second preview' : `Hear a 30-second preview of ${hit.title}`} title="30-second preview" className="grid size-11 shrink-0 place-items-center rounded-full text-ink-soft hover:text-ink">
          {playing ? <Pause size={17} className="fill-current" aria-hidden /> : <Play size={17} className="fill-current" aria-hidden />}
        </button>
      )}
    </li>
  );
}
