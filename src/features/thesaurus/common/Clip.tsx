import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Clapperboard, Headphones, Play, Square } from 'lucide-react';
import { db } from '@/data/db';
import type { Note } from '@/data/types';
import { cx } from '@/lib/cx';
import { pause as pauseAudio, usePlayer } from '@/services/audio/engine';

export interface ClipSource {
  kind: 'audio' | 'video';
  src: string;
  title: string;
  startMs: number;
  endMs: number;
}

/** Where a card's line can be heard again: its video or audio, from the stored file or its link. */
export function useClip(note: Note): ClipSource | null | undefined {
  return useClipAt(note.context?.mediaId, note.context?.startMs, note.context?.endMs);
}

/** The same for any stretch of an item (a line of a transcript heard in an exercise). */
export function useClipAt(mediaId: string | undefined, startMs: number | undefined, endMs?: number): ClipSource | null | undefined {
  const ctx = mediaId && startMs !== undefined ? { mediaId, startMs, endMs } : undefined;
  const source = useLiveQuery(async () => {
    if (!ctx?.mediaId || ctx.startMs === undefined) return null;
    const media = await db.media.get(ctx.mediaId);
    if (!media || media.deletedAt) return null;
    const blob = media.blobId ? (await db.blobs.get(media.blobId))?.blob : undefined;
    if (!blob && !media.remoteUrl) return null;
    return { kind: media.kind === 'video' ? 'video' : 'audio', blob, url: media.remoteUrl, title: media.title } as const;
  }, [ctx?.mediaId, ctx?.startMs]);
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!source) return setSrc(null);
    if (!source.blob) return setSrc(source.url ?? null);
    const url = URL.createObjectURL(source.blob);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [source]);
  if (source === undefined) return undefined;
  if (!source || !src || !ctx || ctx.startMs === undefined) return null;
  return { kind: source.kind, src, title: source.title, startMs: ctx.startMs, endMs: ctx.endMs ?? ctx.startMs + 4000 };
}

/** Plays exactly the clip (with a moment either side) and stops. */
function useClipPlayback(clip: ClipSource, el: () => HTMLMediaElement | null, rate = 1) {
  const [playing, setPlaying] = useState(false);
  const frame = useRef(0);
  const stop = () => {
    cancelAnimationFrame(frame.current);
    el()?.pause();
    setPlaying(false);
  };
  useEffect(() => stop, []);
  const play = () => {
    const m = el();
    if (!m) return;
    if (playing) return stop();
    if (usePlayer.getState().status === 'playing') pauseAudio();
    m.playbackRate = rate;
    const from = Math.max(0, clip.startMs - 150) / 1000;
    const to = (clip.endMs + 250) / 1000;
    const seek = () => (m.currentTime = from);
    if (m.readyState >= 1) seek();
    else m.addEventListener('loadedmetadata', seek, { once: true });
    setPlaying(true);
    void m.play().catch(() => setPlaying(false));
    const watch = () => {
      if (m.currentTime >= to || m.ended) return stop();
      frame.current = requestAnimationFrame(watch);
    };
    frame.current = requestAnimationFrame(watch);
  };
  return { playing, play };
}

/** The card's clip: a small round button for audio, the picture itself for video lines. */
export function ClipPlayer({ clip, large = false, rate = 1 }: { clip: ClipSource; large?: boolean; rate?: number }) {
  const audio = useRef<HTMLAudioElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const { playing, play } = useClipPlayback(clip, () => (clip.kind === 'video' ? video.current : audio.current), rate);
  const [shown, setShown] = useState(false);

  // The picture waits on the clip's first frame.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const cue = () => (v.currentTime = Math.max(0, clip.startMs - 150) / 1000);
    if (v.readyState >= 1) cue();
    else v.addEventListener('loadedmetadata', cue, { once: true });
    return () => v.removeEventListener('loadedmetadata', cue);
  }, [clip.src, clip.startMs]);

  if (clip.kind === 'audio') {
    return (
      <>
        <audio ref={audio} src={clip.src} preload="metadata" />
        <button
          type="button"
          aria-label={playing ? 'Stop the clip' : `Play the clip from ${clip.title}`}
          onClick={(e) => {
            e.stopPropagation();
            play();
          }}
          className={cx(
            large ? 'size-20 bg-sunken' : 'size-10',
            'no-callout grid shrink-0 place-items-center rounded-full text-ink-soft transition-[transform,background-color,color] hover:bg-sunken hover:text-ink active:scale-90',
            playing && 'bg-sage-soft text-sage-text',
          )}
        >
          {playing ? <Square size={large ? 26 : 15} className="fill-current" aria-hidden /> : <Headphones size={large ? 34 : 18} aria-hidden />}
        </button>
      </>
    );
  }

  return (
    <div className={cx('w-full', large ? 'mt-1' : '')} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label={playing ? 'Stop the clip' : `Play the clip from ${clip.title}`}
        onClick={() => {
          setShown(true);
          play();
        }}
        className={cx('group relative block w-full overflow-hidden rounded-2xl bg-black transition-[max-height] duration-300', shown || large ? 'aspect-video' : 'h-0')}
      >
        <video ref={video} src={clip.src} preload="metadata" playsInline className="size-full object-contain" />
        <span className={cx('absolute inset-0 grid place-items-center transition-opacity', playing ? 'opacity-0 group-hover:opacity-100' : 'opacity-100')}>
          <span className="grid size-12 place-items-center rounded-full bg-black/50 text-white backdrop-blur-md">
            {playing ? <Square size={16} className="fill-current" aria-hidden /> : <Play size={20} className="translate-x-0.5 fill-current" aria-hidden />}
          </span>
        </span>
      </button>
      {!shown && !large && (
        <button
          type="button"
          onClick={() => {
            setShown(true);
            play();
          }}
          className="no-callout inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-sunken hover:text-ink"
        >
          <Clapperboard size={15} aria-hidden /> Play the clip
        </button>
      )}
    </div>
  );
}
