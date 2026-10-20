// Cantus, the music room: an app inside the app. Its own dark ground, its own tabs (Today, Explore,
// Library, Search), and a player that stays open while the learner browses, folded into the
// now-playing bar. The X leaves for Sonus › Music; Lingua's own chrome never shows in here.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Compass, Library, Pause, Play, Search, Sun, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLayout } from '@/design/hooks/useLayout';
import { cx } from '@/lib/cx';
import SongGames from '../SongGames';
import { SongArt } from '../SongArt';
import { SongPlayer } from '../SongPage';
import { roomSongOf, roomTabOf, ROOM_TABS, songPath, useLeaveCantus, useRoomNav } from './nav';
import type { RoomTab } from './nav';
import { keptPlace, useCantusNow } from './now';
import { ExplorePage, LibraryPage, TodayPage } from './pages';
import { SearchPage } from './search';
import { useRoomTheme } from './useRoomTheme';

const TAB_ICON: Record<RoomTab, LucideIcon> = { today: Sun, explore: Compass, library: Library, search: Search };

export default function CantusRoom() {
  useRoomTheme();
  const { pathname } = useLocation();
  const { layout } = useLayout();
  const wide = layout === 'wide';
  const routeTab = roomTabOf(pathname);
  const songId = roomSongOf(pathname);
  const games = Boolean(songId) && /\/games\/?$/.test(pathname);
  const { tab: lastTab, setTab } = useRoomNav();
  useEffect(() => {
    if (routeTab) setTab(routeTab);
  }, [routeTab, setTab]);
  const tab = routeTab ?? lastTab;

  // The song in the player: the one opened, or the one left playing last time (folded away).
  const [openId, setOpenId] = useState<string | undefined>(() => songId ?? keptPlace()?.songId);
  useEffect(() => {
    if (songId) setOpenId(songId);
  }, [songId]);
  const expanded = Boolean(songId) && !games;

  // Each tab starts at its top.
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  const song = useCantusNow((s) => s.song);
  const tint = song?.palette ? ({ '--song': song.palette.base, '--song-deep': song.palette.deep } as CSSProperties) : undefined;

  return (
    <div className="cantus-room" style={tint}>
      <div className={cx('cantus-backdrop', song?.palette && 'has-song')} aria-hidden>
        <span className="cantus-glow-rose" />
        <span className="cantus-glow-song" />
      </div>
      <div inert={expanded || games} aria-hidden={expanded || games}>
        {wide ? <TopBar tab={tab} /> : <PhoneHeader />}
        <main ref={mainRef} className="cantus-room-main">
          {tab === 'today' && <TodayPage />}
          {tab === 'explore' && <ExplorePage />}
          {tab === 'library' && <LibraryPage />}
          {tab === 'search' && <SearchPage />}
        </main>
        {!wide && <TabBar tab={tab} />}
      </div>
      {openId && <SongPlayer songId={openId} collapsed={!expanded} onGone={() => setOpenId(undefined)} />}
      {!expanded && !games && <NowPlayingBar wide={wide} />}
      {games && songId && (
        <div className="cantus-games fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal aria-label="Song games">
          <div className="mx-auto max-w-[620px] px-5 pt-[calc(env(safe-area-inset-top)+12px)] pb-16">
            <SongGames songId={songId} />
          </div>
        </div>
      )}
    </div>
  );
}

function CloseRoom({ className }: { className?: string }) {
  const leave = useLeaveCantus();
  return (
    <button type="button" onClick={leave} aria-label="Leave Cantus" title="Back to Lingua" className={cx('grid size-10 shrink-0 place-items-center rounded-full bg-[var(--room-fill)] text-[var(--room-soft)] transition-colors hover:bg-[var(--room-fill-strong)] hover:text-[var(--room-ink)] pointer-coarse:size-11', className)}>
      <X size={19} aria-hidden />
    </button>
  );
}

function Wordmark() {
  return (
    <span className="flex items-center gap-2.5 text-[19px] font-extrabold tracking-[-0.02em]">
      <span className="grid size-8 place-items-center rounded-[10px] bg-[linear-gradient(135deg,#e8a0bf,#b4587e)] text-[#1a1215]" aria-hidden>
        ♪
      </span>
      Cantus
    </span>
  );
}

/** Desktop: the name, the tabs as pills, search, and the way out. */
function TopBar({ tab }: { tab: RoomTab }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--room-rim)] bg-[rgb(18_14_16/0.72)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-6 px-10">
        <Wordmark />
        <nav aria-label="Cantus" className="flex gap-1.5">
          {ROOM_TABS.filter((t) => t.id !== 'search').map((t) => (
            <Link key={t.id} to={t.path} aria-current={tab === t.id ? 'page' : undefined} className={cx('h-9 rounded-full px-4 text-[14px] leading-9 font-bold transition-colors', tab === t.id ? 'bg-[var(--room-pill)] text-[var(--room-pill-ink)]' : 'text-[var(--room-soft)] hover:bg-[var(--room-fill)] hover:text-[var(--room-ink)]')}>
              {t.name}
            </Link>
          ))}
        </nav>
        <Link to="/cantus/search" aria-current={tab === 'search' ? 'page' : undefined} className={cx('ml-auto flex h-10 w-[300px] items-center gap-2.5 rounded-full px-4 text-[14px] transition-colors', tab === 'search' ? 'bg-[var(--room-fill-strong)] text-[var(--room-ink)]' : 'bg-[var(--room-fill)] text-[var(--room-muted)] hover:bg-[var(--room-fill-strong)]')}>
          <Search size={16} aria-hidden /> Songs, artists, lyrics
        </Link>
        <CloseRoom />
      </div>
    </header>
  );
}

function PhoneHeader() {
  return (
    <header className="flex items-center justify-between px-[var(--room-gutter)] pt-[calc(env(safe-area-inset-top)+10px)]">
      <Wordmark />
      <CloseRoom />
    </header>
  );
}

/** Phones: the four tabs at the bottom, under the now-playing bar. */
function TabBar({ tab }: { tab: RoomTab }) {
  return (
    <nav aria-label="Cantus" className="room-tabbar">
      {ROOM_TABS.map((t) => {
        const Icon = TAB_ICON[t.id];
        const on = tab === t.id;
        return (
          <Link key={t.id} to={t.path} aria-current={on ? 'page' : undefined} className={cx('flex flex-1 flex-col items-center gap-1 pt-1 text-[11px] font-bold transition-colors', on ? 'text-[var(--room-rose)]' : 'text-[var(--room-muted)]')}>
            <Icon size={22} strokeWidth={on ? 2.4 : 2} aria-hidden />
            {t.name}
          </Link>
        );
      })}
    </nav>
  );
}

/** The song playing, folded: its line now, play and pause; tapping it opens the player again. */
function NowPlayingBar({ wide }: { wide: boolean }) {
  const { song, clock } = useCantusNow();
  const navigate = useNavigate();
  const [playing, setPlaying] = useState(false);
  const lineRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!clock) return setPlaying(false);
    setPlaying(clock.isPlaying());
    return clock.onPlaying(setPlaying);
  }, [clock]);

  // The line being sung and how far the song is: written straight to the page, never a render a frame.
  useEffect(() => {
    if (!clock || !song) return;
    const offset = clock.kind === 'youtube' || clock.kind === 'spotify' ? (song.offsetMs ?? 0) : 0;
    const timed = song.lines.filter((l) => l.text && l.startMs !== undefined);
    let shown = -2;
    return clock.onTime((raw) => {
      const ms = raw - offset;
      const total = clock.durationMs() || song.durationMs || 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${total ? Math.min(1, Math.max(0, raw / total)) : 0})`;
      let i = -1;
      while (i + 1 < timed.length && timed[i + 1].startMs! <= ms) i++;
      if (i !== shown && lineRef.current) {
        shown = i;
        lineRef.current.textContent = i >= 0 ? timed[i].text : song.artist;
      }
    });
  }, [clock, song]);

  if (!song) return null;
  return (
    <div className={cx('now-bar fixed z-40', wide ? 'right-0 bottom-5 left-0 mx-auto w-[min(720px,calc(100vw-80px))]' : 'inset-x-2.5 bottom-[calc(var(--room-tabbar-h)+6px)]')}>
      <div className="relative flex items-center gap-3 overflow-hidden rounded-[18px] border border-[var(--room-rim)] bg-[var(--room-glass)] p-2 pr-2.5 shadow-[0_18px_40px_-16px_rgb(0_0_0/0.8)] backdrop-blur-2xl">
        <button type="button" onClick={() => navigate(songPath(song.id))} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Open ${song.title}`}>
          <SongArt url={song.artworkUrl} title={song.title} className="size-11 shrink-0" rounded="rounded-[10px]" size={200} />
          <span className="min-w-0 flex-1">
            <span lang={song.lang} className="block truncate text-[14.5px] font-bold">
              {song.title}
            </span>
            <span ref={lineRef} lang={song.lang} className="block truncate text-[12.5px] text-[var(--room-soft)]">
              {song.artist}
            </span>
          </span>
        </button>
        {clock && (
          <button type="button" onClick={() => clock.toggle()} aria-label={playing ? 'Pause' : 'Play'} className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--room-pill)] text-[var(--room-pill-ink)] transition-transform active:scale-90">
            {playing ? <Pause size={18} className="fill-current" aria-hidden /> : <Play size={18} className="translate-x-px fill-current" aria-hidden />}
          </button>
        )}
        <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[var(--room-fill)]" aria-hidden>
          <span ref={barRef} className="block h-full origin-left bg-[var(--room-rose)]" style={{ transform: 'scaleX(0)' }} />
        </span>
      </div>
    </div>
  );
}
