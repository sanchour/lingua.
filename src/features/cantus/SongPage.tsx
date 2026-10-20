import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  BookOpen,
  Check,
  ChevronDown,
  Crosshair,
  Ellipsis,
  ExternalLink,
  Gamepad2,
  Heart,
  Headphones,
  Languages,
  Link2,
  LoaderCircle,
  Minus,
  Music2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Speaker,
  Timer,
  SkipBack,
  SkipForward,
  Trash2,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '@/app/context';
import { formatClock } from '@/core/audio/cues';
import { estimateTimes, isTimed, parsePlain, sungLines } from '@/core/cantus/lyrics';
import type { LyricAnchor } from '@/core/cantus/lyrics';
import { recordSession } from '@/data/activity';
import { patchSetting } from '@/data/settings';
import { markSongPlayed, openLyricsInCodex, patchSong, removeSong, saveSongLine, setSongSaved, useSavedLines, useSong } from '@/data/songs';
import type { Song } from '@/data/types';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { useLayout } from '@/design/hooks/useLayout';
import { Button, Dialog, IconButton, MenuItem, Popover, SearchInput, Segmented } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { pause as pauseSonus, usePlayer } from '@/services/audio/engine';
import { appleSongUrl } from '@/services/cantus/catalog';
import { findLyrics, lyricCandidates, searchLyrics } from '@/services/cantus/lrclib';
import { geniusSearchUrl, lyricsOvh } from '@/services/cantus/lyricSources';
import type { FoundLyrics } from '@/services/cantus/lrclib';
import { paletteOf } from '@/services/cantus/palette';
import { findSpotifyTrack, spotifyTrackId } from '@/services/cantus/spotify';
import { translateLyrics } from '@/services/cantus/translate';
import { youtubeId } from '@/services/cantus/youtube';
import { toast } from '@/state/ui';
import { createPreviewClock, createSpotifyClock, createTimerClock, createYouTubeClock, shifted } from './player/clocks';
import type { ClockKind, PreviewClock, SongClock, TimerClock } from './player/clocks';
import { LyricSheet } from './player/LyricSheet';
import { AppleMusicPlayer, SpotifyPlayer, YouTubePlayer } from './player/Players';
import { SongArt } from './SongArt';
import { gamesPath, lastRoomPath, useLeaveCantus } from './room/nav';
import { keepPlace, keptPlace, useCantusNow } from './room/now';

/**
 * The room's player: full screen, or folded away (still playing) while the learner browses, with
 * the now-playing bar standing in for it.
 */
export function SongPlayer({ songId, collapsed, onGone }: { songId: string; collapsed: boolean; onGone: () => void }) {
  const song = useSong(songId);
  const gone = song === null || Boolean(song?.deletedAt);
  useEffect(() => {
    if (gone && collapsed) onGone();
  }, [gone, collapsed, onGone]);
  if (gone) {
    if (collapsed) return null;
    return (
      <div className="song-page fixed inset-0 z-40 grid place-items-center bg-bg text-center">
        <div>
          <p className="text-xl font-bold">This song isn’t in your music any more.</p>
          <Link to={lastRoomPath()} className="mt-4 inline-block font-semibold text-accent-text">
            Back to Cantus
          </Link>
        </div>
      </div>
    );
  }
  if (!song) return null;
  return <SongView key={song.id} song={song} collapsed={collapsed} />;
}

/** Fetches what a newly opened song still lacks: lyrics, colours, its Spotify track. */
function useSongSetup(song: Song) {
  const { settings } = useApp();
  const [lyrics, setLyrics] = useState<'idle' | 'loading' | 'failed'>('idle');
  const [attempt, setAttempt] = useState(0);
  const connected = Boolean(settings.spotify.refreshToken);

  useEffect(() => {
    void markSongPlayed(song.id);
  }, [song.id]);

  useEffect(() => {
    if (song.lines.length || song.lyricsMissing) return;
    let alive = true;
    setLyrics('loading');
    (async () => {
      // LRCLIB first (often timed). Busy or unreachable: lyrics.ovh still may have them.
      const found = await findLyrics({ title: song.title, artist: song.artist, album: song.album, durationMs: song.durationMs }).catch(() => undefined);
      if (found && (found.lines.length || found.instrumental)) {
        return { lines: found.lines, lrclibId: found.id, lyricsFrom: 'lrclib' as const, instrumental: found.instrumental ? (1 as const) : undefined, lyricsMissing: found.lines.length ? undefined : (1 as const) };
      }
      // Not in LRCLIB: lyrics.ovh (plain text, not timed).
      const other = await lyricsOvh(song.title, song.artist);
      if (other) return { lines: other.lines, lyricsFrom: other.from };
      if (found === undefined) throw new Error('LRCLIB could not be asked');
      return { lyricsMissing: 1 as const };
    })()
      .then((patch) => {
        if (!alive) return;
        setLyrics('idle');
        void patchSong(song.id, patch);
      })
      .catch(() => alive && setLyrics('failed'));
    return () => {
      alive = false;
    };
  }, [song.id, song.lines.length, song.lyricsMissing, song.title, song.artist, song.album, song.durationMs, attempt]);

  // Couldn't be asked (busy, offline): try again by itself, twice, a little later each time.
  useEffect(() => {
    if (lyrics !== 'failed' || attempt >= 2) return;
    const timer = window.setTimeout(() => setAttempt((n) => n + 1), (attempt + 1) * 15_000);
    return () => window.clearTimeout(timer);
  }, [lyrics, attempt]);

  useEffect(() => {
    if (song.palette || !song.artworkUrl) return;
    void paletteOf(song.artworkUrl).then((palette) => palette && patchSong(song.id, { palette }));
  }, [song.id, song.palette, song.artworkUrl]);

  useEffect(() => {
    if (!connected || song.spotifyId) return;
    void findSpotifyTrack(song.title, song.artist)
      .then((id) => {
        if (id) void patchSong(song.id, { spotifyId: id });
      })
      .catch(() => undefined);
  }, [connected, song.id, song.spotifyId, song.title, song.artist]);

  return { state: lyrics, retry: () => setAttempt((n) => n + 1) };
}

// ── Where the music comes from ────────────────────────────────────────────────────────────────

/** The ways this song can play here: its video, Spotify, Apple Music, Apple's preview, or music anywhere. */
function sourcesOf(song: Song, followable: boolean): ClockKind[] {
  const kinds: ClockKind[] = [];
  if (song.youtubeId) kinds.push('youtube');
  if (song.spotifyId) kinds.push('spotify');
  if (song.itunesId && appleSongUrl(song)) kinds.push('apple');
  if (song.previewUrl) kinds.push('preview');
  if (followable) kinds.push('timer');
  return kinds;
}

/**
 * The whole song where it can play on the page (a video, Spotify); else Apple Music on desktop and
 * the preview on a phone, where Apple Music is a separate app.
 */
function defaultSource(song: Song, followable: boolean, wide: boolean): ClockKind | null {
  const kinds = sourcesOf(song, followable);
  const order: ClockKind[] = wide ? ['youtube', 'spotify', 'apple', 'preview', 'timer'] : ['youtube', 'spotify', 'preview', 'apple', 'timer'];
  return order.find((k) => kinds.includes(k)) ?? null;
}

const SOURCE_LABEL: Record<ClockKind, string> = { youtube: 'YouTube', spotify: 'Spotify', apple: 'Apple Music', preview: 'Preview (30 seconds)', timer: 'Music playing anywhere' };
const SOURCE_NOTE: Record<ClockKind, string> = {
  youtube: 'Playing from YouTube',
  spotify: 'Playing from Spotify',
  apple: 'Playing in Apple Music',
  preview: 'Playing Apple’s preview',
  timer: 'Along with music playing anywhere',
};
const SOURCE_DETAIL: Record<ClockKind, string> = {
  youtube: 'The whole song, for everyone',
  spotify: 'The whole song when signed in to Spotify',
  apple: 'The whole song when signed in to Apple Music',
  preview: 'Plays here, always',
  timer: 'A speaker, the Music app: start it with the song',
};
const SOURCE_ICON: Record<ClockKind, LucideIcon> = { youtube: Play, spotify: Music2, apple: Music2, preview: Headphones, timer: Speaker };

type Clocks = { spotify: ReturnType<typeof createSpotifyClock>; youtube: ReturnType<typeof createYouTubeClock>; apple: TimerClock; preview: PreviewClock; timer: TimerClock };

/** A height that follows an element (the phone's docked player, which "Back to the song" sits above). */
function useHeight() {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, height] as const;
}

function SongView({ song, collapsed }: { song: Song; collapsed: boolean }) {
  const { settings } = useApp();
  const { layout } = useLayout();
  const wide = layout === 'wide';
  const navigate = useNavigate();
  const lyricsSetup = useSongSetup(song);
  const savedLines = useSavedLines(song.id) ?? new Set<number>();
  const timed = isTimed(song.lines);

  // Lyrics without timings follow the song on estimated times, put right by tapping the line heard.
  const [anchors, setAnchors] = useState<LyricAnchor[]>([]);
  const estimated = useMemo(
    () => (!timed && sungLines(song.lines).length && song.durationMs ? estimateTimes(song.lines, song.durationMs, anchors) : undefined),
    [timed, song.lines, song.durationMs, anchors],
  );
  const followable = timed || Boolean(estimated);

  const clocks: Clocks = useMemo(() => ({ spotify: createSpotifyClock(), youtube: createYouTubeClock(), apple: createTimerClock('apple'), preview: createPreviewClock(), timer: createTimerClock() }), []);
  const kinds = sourcesOf(song, followable);
  const [source, setSource] = useState<ClockKind | null>(() => defaultSource(song, followable, wide));
  // A source appears later (lyrics found, a link added, Spotify finds the track): use it.
  useEffect(() => {
    if (source === null || !kinds.includes(source)) setSource(defaultSource(song, followable, wide));
  }, [source, kinds, song, followable, wide]);
  const clock: SongClock | null = source ? clocks[source] : null;

  // The now-playing bar follows this song while the player is folded away.
  const setNow = useCantusNow((s) => s.set);
  useEffect(() => {
    setNow(song, clock);
  }, [song, clock, setNow]);
  useEffect(() => () => setNow(null, null), [setNow]);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!clock) return setPlaying(false);
    setPlaying(clock.isPlaying());
    return clock.onPlaying(setPlaying);
  }, [clock]);
  // The song keeps its place: closing Cantus (or the app) and coming back carries on from there.
  const clockRef = useRef(clock);
  clockRef.current = clock;
  useEffect(() => {
    const kept = keptPlace();
    const c = clockRef.current;
    if (kept?.songId === song.id && kept.ms > 1000 && c && c.kind !== 'preview') c.seek(kept.ms);
    const keep = () => {
      // A preview's place is inside its 30 seconds: it starts again from the top.
      const now = clockRef.current;
      keepPlace(song.id, now && now.kind !== 'preview' ? now.now() : 0);
    };
    window.addEventListener('pagehide', keep);
    return () => {
      window.removeEventListener('pagehide', keep);
      keep();
    };
  }, [song.id]);
  const offsetRef = useRef(song.offsetMs ?? 0);
  offsetRef.current = song.offsetMs ?? 0;
  // The song's timing nudge is for the players that report their place; the others are put right by taps.
  const lyricClock = useMemo(
    () => (clock && followable ? (estimated || clock.kind === 'timer' || clock.kind === 'apple' || clock.kind === 'preview' ? clock : shifted(clock, () => offsetRef.current)) : null),
    [clock, followable, estimated],
  );

  // The preview: loaded while it's the source, starting where the song's preview starts.
  const [previewFailed, setPreviewFailed] = useState(false);
  useEffect(() => {
    if (source !== 'preview' || !song.previewUrl) return;
    setPreviewFailed(false);
    clocks.preview.load(song.previewUrl);
    const off = clocks.preview.onError(() => setPreviewFailed(true));
    return () => {
      off();
      clocks.preview.release();
    };
  }, [source, song.previewUrl, clocks]);
  useEffect(() => clocks.preview.setStart(song.previewAtMs ?? 0), [clocks, song.previewAtMs]);

  // Finding the place: the next tap on a line is the line being heard.
  const [syncing, setSyncing] = useState(false);
  useEffect(() => setSyncing(false), [source]);
  // The preview is a piece from somewhere in the song: the first time, ask which line it is at.
  const placed = song.previewAtMs !== undefined;
  useEffect(
    () =>
      clocks.preview.onPlaying((playing) => {
        if (playing && followable && (estimated ? !anchors.length : !placed)) setSyncing(true);
      }),
    [clocks, followable, estimated, anchors.length, placed],
  );

  const onSyncLine = (i: number) => {
    setSyncing(false);
    if (!clock) return;
    if (estimated) {
      const now = clock.now();
      setAnchors((list) => [...list.filter(([line]) => line !== i), [i, now]]);
      if (!clock.isPlaying()) clock.play();
      return;
    }
    const start = song.lines[i]?.startMs;
    if (start === undefined) return;
    if (clock.kind === 'preview') {
      const at = Math.round(start - clocks.preview.previewMs());
      clocks.preview.setStart(at);
      void patchSong(song.id, { previewAtMs: at });
      if (!clock.isPlaying()) clock.play();
      return;
    }
    clock.seek(start);
    clock.play();
  };

  // Only one thing plays at a time: a song starting pauses Sonus, and leaving the page records the time.
  useEffect(() => {
    const offs = Object.values(clocks).map((c) =>
      c.onPlaying((playing) => {
        if (playing && usePlayer.getState().status === 'playing') pauseSonus();
      }),
    );
    const startedAt = Date.now();
    return () => {
      offs.forEach((off) => off());
      clocks.timer.pause();
      clocks.apple.pause();
      clocks.preview.release();
      const heard = Object.values(clocks).reduce((n, c) => n + c.heardMs(), 0);
      void recordSession({ lang: song.lang, type: 'sing', refId: song.id, startedAt, endedAt: Date.now(), activeMs: Math.round(heard) });
    };
  }, [clocks, song.id, song.lang]);

  // ── Translation ─────────────────────────────────────────────────────────
  const mode = settings.cantus.translation;
  const [translating, setTranslating] = useState<number | null>(null);
  const translate = async () => {
    setTranslating(0);
    try {
      const translation = await translateLyrics(song, (f) => setTranslating(f));
      await patchSong(song.id, { translation });
      if (mode === 'hide') await patchSetting('cantus', { translation: 'show' });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'The translation didn’t work.', { tone: 'error' });
    } finally {
      setTranslating(null);
    }
  };

  const saveLine = async (i: number) => {
    let tr = song.translation?.lines[i] ?? '';
    if (!tr) {
      const { translateLine } = await import('@/services/translate/gloss');
      tr = (await translateLine(song.lang, song.lines[i].text).catch(() => null)) ?? '';
    }
    const added = await saveSongLine(song, i, tr);
    const replays = Boolean(song.youtubeId || song.spotifyId) && song.lines[i].startMs !== undefined;
    toast(added ? (replays ? 'Line saved to “From Cantus”. Its card plays the line again.' : 'Line saved to “From Cantus”.') : 'That line is already a card.', { tone: added ? 'success' : 'default' });
  };

  useHotkeys({ ' ': () => clock?.toggle() }, Boolean(clock) && !collapsed);

  const [dialog, setDialog] = useState<'link' | 'lyrics' | 'paste' | null>(null);
  const tint = song.palette ? ({ '--song': song.palette.base, '--song-deep': song.palette.deep, '--song-soft': song.palette.soft } as CSSProperties) : undefined;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dockRef, dockHeight] = useHeight();

  const actions = (
    <div className="flex items-center gap-1.5">
      <Button variant={song.savedAt ? 'secondary' : 'primary'} icon={Heart} onClick={() => void setSongSaved(song.id, !song.savedAt)} className={cx(Boolean(song.savedAt) && '[&_svg]:fill-current')}>
        {song.savedAt ? 'In your songs' : 'Save'}
      </Button>
      {sungLines(song.lines).length >= 4 && (
        <Button variant="secondary" icon={Gamepad2} onClick={() => navigate(gamesPath(song.id))}>
          Learn it
        </Button>
      )}
      {wide && <SongMenu song={song} onLink={() => setDialog('link')} onLyrics={() => setDialog('lyrics')} />}
    </div>
  );

  const player = (
    <PlayerArea
      song={song}
      source={source}
      kinds={kinds}
      setSource={setSource}
      clocks={clocks}
      wide={wide}
      timed={timed}
      estimated={Boolean(estimated)}
      previewFailed={previewFailed}
      onLink={() => setDialog('link')}
      syncing={syncing}
      onSync={setSyncing}
    />
  );
  const fold = () => navigate(lastRoomPath());
  const shell = cx('song-page fixed inset-0 z-40 flex flex-col overflow-hidden bg-bg', collapsed && 'song-collapsed', playing && 'is-playing');
  const translationBar = song.lines.length > 0 && <TranslationBar song={song} mode={mode} translating={translating} onTranslate={() => void translate()} />;

  const sheet = song.lines.length ? (
    <Boundary what="The lyrics">
      <LyricSheet
        song={song}
        clock={lyricClock}
        translationMode={song.translation ? mode : 'hide'}
        savedLines={savedLines}
        onSaveLine={(i) => void saveLine(i)}
        dockedHeight={wide ? 0 : dockHeight}
        estimated={estimated}
        scrollRef={scrollRef}
        syncByTap={syncing}
        onSyncLine={onSyncLine}
      />
      <LyricsCredit song={song} estimated={Boolean(estimated)} />
    </Boundary>
  ) : (
    <NoLyrics song={song} state={lyricsSetup.state} onRetry={lyricsSetup.retry} onFind={() => setDialog('lyrics')} onPaste={() => setDialog('paste')} />
  );

  const dialogs = (
    <>
      <LinkDialog song={song} open={dialog === 'link'} onClose={() => setDialog(null)} onAdded={(kind) => setSource(kind)} />
      <LyricsDialog key={dialog === 'paste' ? 'paste' : 'find'} song={song} open={dialog === 'lyrics' || dialog === 'paste'} pasting={dialog === 'paste'} onClose={() => setDialog(null)} />
    </>
  );

  // Desktop: the page fills the window and stays put; only the lyrics scroll.
  if (wide) {
    return (
      <div className={cx(shell, 'px-10 pb-8')} style={tint} aria-hidden={collapsed} inert={collapsed}>
        <div className="song-backdrop" aria-hidden />
        <header className="relative mx-auto flex h-16 w-full max-w-[1280px] shrink-0 items-center gap-2">
          <button type="button" onClick={fold} aria-label="Fold the player away" title="Back to browsing" className="grid size-10 place-items-center rounded-full bg-[var(--room-fill)] text-ink-soft transition-colors hover:text-ink">
            <ChevronDown size={22} aria-hidden />
          </button>
          <span className="ml-1 text-[12px] font-extrabold tracking-[0.14em] text-ink-faint uppercase">Playing in Cantus</span>
          <LeaveButton className="ml-auto" />
        </header>
        <div className="relative mx-auto mt-2 grid min-h-0 w-full max-w-[1280px] flex-1 grid-cols-[minmax(250px,360px)_minmax(0,1fr)] gap-14">
          <aside className="flex min-h-0 flex-col overflow-y-auto [scrollbar-width:none]">
            {/* The artwork takes the room that's left, so the column needn't scroll; never less than a thumbnail. */}
            <div className="min-h-[88px] flex-1 [container-type:size]">
              <SongArt url={song.artworkUrl} title={song.title} className="song-art w-[max(88px,min(100cqw,100cqh))]" rounded="rounded-[22px]" />
            </div>
            <div className="shrink-0">
              <SongTitle song={song} large />
              <div className="mt-4">{actions}</div>
              <div className="mt-5">{player}</div>
            </div>
          </aside>
          <section aria-label="Lyrics" className="flex min-h-0 min-w-0 flex-col">
            <div className="shrink-0">{translationBar}</div>
            <div ref={scrollRef} className="lyric-scroll -mr-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pt-2 pr-4 pb-24">
              {sheet}
            </div>
          </section>
        </div>
        {dialogs}
      </div>
    );
  }

  // Phones: the whole screen; the header, the song and the player stay put, the lyrics scroll between.
  const video = source === 'youtube' && song.youtubeId;
  return (
    <div className={shell} style={tint} aria-hidden={collapsed} inert={collapsed}>
      <div className="song-backdrop" aria-hidden />
      <header className="no-callout relative z-20 flex shrink-0 items-center gap-1 px-2 pt-safe">
        <button type="button" aria-label="Fold the player away" onClick={fold} className="grid size-11 place-items-center rounded-xl text-ink-soft">
          <ChevronDown size={24} aria-hidden />
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-[13px] font-semibold text-ink-soft">{song.artist}</p>
        <SongMenu song={song} onLink={() => setDialog('link')} onLyrics={() => setDialog('lyrics')} className="grid size-11 place-items-center rounded-xl text-ink-soft" />
      </header>
      <div className="relative shrink-0 px-5 pb-3">
        <div className="flex items-center gap-4">
          <SongArt url={song.artworkUrl} title={song.title} className="song-art w-20" rounded="rounded-2xl" size={300} />
          <div className="min-w-0 flex-1">
            <SongTitle song={song} />
          </div>
        </div>
        <div className="mt-3">{actions}</div>
      </div>
      {video && (
        <div className="song-embed relative shrink-0 px-5 pb-3">
          <Boundary what="The video">
            <YouTubePlayer videoId={song.youtubeId!} clock={clocks.youtube} />
          </Boundary>
        </div>
      )}
      <div ref={scrollRef} className="lyric-scroll relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-2 pb-10">
        {translationBar}
        {sheet}
      </div>
      <div ref={dockRef} className="song-dock relative z-20 shrink-0 border-t border-line/70 bg-bg/92 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-xl">
        {player}
      </div>
      {dialogs}
    </div>
  );
}

/** A player or the lyrics failing shows a note and a way back, never a dead page. */
class Boundary extends Component<{ what: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn(`${this.props.what} stopped:`, error);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="rounded-2xl bg-surface/80 p-4 text-[14px] text-ink-soft">
        {this.props.what} stopped working. Try again, or choose another way to play the song.
        <button type="button" onClick={() => this.setState({ failed: false })} className="ml-2 font-semibold text-accent-text hover:underline">
          Try again
        </button>
      </div>
    );
  }
}

function SongTitle({ song, large }: { song: Song; large?: boolean }) {
  const meta = [song.album, song.year].filter(Boolean).join(' · ');
  return (
    <div className={cx('min-w-0', large && 'mt-5')}>
      <h1 lang={song.lang} className={cx('font-serif leading-tight font-semibold tracking-tight', large ? 'line-clamp-2 text-[26px]' : 'line-clamp-2 text-[21px]')}>
        {song.title}
      </h1>
      <p className="mt-1 truncate text-[15px] font-semibold text-[var(--song-ink)]">{song.artist}</p>
      {meta && <p className="mt-0.5 truncate text-[13px] text-ink-soft">{meta}</p>}
    </div>
  );
}

// ── The player area: how it plays, then that source's player and controls ─────────────────────

/** "Playing from …": every way this song can play, and adding a link. */
function SourceMenu({ kinds, source, setSource, onLink }: { kinds: ClockKind[]; source: ClockKind | null; setSource: (s: ClockKind) => void; onLink: () => void }) {
  const Icon = source ? SOURCE_ICON[source] : Link2;
  return (
    <Popover
      label="Play from"
      placement="bottom-start"
      className="w-72 p-1.5"
      trigger={(props) => (
        <button
          type="button"
          {...props}
          className="flex h-10 max-w-full min-w-0 items-center gap-2 rounded-full border border-line/70 bg-surface/80 px-3.5 text-[13.5px] font-semibold text-ink-soft transition-colors hover:bg-surface hover:text-ink"
        >
          <Icon size={15} className="shrink-0" aria-hidden />
          <span className="truncate">{source ? SOURCE_NOTE[source] : 'Choose how to play it'}</span>
          <ChevronDown size={15} className="shrink-0" aria-hidden />
        </button>
      )}
    >
      {(close) => (
        <>
          {kinds.map((k) => (
            <MenuItem
              key={k}
              icon={k === source ? Check : SOURCE_ICON[k]}
              label={SOURCE_LABEL[k]}
              detail={SOURCE_DETAIL[k]}
              onClick={() => {
                close();
                setSource(k);
              }}
            />
          ))}
          <MenuItem
            icon={Link2}
            label="Add a YouTube or Spotify link"
            onClick={() => {
              close();
              onLink();
            }}
          />
        </>
      )}
    </Popover>
  );
}

function PlayerArea({
  song,
  source,
  kinds,
  setSource,
  clocks,
  wide,
  timed,
  estimated,
  previewFailed,
  onLink,
  syncing,
  onSync,
}: {
  song: Song;
  source: ClockKind | null;
  kinds: ClockKind[];
  setSource: (s: ClockKind) => void;
  clocks: Clocks;
  wide: boolean;
  timed: boolean;
  estimated: boolean;
  previewFailed: boolean;
  onLink: () => void;
  syncing: boolean;
  onSync: (on: boolean) => void;
}) {
  const followable = timed || estimated;
  if (source === null) return <NoPlayer song={song} onLink={onLink} />;
  return (
    <div className="space-y-3">
      {(kinds.length > 1 || wide) && <SourceMenu kinds={kinds} source={source} setSource={setSource} onLink={onLink} />}
      <Boundary key={source} what={SOURCE_LABEL[source]}>
        {source === 'youtube' && song.youtubeId && wide && (
          <div className="song-embed">
            <YouTubePlayer videoId={song.youtubeId} clock={clocks.youtube} />
          </div>
        )}
        {source === 'spotify' && song.spotifyId && (
          <div className="song-embed">
            <SpotifyPlayer trackId={song.spotifyId} clock={clocks.spotify} compact={!wide} />
          </div>
        )}
        {source === 'apple' && wide && (
          <div className="song-embed">
            <AppleMusicPlayer song={song} clock={clocks.apple} />
          </div>
        )}
        {(source === 'youtube' || source === 'spotify') && <Transport song={song} clock={clocks[source]} />}
        {source === 'apple' && !wide && <AppleMusicLink song={song} onOpened={() => followable && onSync(true)} />}
        {source === 'apple' && followable && <TimerControls clock={clocks.apple} apple syncing={syncing} onSync={onSync} compact={!wide} />}
        {source === 'preview' && <PreviewControls clock={clocks.preview} failed={previewFailed} followable={followable} placed={song.previewAtMs !== undefined} syncing={syncing} onSync={onSync} compact={!wide} />}
        {source === 'timer' && <TimerControls clock={clocks.timer} syncing={syncing} onSync={onSync} compact={!wide} />}
      </Boundary>
      {(source === 'youtube' || source === 'spotify') && timed && <TimingNudge song={song} />}
      {(source === 'youtube' || source === 'spotify') && estimated && <PlaceButton syncing={syncing} onSync={onSync} />}
    </div>
  );
}

/** Leaves Cantus for Sonus › Music; the song keeps its place. */
function LeaveButton({ className }: { className?: string }) {
  const leave = useLeaveCantus();
  return (
    <button type="button" onClick={leave} aria-label="Leave Cantus" title="Back to Lingua" className={cx('grid size-10 place-items-center rounded-full bg-[var(--room-fill)] text-ink-soft transition-colors hover:text-ink', className)}>
      <X size={19} aria-hidden />
    </button>
  );
}

/**
 * For the players with their own controls inside (YouTube, Spotify): the song's progress, and a line
 * back, play or pause, and a line on. Written straight to the page as it plays, never a render a frame.
 */
function Transport({ song, clock }: { song: Song; clock: SongClock }) {
  const [playing, setPlaying] = useState(clock.isPlaying());
  const bar = useRef<HTMLDivElement>(null);
  const at = useRef<HTMLSpanElement>(null);
  useEffect(() => clock.onPlaying(setPlaying), [clock]);
  useEffect(() => {
    let last = -1;
    return clock.onTime((ms) => {
      const total = clock.durationMs() || song.durationMs || 0;
      if (bar.current) bar.current.style.transform = `scaleX(${total ? Math.min(1, Math.max(0, ms / total)) : 0})`;
      const s = Math.floor(ms / 1000);
      if (s !== last && at.current) {
        last = s;
        at.current.textContent = formatClock(Math.max(0, ms));
      }
    });
  }, [clock, song.durationMs]);
  const starts = song.lines.filter((l) => l.text && l.startMs !== undefined).map((l) => l.startMs! + (song.offsetMs ?? 0));
  const step = (dir: 1 | -1) => {
    const now = clock.now();
    // Back: the start of this line, or the one before when it has only just begun.
    const target = dir === 1 ? starts.find((t) => t > now + 250) : [...starts].reverse().find((t) => t < now - 1500);
    if (target !== undefined) clock.seek(Math.max(0, target - 150));
    else if (dir === -1) clock.seek(0);
  };
  const lineless = starts.length < 2;
  return (
    <div className="song-transport">
      <div className="h-[5px] overflow-hidden rounded-full bg-[var(--room-fill-strong,var(--color-sunken))]" aria-hidden>
        <div ref={bar} className="h-full origin-left rounded-full bg-[var(--song-ink)]" style={{ transform: 'scaleX(0)' }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[11.5px] font-semibold text-ink-faint tabular-nums">
        <span ref={at}>0:00</span>
        <span>{song.durationMs ? formatClock(song.durationMs) : ''}</span>
      </div>
      <div className="mt-1 flex items-center justify-center gap-6">
        <button type="button" aria-label="The line before" disabled={lineless} onClick={() => step(-1)} className={cx(ROUND, 'disabled:opacity-35')}>
          <SkipBack size={22} className="fill-current" aria-hidden />
        </button>
        <button type="button" aria-label={playing ? 'Pause' : 'Play'} onClick={() => clock.toggle()} className="grid size-16 place-items-center rounded-full bg-[var(--room-pill,var(--color-inverse))] text-[var(--room-pill-ink,var(--color-on-inverse))] shadow-elev-1 transition-transform active:scale-90">
          {playing ? <Pause size={26} className="fill-current" aria-hidden /> : <Play size={26} className="translate-x-0.5 fill-current" aria-hidden />}
        </button>
        <button type="button" aria-label="The next line" disabled={lineless} onClick={() => step(1)} className={cx(ROUND, 'disabled:opacity-35')}>
          <SkipForward size={22} className="fill-current" aria-hidden />
        </button>
      </div>
    </div>
  );
}

const ROUND = 'grid size-11 shrink-0 place-items-center rounded-full text-ink-soft transition-[transform,background-color] hover:bg-sunken active:scale-90';

/** The target: the next tap on a line says that line is being sung now. */
function TargetButton({ syncing, onSync }: { syncing: boolean; onSync: (on: boolean) => void }) {
  return (
    <button
      type="button"
      aria-label="Tap the line you’re hearing"
      aria-pressed={syncing}
      title="Tap the line you’re hearing"
      onClick={() => onSync(!syncing)}
      className={syncing ? 'grid size-11 shrink-0 place-items-center rounded-full bg-[var(--song-ink)] text-bg shadow-elev-1 transition-transform active:scale-90' : ROUND}
    >
      <Crosshair size={18} aria-hidden />
    </button>
  );
}

/** Lyrics without timings, with a player that knows its place: tapping a line puts the estimate right. */
function PlaceButton({ syncing, onSync }: { syncing: boolean; onSync: (on: boolean) => void }) {
  return (
    <div className="flex items-center gap-2 text-[13px] text-ink-soft">
      <span className="min-w-0 flex-1 leading-snug">These lyrics have no timings: they follow an estimate. Out of step? Press the target, then tap the line being sung.</span>
      <TargetButton syncing={syncing} onSync={onSync} />
    </div>
  );
}

/**
 * For music playing elsewhere (and in Apple Music's player): start when the song starts, or tap the
 * line you're hearing; nudge until the lines match.
 */
function TimerControls({ clock, apple, syncing, onSync, compact }: { clock: TimerClock; apple?: boolean; syncing: boolean; onSync: (on: boolean) => void; compact?: boolean }) {
  const [playing, setPlaying] = useState(clock.isPlaying());
  const [now, setNow] = useState(0);
  useEffect(() => clock.onPlaying(setPlaying), [clock]);
  useEffect(() => {
    let last = -1;
    return clock.onTime((ms) => {
      const s = Math.floor(ms / 1000);
      if (s !== last) {
        last = s;
        setNow(ms);
      }
    });
  }, [clock]);
  return (
    <div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => clock.toggle()} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--song-ink)] font-semibold text-bg shadow-elev-1 transition-transform active:scale-[0.98]">
          {playing ? <Pause size={19} className="fill-current" aria-hidden /> : <Play size={19} className="fill-current" aria-hidden />}
          {playing ? 'Pause' : now > 0 ? 'Go on' : 'Start'}
        </button>
        <button type="button" aria-label="A second back" onClick={() => clock.nudge(-1000)} className={ROUND}>
          <Minus size={18} aria-hidden />
        </button>
        <span className="w-12 text-center text-[13px] font-semibold text-ink-soft tabular-nums">{formatClock(now)}</span>
        <button type="button" aria-label="A second ahead" onClick={() => clock.nudge(1000)} className={ROUND}>
          <Plus size={18} aria-hidden />
        </button>
        <TargetButton syncing={syncing} onSync={onSync} />
      </div>
      {!playing && now === 0 && !syncing && !compact && (
        <p className="mt-2 text-[12.5px] leading-snug text-ink-faint">
          {apple
            ? 'Press play on Apple Music and the lyrics start with it. Hearing a preview, or out of step? Press the target, then tap the line being sung.'
            : 'Playing it on a speaker or anywhere else? Start when the song starts, or press the target and tap the line you’re hearing. Ahead or behind? Use − and +.'}
        </p>
      )}
    </div>
  );
}

/** Apple's preview, playing here: play and pause, how far into its 30 seconds, and the target. */
function PreviewControls({
  clock,
  failed,
  followable,
  placed,
  syncing,
  onSync,
  compact,
}: {
  clock: PreviewClock;
  failed: boolean;
  followable: boolean;
  placed: boolean;
  syncing: boolean;
  onSync: (on: boolean) => void;
  compact?: boolean;
}) {
  const [playing, setPlaying] = useState(clock.isPlaying());
  const bar = useRef<HTMLDivElement>(null);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => clock.onPlaying(setPlaying), [clock]);
  useEffect(() => {
    let last = -1;
    return clock.onTime(() => {
      const ms = clock.previewMs();
      if (bar.current) bar.current.style.transform = `scaleX(${Math.min(1, ms / 30_000)})`;
      const s = Math.floor(ms / 1000);
      if (s !== last) {
        last = s;
        setSeconds(s);
      }
    });
  }, [clock]);
  return (
    <div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => clock.toggle()} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--song-ink)] font-semibold text-bg shadow-elev-1 transition-transform active:scale-[0.98]">
          {playing ? <Pause size={19} className="fill-current" aria-hidden /> : <Play size={19} className="fill-current" aria-hidden />}
          {playing ? 'Pause' : seconds > 0 ? 'Go on' : 'Play the preview'}
        </button>
        <span className="w-12 text-center text-[13px] font-semibold text-ink-soft tabular-nums">0:{String(Math.min(30, seconds)).padStart(2, '0')}</span>
        {followable && <TargetButton syncing={syncing} onSync={onSync} />}
      </div>
      <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-sunken" aria-hidden>
        <div ref={bar} className="h-full origin-left rounded-full bg-[var(--song-ink)]" style={{ transform: 'scaleX(0)' }} />
      </div>
      {failed ? (
        <p className="mt-2 text-[13px] font-semibold text-accent-text">The preview couldn’t play. Check the connection, or choose another way above.</p>
      ) : (
        !compact &&
        followable && (
          <p className="mt-2 text-[12.5px] leading-snug text-ink-faint">
            {placed ? '30 seconds of the song, from Apple. The lyrics follow it.' : 'A 30-second piece from the middle of the song. Play it, then tap the line being sung, and the lyrics follow from there.'}
          </p>
        )
      )}
    </div>
  );
}

/** Phones: the song in the Music app; back here, tap the line you're hearing. */
function AppleMusicLink({ song, onOpened }: { song: Song; onOpened: () => void }) {
  const url = appleSongUrl(song);
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onOpened}
      className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#fa2d48] font-semibold text-white shadow-elev-1 transition-transform active:scale-[0.98]"
    >
      <Music2 size={18} aria-hidden /> Play in Apple Music
    </a>
  );
}

/** Where the words come from. */
function LyricsCredit({ song, estimated }: { song: Song; estimated: boolean }) {
  const from = song.lyricsFrom ?? (song.lrclibId ? 'lrclib' : undefined);
  if (!from || from === 'pasted') return null;
  const label = from === 'lyrics.ovh' ? 'lyrics.ovh' : 'LRCLIB';
  const href = from === 'lyrics.ovh' ? 'https://lyrics.ovh' : 'https://lrclib.net';
  return (
    <p className="mt-10 text-center text-[12.5px] text-ink-faint">
      Lyrics from{' '}
      <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-ink-soft hover:underline">
        {label}
      </a>
      {!isTimed(song.lines) && (estimated ? ' · not timed: following an estimate' : ' · not timed to the music')}
    </p>
  );
}

/** Lyrics a little early or late against the music: move them in quarter seconds. */
function TimingNudge({ song }: { song: Song }) {
  const offset = song.offsetMs ?? 0;
  const set = (ms: number) => void patchSong(song.id, { offsetMs: Math.max(-10_000, Math.min(10_000, ms)) || undefined });
  return (
    <div className="flex items-center gap-2 text-[13px] text-ink-soft">
      <Timer size={15} className="shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{offset ? `Lyrics ${offset > 0 ? 'later' : 'earlier'} by ${(Math.abs(offset) / 1000).toFixed(2)} s` : 'Lyrics in time with the music'}</span>
      <IconButton icon={Minus} label="Lyrics earlier" size="sm" onClick={() => set(offset - 250)} />
      <IconButton icon={Plus} label="Lyrics later" size="sm" onClick={() => set(offset + 250)} />
      {offset !== 0 && <IconButton icon={RotateCcw} label="Reset the timing" size="sm" onClick={() => set(0)} />}
    </div>
  );
}

function NoPlayer({ song, onLink }: { song: Song; onLink: () => void }) {
  return (
    <div className="rounded-2xl bg-surface/80 p-4">
      <p className="text-[14px] leading-snug text-ink-soft">
        {song.lines.length && !isTimed(song.lines)
          ? 'These lyrics have no timings, and the song’s length isn’t known, so they won’t follow the music: scroll along as you listen.'
          : 'Add the song’s YouTube or Spotify link to play it here with the lyrics following.'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" icon={Link2} onClick={onLink}>
          Add a link
        </Button>
      </div>
    </div>
  );
}

// ── Translation ─────────────────────────────────────────────────────────────────────────────────

function TranslationBar({ song, mode, translating, onTranslate }: { song: Song; mode: 'show' | 'blur' | 'hide'; translating: number | null; onTranslate: () => void }) {
  if (translating !== null) {
    return (
      <p className="mb-5 flex items-center gap-2 text-[13.5px] font-semibold text-ink-soft">
        <LoaderCircle size={16} className="animate-spin" aria-hidden /> Translating the song… {Math.round(translating * 100)}%
      </p>
    );
  }
  if (!song.translation) {
    return (
      <div className="mb-5">
        <Button size="sm" variant="secondary" icon={Languages} onClick={onTranslate}>
          Translate every line
        </Button>
      </div>
    );
  }
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <Segmented
        label="English under each line"
        value={mode}
        onChange={(translation) => void patchSetting('cantus', { translation })}
        options={[
          { value: 'show', label: 'English' },
          { value: 'blur', label: 'Blurred' },
          { value: 'hide', label: 'Hidden' },
        ]}
      />
      <span className="text-[12px] text-ink-faint">{song.translation.by === 'ai' ? 'Translated by your AI' : 'Machine translation'}</span>
    </div>
  );
}

// ── No lyrics yet ───────────────────────────────────────────────────────────────────────────────

/** New lyrics for a song: the old translation, timing and preview place belonged to the old ones. */
const replaceLyrics = (song: Song, patch: Partial<Song>) => patchSong(song.id, { translation: undefined, lyricsMissing: undefined, offsetMs: undefined, previewAtMs: undefined, ...patch });

/** One set of lyrics to choose: its name, whether it's timed, its length and first line. */
function LyricChoice({ found, onUse }: { found: FoundLyrics; onUse: () => void }) {
  return (
    <button type="button" onClick={onUse} className="w-full rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-sunken">
      <span className="block truncate text-[14.5px] font-semibold">
        {found.title} <span className="font-normal text-ink-soft">· {found.artist}</span>
      </span>
      <span className="block truncate text-[12.5px] text-ink-faint">
        {found.timed ? 'Timed to the music' : 'Not timed'}
        {found.durationMs ? ` · ${formatClock(found.durationMs)}` : ''} · {found.lines.find((l) => l.text)?.text}
      </span>
    </button>
  );
}

function NoLyrics({ song, state, onFind, onPaste, onRetry }: { song: Song; state: 'idle' | 'loading' | 'failed'; onFind: () => void; onPaste: () => void; onRetry: () => void }) {
  const missing = Boolean(song.lyricsMissing) && !song.instrumental && state === 'idle';
  // Nothing sure turned up: what LRCLIB has under a similar name, to pick from.
  const [picks, setPicks] = useState<FoundLyrics[] | null>(null);
  useEffect(() => {
    if (!missing) return;
    let alive = true;
    void lyricCandidates({ title: song.title, artist: song.artist, album: song.album, durationMs: song.durationMs })
      .then((list) => alive && setPicks(list))
      .catch(() => alive && setPicks([]));
    return () => {
      alive = false;
    };
  }, [missing, song.title, song.artist, song.album, song.durationMs]);

  if (state === 'loading' || (!song.lyricsMissing && state === 'idle')) {
    return (
      <div className="space-y-4" aria-label="Finding the lyrics">
        {[70, 52, 64, 40, 58].map((w, i) => (
          <div key={i} className="h-7 animate-pulse rounded-lg bg-sunken" style={{ width: `${w}%` }} />
        ))}
      </div>
    );
  }
  return (
    <div className="rounded-3xl border border-line/70 bg-surface p-5 sm:p-6">
      <div className="text-center">
        <Music2 size={26} className="mx-auto text-[var(--song-ink)]" aria-hidden />
        <p className="mt-3 font-serif text-lg font-semibold">{song.instrumental ? 'This song has no words.' : state === 'failed' ? 'The lyrics couldn’t be fetched.' : picks?.length ? 'Are these the lyrics?' : 'No lyrics found yet.'}</p>
        {!song.instrumental && (
          <p className="mx-auto mt-1 max-w-sm text-[14px] text-ink-soft">
            {state === 'failed'
              ? 'The lyrics library is busy or out of reach. It tries again by itself in a moment; or try now.'
              : picks?.length
                ? 'Nothing matched this song for sure. Pick the right one, or find them another way.'
                : picks
                  ? 'Search under another name, or find them on Genius and paste them here.'
                  : 'Looking for lyrics under similar names…'}
          </p>
        )}
      </div>
      {missing && picks && picks.length > 0 && (
        <ul className="mt-4 space-y-0.5 border-t border-line/70 pt-3">
          {picks.map((p) => (
            <li key={p.id}>
              <LyricChoice found={p} onUse={() => void replaceLyrics(song, { lines: p.lines, lrclibId: p.id, lyricsFrom: 'lrclib' })} />
            </li>
          ))}
        </ul>
      )}
      {!song.instrumental && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {state === 'failed' ? (
            <Button variant="secondary" icon={RotateCcw} onClick={onRetry}>
              Try again
            </Button>
          ) : (
            <Button variant="secondary" icon={Search} onClick={onFind}>
              Search another name
            </Button>
          )}
          <a href={geniusSearchUrl(song.title, song.artist)} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-1.5 rounded-2xl px-4 font-semibold text-ink-soft transition-colors hover:bg-sunken">
            On Genius <ExternalLink size={14} aria-hidden />
          </a>
          <Button variant="ghost" onClick={onPaste}>
            Paste them yourself
          </Button>
        </div>
      )}
    </div>
  );
}

function LyricsDialog({ song, open, pasting, onClose }: { song: Song; open: boolean; pasting: boolean; onClose: () => void }) {
  const [query, setQuery] = useState(`${song.title} ${song.artist}`);
  const [results, setResults] = useState<FoundLyrics[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [paste, setPaste] = useState(pasting);
  // Opening it shows what LRCLIB has for the song straight away; a search replaces it.
  useEffect(() => {
    if (!open || results || paste) return;
    let alive = true;
    setBusy(true);
    void lyricCandidates({ title: song.title, artist: song.artist, album: song.album, durationMs: song.durationMs }, 12)
      .then((list) => alive && setResults(list))
      .catch(() => alive && setResults([]))
      .finally(() => alive && setBusy(false));
    return () => {
      alive = false;
    };
  }, [open, results, paste, song.title, song.artist, song.album, song.durationMs]);
  const [pasted, setPasted] = useState('');
  const run = async () => {
    setBusy(true);
    try {
      setResults(await searchLyrics(query));
    } catch {
      toast('The lyrics library didn’t answer.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };
  const use = async (patch: Partial<Song>) => {
    await replaceLyrics(song, patch);
    onClose();
  };
  const [elsewhere, setElsewhere] = useState(false);
  const fromLyricsOvh = async () => {
    setElsewhere(true);
    const found = await lyricsOvh(song.title, song.artist);
    setElsewhere(false);
    if (found) await use({ lines: found.lines, lrclibId: undefined, lyricsFrom: found.from });
    else toast('lyrics.ovh doesn’t have this song’s lyrics.');
  };
  return (
    <Dialog open={open} onClose={onClose} title={paste ? 'Paste the lyrics' : 'Find other lyrics'}>
      {paste ? (
        <>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={9}
            lang={song.lang}
            placeholder="One line of the song per line; an empty line between verses."
            className="w-full rounded-xl border border-line bg-raised p-3 text-[15px] leading-relaxed"
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPaste(false)}>
              Back
            </Button>
            <Button disabled={!pasted.trim()} onClick={() => void use({ lines: parsePlain(pasted), lrclibId: undefined, lyricsFrom: 'pasted' })}>
              Use these lyrics
            </Button>
          </div>
        </>
      ) : (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run();
            }}
            className="flex gap-2"
          >
            <SearchInput value={query} onChange={setQuery} placeholder="Song and artist" className="flex-1" />
            <Button type="submit" loading={busy}>
              Search
            </Button>
          </form>
          <ul className="mt-3 max-h-[46dvh] space-y-1 overflow-y-auto">
            {results?.map((r) => (
              <li key={r.id}>
                <LyricChoice found={r} onUse={() => void use({ lines: r.lines, lrclibId: r.id, lyricsFrom: 'lrclib' })} />
              </li>
            ))}
            {results?.length === 0 && <li className="px-3 py-4 text-center text-[14px] text-ink-soft">Nothing found under that name.</li>}
          </ul>
          <div className="mt-4 border-t border-line pt-4">
            <p className="mb-2 text-[13px] font-semibold text-ink-soft">Elsewhere</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" loading={elsewhere} onClick={() => void fromLyricsOvh()}>
                lyrics.ovh
              </Button>
              <a href={geniusSearchUrl(song.title, song.artist)} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[14px] font-semibold text-ink-soft transition-colors hover:bg-sunken">
                Look on Genius <ExternalLink size={13} aria-hidden />
              </a>
              <Button size="sm" variant="ghost" onClick={() => setPaste(true)}>
                Paste them yourself
              </Button>
            </div>
            <p className="mt-2 text-[12.5px] text-ink-faint">Found them on Genius? Copy the words, then Paste them yourself.</p>
          </div>
        </>
      )}
    </Dialog>
  );
}

function LinkDialog({ song, open, onClose, onAdded }: { song: Song; open: boolean; onClose: () => void; onAdded: (kind: ClockKind) => void }) {
  const [value, setValue] = useState('');
  const yt = youtubeId(value);
  const sp = spotifyTrackId(value);
  const q = encodeURIComponent(`${song.title} ${song.artist}`);
  const add = async () => {
    if (yt) await patchSong(song.id, { youtubeId: yt });
    else if (sp) await patchSong(song.id, { spotifyId: sp });
    else return;
    onAdded(yt ? 'youtube' : 'spotify');
    setValue('');
    onClose();
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Play it from YouTube or Spotify"
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!yt && !sp} onClick={() => void add()}>
            Add
          </Button>
        </>
      }
    >
      <p className="text-[14px] leading-snug text-ink-soft">Paste the song’s link. YouTube plays the whole song for everyone; Spotify does when you’re signed in to Spotify in this browser.</p>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="https://youtu.be/… or https://open.spotify.com/track/…"
        inputMode="url"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className="mt-3 h-11 w-full rounded-xl border border-line bg-raised px-3.5 text-[14px]"
        aria-label="YouTube or Spotify link"
      />
      {value && !yt && !sp && <p className="mt-2 text-[13px] text-accent-text">That isn’t a YouTube video or a Spotify track link.</p>}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
        <a href={`https://www.youtube.com/results?search_query=${q}`} target="_blank" rel="noopener noreferrer" className="hit inline-flex items-center gap-1 font-semibold text-accent-text hover:underline">
          Find it on YouTube <ExternalLink size={12} aria-hidden />
        </a>
        <a href={`https://open.spotify.com/search/${q}`} target="_blank" rel="noopener noreferrer" className="hit inline-flex items-center gap-1 font-semibold text-accent-text hover:underline">
          Find it on Spotify <ExternalLink size={12} aria-hidden />
        </a>
      </div>
    </Dialog>
  );
}

function SongMenu({ song, onLink, onLyrics, className }: { song: Song; onLink: () => void; onLyrics: () => void; className?: string }) {
  const navigate = useNavigate();
  return (
    <Popover
      label="Song options"
      placement="bottom-end"
      className="w-64 p-1.5"
      trigger={(props) =>
        className ? (
          <button type="button" {...props} aria-label="Song options" className={className}>
            <Ellipsis size={20} aria-hidden />
          </button>
        ) : (
          <IconButton {...props} icon={Ellipsis} label="Song options" variant="soft" />
        )
      }
    >
      {(close) => (
        <>
          {song.lines.length > 0 && (
            <MenuItem
              icon={BookOpen}
              label="Read in Codex"
              onClick={() => {
                close();
                void openLyricsInCodex(song).then((id) => navigate(`/codex/read/${id}`));
              }}
            />
          )}
          <MenuItem
            icon={Link2}
            label="Add a YouTube or Spotify link"
            onClick={() => {
              close();
              onLink();
            }}
          />
          <MenuItem
            icon={Search}
            label="Find other lyrics"
            onClick={() => {
              close();
              onLyrics();
            }}
          />
          {song.appleUrl && (
            <MenuItem
              icon={ExternalLink}
              label="Open in Apple Music"
              onClick={() => {
                close();
                window.open(song.appleUrl, '_blank', 'noopener');
              }}
            />
          )}
          <MenuItem
            icon={Trash2}
            label="Remove from your music"
            danger
            onClick={() => {
              close();
              void removeSong(song.id).then(() => navigate(lastRoomPath()));
            }}
          />
        </>
      )}
    </Popover>
  );
}
