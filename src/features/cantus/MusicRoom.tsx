import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ChevronRight, Heart, LoaderCircle, Music2, Pause, Play, SearchX } from 'lucide-react';
import { useApp } from '@/app/context';
import { formatClock } from '@/core/audio/cues';
import { getLanguage } from '@/core/lang/languages';
import { openSong, useRecentSongs, useSavedSongs } from '@/data/songs';
import type { Song } from '@/data/types';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { useLayout } from '@/design/hooks/useLayout';
import { buttonClasses, Card, SearchInput } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { pause as pauseSonus, usePlayer } from '@/services/audio/engine';
import { searchSongs } from '@/services/cantus/catalog';
import type { SongHit } from '@/services/cantus/catalog';
import { toast } from '@/state/ui';
import { DISCOVER, EASE_LABEL } from './discover';
import { openByName, useCharts, useSpotifyLikes } from './library';
import type { ChartSong } from './library';
import { SongArt } from './SongArt';

const enter = (i: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { ...spring.soft, delay: 0.04 * Math.min(i, 8) } });
const label = 'text-[12px] font-bold tracking-[0.14em] text-ink-faint uppercase';

/**
 * Music in Sonus (Cantus, learning through music): find any song in the language, sing along with its
 * lyrics (every word tappable, a translation under each line), keep the songs you love, and discover
 * this week's charts, artists and styles. One room, from your own songs to new ones.
 */
export function MusicRoom({ initialQuery = '' }: { initialQuery?: string }) {
  const { language } = useApp();
  const lang = language.id;
  const { pointer } = useLayout();
  const saved = useSavedSongs(lang);
  const recent = useRecentSongs(lang, 10);
  const connected = Boolean(useApp().settings.spotify.refreshToken);

  const [query, setQuery] = useState(initialQuery);
  const [byArtist, setByArtist] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  useHotkeys({ '/': () => searchRef.current?.focus() }, pointer === 'fine');
  const searchFor = (term: string, artist = false) => {
    setByArtist(artist);
    setQuery(term);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="music-room">
      <SearchInput ref={searchRef} value={query} onChange={(q) => searchFor(q, false)} placeholder={`Search songs or artists in ${getLanguage(lang)?.name ?? lang}`} className="mb-7" />
      {query.trim() ? (
        <SearchResults lang={lang} query={query.trim()} byArtist={byArtist} />
      ) : (
        <div className="space-y-10">
          <YourSongs lang={lang} saved={saved} recent={recent} />
          <DiscoverTab lang={lang} onSearch={searchFor} between={connected ? <SpotifyLikes lang={lang} /> : <SpotifyInvite />} />
        </div>
      )}
    </div>
  );
}

// ── Search ──────────────────────────────────────────────────────────────────────────────────────

function useOpen(lang: string) {
  const navigate = useNavigate();
  const [opening, setOpening] = useState<string | null>(null);
  const open = async (key: string, get: () => Promise<string>) => {
    setOpening(key);
    try {
      navigate(`/sonus/song/${encodeURIComponent(await get())}`);
    } catch {
      toast('That song couldn’t be opened. Try again in a moment.', { tone: 'error' });
    } finally {
      setOpening(null);
    }
  };
  return { opening, openHit: (hit: SongHit) => open(String(hit.itunesId), () => openSong(lang, hit)), open };
}

function SearchResults({ lang, query, byArtist }: { lang: string; query: string; byArtist: boolean }) {
  const [hits, setHits] = useState<SongHit[] | null>(null);
  const [error, setError] = useState(false);
  const { opening, openHit } = useOpen(lang);
  useEffect(() => {
    let alive = true;
    setError(false);
    const timer = window.setTimeout(() => {
      setHits(null);
      searchSongs(lang, query, { byArtist })
        .then((h) => alive && setHits(h))
        .catch(() => alive && setError(true));
    }, 320);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [lang, query, byArtist]);

  if (error) return <p className="py-10 text-center text-[15px] text-ink-soft">Apple’s music search didn’t answer. Check the connection and try again.</p>;
  if (!hits) return <SkeletonRows />;
  if (!hits.length) {
    return (
      <div className="py-12 text-center text-ink-soft">
        <SearchX size={26} className="mx-auto mb-2 text-ink-faint" aria-hidden />
        No songs found for “{query}”.
      </div>
    );
  }
  return (
    <ul className="overflow-hidden rounded-3xl border border-line/70 bg-surface">
      {hits.map((hit, i) => (
        <motion.li key={hit.itunesId} {...enter(i)} className={cx(i > 0 && 'border-t border-line/60')}>
          <HitRow hit={hit} busy={opening === String(hit.itunesId)} onOpen={() => void openHit(hit)} />
        </motion.li>
      ))}
    </ul>
  );
}

function HitRow({ hit, busy, onOpen }: { hit: SongHit; busy: boolean; onOpen: () => void }) {
  const meta = [hit.album, hit.year].filter(Boolean).join(' · ');
  return (
    <div className="flex items-center gap-3 py-2.5 pr-3 pl-3">
      <PreviewArt url={hit.artworkUrl} preview={hit.previewUrl} title={hit.title} />
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{hit.title}</span>
          <span className="block truncate text-[13px] text-ink-soft">
            {hit.artist}
            {meta && ` · ${meta}`}
          </span>
        </span>
        {hit.durationMs && <span className="hidden text-[12.5px] text-ink-faint tabular-nums sm:inline">{formatClock(hit.durationMs)}</span>}
        {busy ? <LoaderCircle size={18} className="shrink-0 animate-spin text-ink-faint" aria-hidden /> : <ChevronRight size={18} className="shrink-0 text-ink-faint" aria-hidden />}
      </button>
    </div>
  );
}

let previewAudio: HTMLAudioElement | null = null;
let stopPreview: (() => void) | null = null;

/** Artwork that plays Apple's 30-second preview when tapped. */
function PreviewArt({ url, preview, title }: { url?: string; preview?: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => void (playing && previewAudio?.pause()), [playing]);
  const toggle = () => {
    if (!preview) return;
    if (playing) {
      previewAudio?.pause();
      setPlaying(false);
      return;
    }
    stopPreview?.();
    previewAudio ??= new Audio();
    previewAudio.src = preview;
    previewAudio.onended = () => setPlaying(false);
    if (usePlayer.getState().status === 'playing') pauseSonus();
    void previewAudio.play().then(() => {
      setPlaying(true);
      stopPreview = () => setPlaying(false);
    });
  };
  return (
    <button type="button" onClick={toggle} disabled={!preview} aria-label={playing ? 'Stop the preview' : `Hear a preview of ${title}`} className="group relative shrink-0">
      <SongArt url={url} title={title} className="w-12" rounded="rounded-lg" size={100} />
      {preview && (
        <span className={cx('absolute inset-0 grid place-items-center rounded-lg bg-black/35 text-white transition-opacity', playing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 pointer-coarse:opacity-0')}>
          {playing ? <Pause size={18} className="fill-current" aria-hidden /> : <Play size={18} className="fill-current" aria-hidden />}
        </span>
      )}
    </button>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2" aria-label="Searching">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl p-2">
          <div className="size-12 animate-pulse rounded-lg bg-sunken" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-2/5 animate-pulse rounded bg-sunken" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-sunken" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Your songs ──────────────────────────────────────────────────────────────────────────────────

function SongTile({ song, i }: { song: Song; i: number }) {
  const tint = song.palette ? { '--song': song.palette.base } : undefined;
  return (
    <motion.li {...enter(i)} className="min-w-0">
      <Link to={`/sonus/song/${encodeURIComponent(song.id)}`} className="group block" style={tint as CSSProperties}>
        <SongArt url={song.artworkUrl} title={song.title} className="song-art w-full transition-transform duration-300 group-hover:-translate-y-0.5 group-active:scale-[0.98]" rounded="rounded-2xl" size={400} />
        <span className="mt-2 block truncate text-[14.5px] leading-snug font-semibold">{song.title}</span>
        <span className="block truncate text-[13px] text-ink-soft">{song.artist}</span>
      </Link>
    </motion.li>
  );
}

function YourSongs({ lang, saved, recent }: { lang: string; saved?: Song[]; recent?: Song[] }) {
  if (!saved || !recent) return null;
  const others = recent.filter((s) => !s.savedAt);
  return (
    <div className="space-y-9">
      {saved.length ? (
        <section aria-label="Your songs">
          <h2 className={cx(label, 'mb-3')}>Your songs</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {saved.map((s, i) => (
              <SongTile key={s.id} song={s} i={i} />
            ))}
          </ul>
        </section>
      ) : (
        <Card className="flex items-center gap-4 p-5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--cantus-soft)] text-[var(--cantus-text)]">
            <Heart size={22} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-serif text-lg font-semibold">Songs you love, in {getLanguage(lang)?.name}</span>
            <span className="block text-[14px] leading-snug text-ink-soft">Search for one above, or pick from the charts and artists below. Save it with the heart and it lives here, lyrics and all.</span>
          </span>
        </Card>
      )}
      {others.length > 0 && (
        <section aria-label="Recently opened">
          <h2 className={cx(label, 'mb-3')}>Recently opened</h2>
          <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">
            {others.map((s) => (
              <li key={s.id} className="w-32 shrink-0 snap-start sm:w-36">
                <Link to={`/sonus/song/${encodeURIComponent(s.id)}`} className="block">
                  <SongArt url={s.artworkUrl} title={s.title} className="w-full" rounded="rounded-xl" size={300} />
                  <span className="mt-1.5 block truncate text-[13.5px] font-semibold">{s.title}</span>
                  <span className="block truncate text-[12.5px] text-ink-soft">{s.artist}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SpotifyInvite() {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#1db954]/15 text-[#1a8f45]">
        <Music2 size={20} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Your Spotify liked songs</p>
        <p className="text-[13.5px] text-ink-soft">Connect your own free Spotify app and Lingua finds the ones sung in this language.</p>
      </div>
      <Link to="/ordo/music" className={cx(buttonClasses('secondary', 'sm'), 'shrink-0')}>
        Set up
      </Link>
    </Card>
  );
}

function SpotifyLikes({ lang }: { lang: string }) {
  const scan = useSpotifyLikes(lang, true);
  const { opening, open } = useOpen(lang);
  return (
    <section aria-label="From your Spotify">
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className={cx(label, 'flex-1')}>From your Spotify</h2>
        {scan && !scan.done && (
          <span className="flex items-center gap-1.5 text-[12.5px] text-ink-faint">
            <LoaderCircle size={13} className="animate-spin" aria-hidden /> Checking {scan.checked} of {scan.total}
          </span>
        )}
      </div>
      {scan?.error && <p className="mb-3 text-[13.5px] text-accent-text">{scan.error}</p>}
      {scan && scan.done && !scan.tracks.length && !scan.error && (
        <p className="text-[14px] text-ink-soft">None of your liked songs seem to be sung in {getLanguage(lang)?.name} yet.</p>
      )}
      {!!scan?.tracks.length && (
        <ul className="overflow-hidden rounded-3xl border border-line/70 bg-surface">
          {scan.tracks.map((t, i) => {
            const art = t.album?.images?.find((im) => (im.width ?? 0) <= 320)?.url ?? t.album?.images?.[0]?.url;
            return (
              <li key={t.id} className={cx(i > 0 && 'border-t border-line/60')}>
                <button
                  type="button"
                  onClick={() => void open(t.id, () => openByName(lang, t.name, t.artists[0]?.name ?? '', { spotifyId: t.id, cover: art, durationMs: t.duration_ms }))}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-sunken/50"
                >
                  <SongArt url={art} title={t.name} className="w-12" rounded="rounded-lg" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{t.name}</span>
                    <span className="block truncate text-[13px] text-ink-soft">{t.artists.map((a) => a.name).join(', ')}</span>
                  </span>
                  {opening === t.id ? <LoaderCircle size={18} className="animate-spin text-ink-faint" aria-hidden /> : <ChevronRight size={18} className="text-ink-faint" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ── Discover ────────────────────────────────────────────────────────────────────────────────────

/** This week's charts, then (between) your Spotify, then artists and styles to explore. */
function DiscoverTab({ lang, onSearch, between }: { lang: string; onSearch: (term: string, byArtist?: boolean) => void; between?: ReactNode }) {
  const picks = DISCOVER[lang];
  const charts = useCharts(lang);
  const { opening, open } = useOpen(lang);
  const where = charts ? [...new Set(charts.songs.map((s) => s.where))] : [];
  return (
    <div className="space-y-9">
      {charts && (
        <section aria-label="Charts">
          <div className="mb-3 flex items-baseline gap-3">
            <h2 className={cx(label, 'flex-1')}>Most played now</h2>
            <span className="truncate text-[12.5px] text-ink-faint">in {where.join(', ')}</span>
          </div>
          <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">
            {charts.songs.map((s, i) => (
              <ChartTile key={`${s.title}|${s.artist}`} song={s} rank={i + 1} busy={opening === `${s.title}|${s.artist}`} onOpen={() => void open(`${s.title}|${s.artist}`, () => openByName(lang, s.title, s.artist, { cover: s.cover, durationMs: s.durationMs }))} />
            ))}
          </ul>
        </section>
      )}
      {between}
      {picks && (
        <>
          <section aria-label="Artists to start with">
            <h2 className={cx(label, 'mb-3')}>Artists to learn with</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {picks.artists.map((a, i) => (
                <motion.li key={a.name} {...enter(i)}>
                  <button type="button" onClick={() => onSearch(a.name, true)} className="flex w-full items-center gap-3 rounded-2xl border border-line/70 bg-surface p-3.5 text-left transition-colors hover:bg-raised active:scale-[0.99]">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft font-serif text-[17px] font-semibold text-accent-text" aria-hidden>
                      {a.name.replace(/^(the|los|las|la|le|les|die|il|i)\s+/i, '').charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{a.name}</span>
                      <span className="block text-[13px] leading-snug text-ink-soft">{a.why}</span>
                    </span>
                    <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold', a.ease === 'clear' ? 'bg-sage-soft text-sage-text' : a.ease === 'fast' ? 'bg-accent-soft text-accent-text' : 'bg-sunken text-ink-soft')}>
                      {EASE_LABEL[a.ease]}
                    </span>
                  </button>
                </motion.li>
              ))}
            </ul>
          </section>
          <section aria-label="Styles">
            <h2 className={cx(label, 'mb-3')}>Styles to explore</h2>
            <div className="flex flex-wrap gap-2">
              {picks.styles.map(([name, term]) => (
                <button key={term} type="button" onClick={() => onSearch(term)} className="rounded-full border border-line bg-surface px-4 py-2 text-[14px] font-semibold transition-colors hover:bg-raised active:scale-[0.97]">
                  {name}
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function ChartTile({ song, rank, busy, onOpen }: { song: ChartSong; rank: number; busy: boolean; onOpen: () => void }) {
  return (
    <li className="w-32 shrink-0 snap-start sm:w-36">
      <button type="button" onClick={onOpen} className="group block w-full text-left">
        <span className="relative block">
          <img src={song.cover} alt="" loading="lazy" className="aspect-square w-full rounded-xl bg-sunken object-cover transition-transform group-active:scale-[0.97]" />
          <span className="absolute top-1.5 left-1.5 grid min-w-6 place-items-center rounded-full bg-black/55 px-1.5 text-[11.5px] font-bold text-white tabular-nums">{rank}</span>
          {busy && (
            <span className="absolute inset-0 grid place-items-center rounded-xl bg-black/30 text-white">
              <LoaderCircle size={20} className="animate-spin" aria-hidden />
            </span>
          )}
        </span>
        <span className="mt-1.5 block truncate text-[13.5px] font-semibold">{song.title}</span>
        <span className="block truncate text-[12.5px] text-ink-soft">{song.artist}</span>
      </button>
    </li>
  );
}
