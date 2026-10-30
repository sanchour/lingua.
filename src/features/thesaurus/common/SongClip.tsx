import { useUi } from '@/design/i18n/UiText';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Music2, Play, Square } from 'lucide-react';
import { useSong } from '@/data/songs';
import type { Note } from '@/data/types';
import { cx } from '@/lib/cx';
import { pause as pauseAudio, usePlayer } from '@/services/audio/engine';
import { loadSpotifyApi } from '@/services/sonus/spotify';
import type { SpotifyController } from '@/services/sonus/spotify';
import { SongArt } from '@/features/cantus/SongArt';

/**
 * A card from a song: which song it's from, and its line played again when the song can play
 * here (its YouTube video, or Spotify). Otherwise a link back to the song.
 */
export function SongClip({ note }: { note: Note }) {
  const translateUi = useUi();
  const song = useSong(note.context?.songId);
  const [playing, setPlaying] = useState(false);
  if (!song || song.deletedAt) return null;
  const start = note.context?.startMs;
  const end = note.context?.endMs ?? (start !== undefined ? start + 5000 : undefined);
  const shift = song.offsetMs ?? 0;
  const canPlay = start !== undefined && Boolean(song.youtubeId || song.spotifyId);

  return (
    <div className="mx-auto mt-4 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-3 rounded-2xl bg-sunken/60 p-2.5 text-left">
        <SongArt url={song.artworkUrl} title={song.title} className="w-11" rounded="rounded-lg" size={100} />
        <Link to={`/sonus/song/${encodeURIComponent(song.id)}`} className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold">{song.title}</span>
          <span className="block truncate text-[12.5px] text-ink-soft">{song.artist}</span>
        </Link>
        {canPlay ? (
          <button
            type="button"
            aria-label={playing ? translateUi('Stop the line') : translateUi('Play the line from the song')}
            onClick={() => {
              if (!playing && usePlayer.getState().status === 'playing') pauseAudio();
              setPlaying((p) => !p);
            }}
            className={cx('no-callout grid size-10 shrink-0 place-items-center rounded-full transition-[transform,background-color] active:scale-90', playing ? 'bg-sage-soft text-sage-text' : 'bg-surface text-ink-soft hover:text-ink')}
          >
            {playing ? <Square size={14} className="fill-current" aria-hidden /> : <Play size={16} className="fill-current" aria-hidden />}
          </button>
        ) : (
          <Music2 size={17} className="mr-2 shrink-0 text-ink-faint" aria-hidden />
        )}
      </div>
      {playing && start !== undefined && end !== undefined && (
        song.youtubeId ? (
          <iframe
            title={translateUi('{0}: this line', [song.title])}
            src={`https://www.youtube-nocookie.com/embed/${song.youtubeId}?start=${Math.max(0, Math.floor((start + shift) / 1000) - 1)}&end=${Math.ceil((end + shift) / 1000) + 1}&autoplay=1&playsinline=1&rel=0&modestbranding=1`}
            allow="autoplay; encrypted-media; picture-in-picture"
            className="mt-2 aspect-video w-full rounded-xl border-0 bg-black"
          />
        ) : (
          <SpotifyLine trackId={song.spotifyId!} startMs={start + shift} endMs={end + shift} onEnd={() => setPlaying(false)} />
        )
      )}
    </div>
  );
}

/** Spotify's compact player, started at the line and stopped after it. */
function SpotifyLine({ trackId, startMs, endMs, onEnd }: { trackId: string; startMs: number; endMs: number; onEnd: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let controller: (SpotifyController & { loadUri(uri: string, preferVideo?: boolean, startAt?: number): void }) | null = null;
    let cancelled = false;
    let stopped = false;
    const target = document.createElement('div');
    el.replaceChildren(target);
    void loadSpotifyApi().then((api) => {
      if (cancelled) return;
      api.createController(target, { uri: `spotify:track:${trackId}`, width: '100%', height: 80 }, (c) => {
        if (cancelled) return c.destroy();
        controller = c as typeof controller;
        c.addListener('ready', () => {
          controller?.loadUri(`spotify:track:${trackId}`, false, Math.max(0, Math.floor(startMs / 1000) - 1));
          c.play();
        });
        c.addListener('playback_update', (e) => {
          if (!stopped && !e.data.isPaused && e.data.position >= endMs + 600) {
            stopped = true;
            c.togglePlay();
            onEnd();
          }
        });
      });
    });
    return () => {
      cancelled = true;
      controller?.destroy();
    };
  }, [trackId, startMs, endMs, onEnd]);
  return <div ref={host} className="mt-2 min-h-[80px] overflow-hidden rounded-xl [&_iframe]:rounded-xl" />;
}
