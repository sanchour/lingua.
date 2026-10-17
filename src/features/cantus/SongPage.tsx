import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  Crosshair,
  Ellipsis,
  ExternalLink,
  Gamepad2,
  Heart,
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
  Timer,
  Trash2,
  Volume2,
} from 'lucide-react';
import { useApp } from '@/app/context';
import { formatClock } from '@/core/audio/cues';
import { isTimed, parsePlain, sungLines } from '@/core/cantus/lyrics';
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
import { findLyrics, searchLyrics } from '@/services/cantus/lrclib';
import { geniusSearchUrl, lyricsOvh } from '@/services/cantus/lyricSources';
import type { FoundLyrics } from '@/services/cantus/lrclib';
import { paletteOf } from '@/services/cantus/palette';
import { findSpotifyTrack, spotifyTrackId } from '@/services/cantus/spotify';
import { translateLyrics } from '@/services/cantus/translate';
import { youtubeId } from '@/services/cantus/youtube';
import { toast } from '@/state/ui';
import { createSpotifyClock, createTimerClock, createYouTubeClock, shifted } from './player/clocks';
import type { ClockKind, SongClock, TimerClock } from './player/clocks';
import { LyricSheet } from './player/LyricSheet';
import { AppleMusicPlayer, SpotifyPlayer, YouTubePlayer } from './player/Players';
import { SongArt } from './SongArt';

export default function SongPage() {
  const { songId } = useParams();
  const song = useSong(songId);
  if (song === null || song?.deletedAt) {
    return (
      <div className="grid min-h-[60dvh] place-items-center text-center">
        <div>
          <p className="font-serif text-xl">This song isn’t in your music any more.</p>
          <Link to="/sonus" className="mt-4 inline-block font-semibold text-accent-text">
            Back to Music
          </Link>
        </div>
      </div>
    );
  }
  if (!song) return null;
  return <SongView key={song.id} song={song} />;
}

/** Fetches what a newly opened song still lacks: lyrics, colours, its Spotify track. */
function useSongSetup(song: Song) {
  const { settings } = useApp();
  const [lyrics, setLyrics] = useState<'idle' | 'loading' | 'failed'>('idle');
  const connected = Boolean(settings.spotify.refreshToken);

  useEffect(() => {
    void markSongPlayed(song.id);
  }, [song.id]);

  useEffect(() => {
    if (song.lines.length || song.lyricsMissing) return;
    let alive = true;
    setLyrics('loading');
    (async () => {
      const found = await findLyrics({ title: song.title, artist: song.artist, album: song.album, durationMs: song.durationMs });
      if (found && (found.lines.length || found.instrumental)) {
        return { lines: found.lines, lrclibId: found.id, lyricsFrom: 'lrclib' as const, instrumental: found.instrumental ? (1 as const) : undefined, lyricsMissing: found.lines.length ? undefined : (1 as const) };
      }
      // Not in LRCLIB: lyrics.ovh (plain text, not timed).
      const other = await lyricsOvh(song.title, song.artist);
      return other ? { lines: other.lines, lyricsFrom: other.from } : { lyricsMissing: 1 as const };
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
  }, [song.id, song.lines.length, song.lyricsMissing, song.title, song.artist, song.album, song.durationMs]);

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

  return lyrics;
}

function defaultSource(song: Song): ClockKind | null {
  if (song.youtubeId) return 'youtube';
  if (song.spotifyId) return 'spotify';
  if (song.itunesId) return 'apple';
  if (isTimed(song.lines)) return 'timer';
  return null;
}

function SongView({ song }: { song: Song }) {
  const { settings } = useApp();
  const { layout } = useLayout();
  const wide = layout === 'wide';
  const navigate = useNavigate();
  const lyricsState = useSongSetup(song);
  const savedLines = useSavedLines(song.id) ?? new Set<number>();
  const timed = isTimed(song.lines);

  // ── Where the music comes from ──────────────────────────────────────────
  const clocks = useMemo(() => ({ spotify: createSpotifyClock(), youtube: createYouTubeClock(), apple: createTimerClock('apple'), timer: createTimerClock() }), []);
  const [source, setSource] = useState<ClockKind | null>(() => defaultSource(song));
  // A source appears later (lyrics found, a link added, Spotify finds the track): use it.
  useEffect(() => {
    if (source === null) setSource(defaultSource(song));
  }, [source, song]);
  const clock: SongClock | null = source ? clocks[source] : null;
  const offsetRef = useRef(song.offsetMs ?? 0);
  offsetRef.current = song.offsetMs ?? 0;
  // Timers are set by the learner, so the song's timing nudge is for the players only.
  const lyricClock = useMemo(() => (clock && timed ? (clock.kind === 'timer' || clock.kind === 'apple' ? clock : shifted(clock, () => offsetRef.current)) : null), [clock, timed]);
  // Music playing in the Music app or on a speaker: the next tap on a line starts the lyrics there.
  const [syncing, setSyncing] = useState(false);
  useEffect(() => setSyncing(false), [source]);

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

  useHotkeys({ ' ': () => clock?.toggle() }, Boolean(clock));

  const [dialog, setDialog] = useState<'link' | 'lyrics' | null>(null);
  const tint = song.palette ? ({ '--song': song.palette.base, '--song-deep': song.palette.deep, '--song-soft': song.palette.soft } as CSSProperties) : undefined;

  const actions = (
    <div className="flex items-center gap-1.5">
      <Button variant={song.savedAt ? 'secondary' : 'primary'} icon={Heart} onClick={() => void setSongSaved(song.id, !song.savedAt)} className={cx(Boolean(song.savedAt) && '[&_svg]:fill-current')}>
        {song.savedAt ? 'In your songs' : 'Save'}
      </Button>
      {sungLines(song.lines).length >= 4 && (
        <IconButton icon={Gamepad2} label="Song games" variant="soft" onClick={() => navigate(`/sonus/song/${encodeURIComponent(song.id)}/games`)} />
      )}
      <SongMenu song={song} onLink={() => setDialog('link')} onLyrics={() => setDialog('lyrics')} />
    </div>
  );

  const player = <PlayerArea song={song} source={source} setSource={setSource} clocks={clocks} wide={wide} onLink={() => setDialog('link')} syncing={syncing} onSync={setSyncing} />;
  const translationBar = song.lines.length > 0 && (
    <TranslationBar song={song} mode={mode} translating={translating} onTranslate={() => void translate()} />
  );

  const sheet = song.lines.length ? (
    <>
      <LyricSheet
        song={song}
        clock={lyricClock}
        translationMode={song.translation ? mode : 'hide'}
        savedLines={savedLines}
        onSaveLine={(i) => void saveLine(i)}
        dockedHeight={wide ? 0 : 150}
        syncByTap={syncing}
        onSynced={() => setSyncing(false)}
      />
      <LyricsCredit song={song} />
    </>
  ) : (
    <NoLyrics song={song} state={lyricsState} onFind={() => setDialog('lyrics')} />
  );

  const dialogs = (
    <>
      <LinkDialog song={song} open={dialog === 'link'} onClose={() => setDialog(null)} onAdded={(kind) => setSource(kind)} />
      <LyricsDialog song={song} open={dialog === 'lyrics'} onClose={() => setDialog(null)} />
    </>
  );

  if (wide) {
    return (
      <div className="song-page relative" style={tint}>
        <div className="song-backdrop -mx-10 -mt-10" aria-hidden />
        <div className="relative">
          <Link to="/sonus" className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
            <ChevronLeft size={16} aria-hidden /> Music
          </Link>
          <div className="grid grid-cols-[minmax(260px,330px)_minmax(0,1fr)] gap-12">
            <aside className="sticky top-10 max-h-[calc(100dvh-5rem)] self-start overflow-y-auto [scrollbar-width:none]">
              <SongArt url={song.artworkUrl} title={song.title} className="song-art w-full" rounded="rounded-[22px]" />
              <SongTitle song={song} large />
              <div className="mt-4">{actions}</div>
              <div className="mt-6">{player}</div>
            </aside>
            <section aria-label="Lyrics" className="min-w-0 pt-2 pb-32">
              {translationBar}
              {sheet}
            </section>
          </div>
        </div>
        {dialogs}
      </div>
    );
  }

  // Phones: the whole screen, the player docked at the bottom.
  return (
    <div className="song-page relative min-h-dvh overflow-x-clip bg-bg" style={tint}>
      <div className="song-backdrop" aria-hidden />
      <header className="no-callout sticky top-0 z-20 flex items-center gap-1 bg-[color-mix(in_oklab,var(--song-wash)_70%,transparent)] px-2 pt-safe backdrop-blur-xl">
        <button type="button" aria-label="Close" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/sonus'))} className="grid size-11 place-items-center rounded-xl text-ink-soft">
          <ChevronDown size={24} aria-hidden />
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-[13px] font-semibold text-ink-soft">{song.artist}</p>
        <SongMenu song={song} onLink={() => setDialog('link')} onLyrics={() => setDialog('lyrics')} className="grid size-11 place-items-center rounded-xl text-ink-soft" />
      </header>
      <div className="relative px-5 pb-[calc(env(safe-area-inset-bottom)+180px)]">
        <div className="mt-2 flex items-center gap-4">
          <SongArt url={song.artworkUrl} title={song.title} className="song-art w-28" rounded="rounded-2xl" size={300} />
          <div className="min-w-0 flex-1">
            <SongTitle song={song} />
          </div>
        </div>
        <div className="mt-4">{actions}</div>
        {source === 'youtube' && song.youtubeId && <div className="mt-5">{player}</div>}
        <div className="mt-6">
          {translationBar}
          {sheet}
        </div>
      </div>
      {source !== 'youtube' && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line/70 bg-bg/92 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-xl">{player}</div>
      )}
      {source === 'youtube' && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line/70 bg-bg/92 px-4 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+10px)] backdrop-blur-xl">
          <SourceSwitch song={song} source={source} setSource={setSource} onLink={() => setDialog('link')} compact />
        </div>
      )}
      {dialogs}
    </div>
  );
}

function SongTitle({ song, large }: { song: Song; large?: boolean }) {
  const meta = [song.album, song.year].filter(Boolean).join(' · ');
  return (
    <div className={cx('min-w-0', large && 'mt-5')}>
      <h1 lang={song.lang} className={cx('font-serif leading-tight font-semibold tracking-tight', large ? 'text-[27px]' : 'text-[22px]')}>
        {song.title}
      </h1>
      <p className="mt-1 text-[15px] font-semibold text-[var(--song-ink)]">{song.artist}</p>
      {meta && <p className="mt-0.5 truncate text-[13px] text-ink-soft">{meta}</p>}
    </div>
  );
}

// ── The player area: a choice of source, then that source's player or timer ──────────────────

const SOURCE_LABEL: Record<ClockKind, string> = { youtube: 'YouTube', spotify: 'Spotify', apple: 'Apple Music', timer: 'Anywhere' };
const SOURCE_NOTE: Record<ClockKind, string> = { youtube: 'Playing from YouTube', spotify: 'Playing from Spotify', apple: 'Playing in Apple Music', timer: 'Along with music playing anywhere' };

function SourceSwitch({ song, source, setSource, onLink, compact }: { song: Song; source: ClockKind | null; setSource: (s: ClockKind) => void; onLink: () => void; compact?: boolean }) {
  const kinds = (['youtube', 'spotify', 'apple', 'timer'] as ClockKind[]).filter((k) => (k === 'youtube' ? song.youtubeId : k === 'spotify' ? song.spotifyId : k === 'apple' ? song.itunesId : isTimed(song.lines)));
  // Phones keep the dock small: a choice only when there is one (links are in the ⋯ menu).
  if (!kinds.length || (compact && kinds.length < 2)) return null;
  return (
    <div className="flex items-center gap-2">
      {kinds.length > 1 && source ? (
        <div className="min-w-0 flex-1">
          <Segmented<ClockKind> label="Play from" value={source} onChange={setSource} block options={kinds.map((k) => ({ value: k, label: SOURCE_LABEL[k] }))} />
        </div>
      ) : (
        <p className="min-w-0 flex-1 truncate text-[13px] text-ink-soft">{source ? SOURCE_NOTE[source] : ''}</p>
      )}
      <IconButton icon={Link2} label="Add a YouTube or Spotify link" variant="soft" onClick={onLink} />
    </div>
  );
}

function PlayerArea({
  song,
  source,
  setSource,
  clocks,
  wide,
  onLink,
  syncing,
  onSync,
}: {
  song: Song;
  source: ClockKind | null;
  setSource: (s: ClockKind) => void;
  clocks: { spotify: ReturnType<typeof createSpotifyClock>; youtube: ReturnType<typeof createYouTubeClock>; apple: TimerClock; timer: TimerClock };
  wide: boolean;
  onLink: () => void;
  syncing: boolean;
  onSync: (on: boolean) => void;
}) {
  const timed = isTimed(song.lines);
  return (
    <div className="space-y-3">
      {wide && <SourceSwitch song={song} source={source} setSource={setSource} onLink={onLink} />}
      {source === 'youtube' && song.youtubeId && <YouTubePlayer videoId={song.youtubeId} clock={clocks.youtube} />}
      {source === 'spotify' && song.spotifyId && <SpotifyPlayer trackId={song.spotifyId} clock={clocks.spotify} compact={!wide} />}
      {source === 'apple' && wide && <AppleMusicPlayer song={song} clock={clocks.apple} />}
      {source === 'apple' && !wide && <AppleMusicLink song={song} onOpened={() => timed && onSync(true)} />}
      {source === 'apple' && timed && <TimerControls clock={clocks.apple} apple syncing={syncing} onSync={onSync} compact={!wide} />}
      {source === 'timer' && <TimerControls clock={clocks.timer} syncing={syncing} onSync={onSync} />}
      {source === null && <NoPlayer song={song} onLink={onLink} />}
      {(source === 'youtube' || source === 'spotify') && timed && <TimingNudge song={song} />}
      {!wide && source !== 'youtube' && <SourceSwitch song={song} source={source} setSource={setSource} onLink={onLink} compact />}
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
  const round = 'grid size-11 shrink-0 place-items-center rounded-full text-ink-soft transition-[transform,background-color] hover:bg-sunken active:scale-90';
  return (
    <div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => clock.toggle()} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--song-ink)] font-semibold text-bg shadow-elev-1 transition-transform active:scale-[0.98]">
          {playing ? <Pause size={19} className="fill-current" aria-hidden /> : <Play size={19} className="fill-current" aria-hidden />}
          {playing ? 'Pause' : now > 0 ? 'Go on' : 'Start'}
        </button>
        <button type="button" aria-label="A second back" onClick={() => clock.nudge(-1000)} className={round}>
          <Minus size={18} aria-hidden />
        </button>
        <span className="w-12 text-center text-[13px] font-semibold text-ink-soft tabular-nums">{formatClock(now)}</span>
        <button type="button" aria-label="A second ahead" onClick={() => clock.nudge(1000)} className={round}>
          <Plus size={18} aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Tap the line you’re hearing"
          aria-pressed={syncing}
          title="Tap the line you’re hearing"
          onClick={() => onSync(!syncing)}
          className={syncing ? 'grid size-11 shrink-0 place-items-center rounded-full bg-[var(--song-ink)] text-bg shadow-elev-1 transition-transform active:scale-90' : round}
        >
          <Crosshair size={18} aria-hidden />
        </button>
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
function LyricsCredit({ song }: { song: Song }) {
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
      {!isTimed(song.lines) && ' · not timed to the music'}
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
          ? 'These lyrics have no timings, so they won’t follow the music; scroll along as you listen.'
          : 'Add the song’s YouTube or Spotify link to play it here with the lyrics following.'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" icon={Link2} onClick={onLink}>
          Add a link
        </Button>
        <PreviewButton song={song} />
      </div>
    </div>
  );
}

/** Apple's 30-second preview: a taste of the song. */
function PreviewButton({ song }: { song: Song }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => audio.current?.pause(), []);
  if (!song.previewUrl) return null;
  const toggle = () => {
    audio.current ??= new Audio(song.previewUrl);
    const a = audio.current;
    a.onended = () => setPlaying(false);
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      if (usePlayer.getState().status === 'playing') pauseSonus();
      void a.play().then(() => setPlaying(true)).catch(() => toast('The preview couldn’t play.'));
    }
  };
  return (
    <Button size="sm" variant="ghost" icon={playing ? Pause : Volume2} onClick={toggle}>
      {playing ? 'Stop preview' : 'Hear 30 seconds'}
    </Button>
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

function NoLyrics({ song, state, onFind }: { song: Song; state: 'idle' | 'loading' | 'failed'; onFind: () => void }) {
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
    <div className="rounded-3xl border border-line/70 bg-surface p-6 text-center">
      <Music2 size={26} className="mx-auto text-[var(--song-ink)]" aria-hidden />
      <p className="mt-3 font-serif text-lg font-semibold">{song.instrumental ? 'This song has no words.' : state === 'failed' ? 'The lyrics couldn’t be fetched.' : 'No lyrics found yet.'}</p>
      {!song.instrumental && (
        <>
          <p className="mx-auto mt-1 max-w-sm text-[14px] text-ink-soft">
            {state === 'failed' ? 'Check the connection, then try again.' : 'Search under another name, or find them on Genius and paste them here.'}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {state === 'failed' ? (
              <Button variant="secondary" icon={RotateCcw} onClick={() => void patchSong(song.id, { lyricsMissing: undefined })}>
                Try again
              </Button>
            ) : (
              <Button variant="secondary" icon={Search} onClick={onFind}>
                Find the lyrics
              </Button>
            )}
            <a href={geniusSearchUrl(song.title, song.artist)} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-1.5 rounded-2xl px-4 font-semibold text-ink-soft transition-colors hover:bg-sunken">
              On Genius <ExternalLink size={14} aria-hidden />
            </a>
          </div>
        </>
      )}
    </div>
  );
}

function LyricsDialog({ song, open, onClose }: { song: Song; open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState(`${song.title} ${song.artist}`);
  const [results, setResults] = useState<FoundLyrics[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [paste, setPaste] = useState(false);
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
    await patchSong(song.id, { translation: undefined, lyricsMissing: undefined, offsetMs: undefined, ...patch });
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
                <button
                  type="button"
                  onClick={() => void use({ lines: r.lines, lrclibId: r.id, lyricsFrom: 'lrclib' })}
                  className="w-full rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-sunken"
                >
                  <span className="block text-[14.5px] font-semibold">
                    {r.title} <span className="font-normal text-ink-soft">· {r.artist}</span>
                  </span>
                  <span className="block truncate text-[12.5px] text-ink-faint">
                    {r.timed ? 'Timed to the music' : 'Not timed'}
                    {r.durationMs ? ` · ${formatClock(r.durationMs)}` : ''} · {r.lines.find((l) => l.text)?.text}
                  </span>
                </button>
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
              void removeSong(song.id).then(() => navigate('/sonus'));
            }}
          />
        </>
      )}
    </Popover>
  );
}

