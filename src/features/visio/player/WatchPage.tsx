import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Bookmark, ChevronLeft, FileVideo, Repeat, SkipBack, SkipForward, Timer } from 'lucide-react';
import { useApp } from '@/app/context';
import { BackLink } from '@/app/BackLink';
import { cueIndexAt, formatDuration } from '@/core/audio/cues';
import { TimerVideo } from '@/core/visio/videoLike';
import type { VideoLike } from '@/core/visio/videoLike';
import { getLanguage, GLOSS_LANG } from '@/core/lang/languages';
import { recordSession } from '@/data/activity';
import { db } from '@/data/db';
import { savePlayback, updateMedia, useMedia, usePlaybackMap } from '@/data/media';
import { patchSetting } from '@/data/settings';
import type { Cue, Media } from '@/data/types';
import { attachVideoFile, saveLine, useTracks, videoBlob } from '@/data/video';
import type { Tracks } from '@/data/video';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { useLayout } from '@/design/hooks/useLayout';
import { Button, Card } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { KaraokeTranscript } from '@/features/sonus/player/KaraokeTranscript';
import { pause as pauseAudio, usePlayer } from '@/services/audio/engine';
import { pickFile } from '@/services/files/files';
import { VIDEO_ACCEPT } from '@/services/visio/files';
import { toVtt } from '@/services/visio/subtitles';
import { translateLine } from '@/services/translate/gloss';
import { toast } from '@/state/ui';
import { OwnWordsButton } from '@/features/production/OwnWords';
import { VideoOptions } from '../library/VideoOptions';
import { createVideoClock } from './clock';
import { lineAt, matchingLine, nextLineStart, previousLineStart } from './lines';
import { SubtitleSettings } from './SubtitleSettings';
import { TrackPanel } from './TrackPanel';
import { VideoStage } from './VideoStage';
import { YouTubeEmbed } from './YouTubeEmbed';
import type { LineActions } from './VideoStage';

export default function WatchPage() {
  const { mediaId } = useParams();
  const media = useMedia(mediaId);
  const tracks = useTracks(mediaId);
  if (media === null || media?.deletedAt) {
    return (
      <div className="grid min-h-[60dvh] place-items-center text-center">
        <div>
          <p className="font-serif text-xl">This video isn’t in your library any more.</p>
          <Link to="/sonus?show=watch" className="mt-4 inline-block font-semibold text-accent-text">
            Back to Sonus et Visio
          </Link>
        </div>
      </div>
    );
  }
  if (!media || !tracks) return null;
  return <Watch key={media.id} media={media} tracks={tracks} />;
}

/** The file (an object URL) or the link the video plays from; null for subtitles only. */
function useVideoSource(media: Media): string | null | undefined {
  const [src, setSrc] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!media.blobId) return setSrc(media.remoteUrl ?? null);
    let url: string | null = null;
    let alive = true;
    void videoBlob(media).then((blob) => {
      if (!alive) return;
      url = blob ? URL.createObjectURL(blob) : null;
      setSrc(url ?? media.remoteUrl ?? null);
    });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [media.blobId, media.remoteUrl]);
  return src;
}

/** WebVTT copies of the tracks for the phone's own full-screen player. */
function useVttTracks(media: Media, tracks: Tracks) {
  const target = tracks.target?.cues;
  const native = tracks.native?.cues;
  const urls = useMemo(() => {
    const out: Array<{ src: string; lang: string; label: string; role: 'target' | 'native' }> = [];
    if (target?.length) out.push({ src: URL.createObjectURL(new Blob([toVtt(target)], { type: 'text/vtt' })), lang: media.lang, label: getLanguage(media.lang)?.name ?? media.lang, role: 'target' });
    if (native?.length) out.push({ src: URL.createObjectURL(new Blob([toVtt(native)], { type: 'text/vtt' })), lang: GLOSS_LANG, label: 'English', role: 'native' });
    return out;
  }, [target, native, media.lang]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u.src)), [urls]);
  return urls;
}

function Watch({ media, tracks }: { media: Media; tracks: Tracks }) {
  const { settings } = useApp();
  const { layout } = useLayout();
  const navigate = useNavigate();
  const wide = layout === 'wide';
  const fileSrc = useVideoSource(media);
  const src = media.youtubeId ? null : fileSrc;
  const vtt = useVttTracks(media, tracks);
  const playback = usePlaybackMap()?.get(media.id);
  const target = tracks.target?.cues ?? null;
  const native = tracks.native?.cues ?? null;
  const autoPause = settings.visio.autoPause;

  const clock = useMemo(createVideoClock, []);
  const stageRef = useRef<HTMLDivElement>(null);
  const [el, setEl] = useState<HTMLVideoElement | null>(null);
  const [embedded, setEmbedded] = useState<VideoLike | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  // A subtitles-only item gets a follow clock: play it when the show plays in its own app, and nudge it until the lines match.
  const following = !media.youtubeId && src === null && Boolean(target?.length);
  const followMs = media.durationMs ?? (target?.length ? target[target.length - 1].endMs + 5000 : 0);
  const follow = useMemo(() => new TimerVideo({ durationMs: Math.max(followMs, 1000) }), [followMs]);
  useEffect(() => () => follow.dispose(), [follow]);
  const player: VideoLike | null = media.youtubeId ? embedded : src ? el : following ? follow : null;
  const ready = Boolean(player);

  // ── The video element: clock, resume, saving the place, watch time ──
  const resumed = useRef(false);
  const resumeAt = useRef(playback && !playback.completed ? playback.positionMs : 0);
  useEffect(() => {
    if (playback && !resumed.current && !playback.completed) resumeAt.current = playback.positionMs;
  }, [playback]);

  useEffect(() => {
    const v = player;
    if (!v) return;
    clock.attach(v);
    if (playback?.rate) v.playbackRate = playback.rate;
    let watchedMs = 0;
    let since = 0;
    let startedAt = Date.now();
    let savedAt = 0;
    let first = true;
    const flush = () => {
      if (since) watchedMs += performance.now() - since;
      since = v.paused ? 0 : performance.now();
      if (watchedMs < 5000) return;
      const activeMs = Math.round(watchedMs);
      watchedMs = 0;
      void recordSession({ lang: media.lang, type: 'watch', refId: media.id, startedAt, endedAt: Date.now(), activeMs });
      startedAt = Date.now();
    };
    const save = (completed = false) => void savePlayback(media.id, completed ? 0 : v.currentTime * 1000, v.playbackRate, completed);
    const onMeta = () => {
      for (const t of v.textTracks ?? []) t.mode = 'hidden';
      const at = resumeAt.current;
      if (!resumed.current && at > 5000 && at < v.duration * 1000 - 10_000) v.currentTime = at / 1000;
      resumed.current = true;
      if (!following && Number.isFinite(v.duration) && Math.abs((media.durationMs ?? 0) - v.duration * 1000) > 1500) void updateMedia(media.id, { durationMs: Math.round(v.duration * 1000) });
    };
    const onPlay = () => {
      since = performance.now();
      if (usePlayer.getState().status === 'playing') pauseAudio();
      if (first) {
        first = false;
        void updateMedia(media.id, { lastPlayedAt: Date.now() });
      }
    };
    const onPause = () => {
      flush();
      save();
    };
    const onTime = () => {
      if (performance.now() - savedAt > 5000) {
        savedAt = performance.now();
        save();
      }
    };
    const onEnded = () => {
      flush();
      save(true);
      // Read the count now: `media` here is the one from when this page opened.
      void db.media.get(media.id).then((m) => updateMedia(media.id, { watches: (m?.watches ?? 0) + 1 }));
    };
    // iPhone's own full-screen player draws the subtitles from the <track>s.
    const onNativeFs = (showing: boolean) => () => {
      for (const t of v.textTracks ?? []) t.mode = showing && t.language === media.lang ? 'showing' : 'hidden';
    };
    const begin = onNativeFs(true);
    const end = onNativeFs(false);
    const onHidden = () => document.visibilityState === 'hidden' && flush();
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('ended', onEnded);
    v.addEventListener('webkitbeginfullscreen', begin);
    v.addEventListener('webkitendfullscreen', end);
    document.addEventListener('visibilitychange', onHidden);
    if (v.readyState >= 1) onMeta();
    return () => {
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('ended', onEnded);
      v.removeEventListener('webkitbeginfullscreen', begin);
      v.removeEventListener('webkitendfullscreen', end);
      document.removeEventListener('visibilitychange', onHidden);
      flush();
      if (v.currentTime > 0) save(v.ended);
      clock.attach(null);
    };
    // The place is read once; later saves come from this effect itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, clock, media.id, media.lang]);

  // A new <track> starts out "showing" in some browsers; Lingua draws its own subtitles.
  useEffect(() => {
    if (el) for (const t of el.textTracks) t.mode = 'hidden';
  }, [vtt, el]);

  // ── Auto-pause at the end of each line ──
  const pausedFor = useRef(-1);
  useEffect(() => {
    if (!autoPause || !target?.length) return;
    return clock.onTime((ms) => {
      const v = clock.video();
      if (!v || v.paused) return;
      const i = cueIndexAt(target, ms);
      const cue = target[i];
      if (cue && ms >= cue.endMs - 40 && ms < cue.endMs + 500 && pausedFor.current !== i) {
        pausedFor.current = i;
        v.pause();
      }
    });
  }, [autoPause, target, clock]);

  // ── Holding still while you look a word up ──
  const heldPlaying = useRef(false);
  const onHold = useCallback(
    (holding: boolean) => {
      const v = clock.video();
      if (!v) return;
      if (holding) {
        if (!v.paused) {
          heldPlaying.current = true;
          v.pause();
        }
      } else if (heldPlaying.current) {
        heldPlaying.current = false;
        void v.play().catch(() => undefined);
      }
    },
    [clock],
  );

  // ── Lines ──
  const go = (ms: number | null) => {
    if (ms === null) return;
    pausedFor.current = -1;
    clock.seek(ms);
    clock.play();
  };
  const currentCue = (): Cue | undefined => {
    if (!target) return undefined;
    const ms = clock.now();
    const i = lineAt(target, ms);
    return target[i >= 0 ? i : cueIndexAt(target, ms)];
  };
  const lines: LineActions = {
    hasLines: Boolean(target?.length),
    previous: () => target && go(previousLineStart(target, clock.now())),
    next: () => target && go(nextLineStart(target, clock.now())),
    repeat: () => {
      const cue = currentCue();
      if (cue) go(cue.startMs);
    },
    save: async () => {
      const cue = currentCue();
      if (!cue) return;
      const translation = matchingLine(native, cue)?.text ?? (await translateLine(media.lang, cue.text).catch(() => null)) ?? '';
      const added = await saveLine(media, cue, translation);
      toast(added ? 'Line saved to “From Visio”. Its card replays the clip.' : 'This line is already saved.', { tone: added ? 'success' : 'default' });
    },
  };

  const toggleFullscreen = () => {
    const stage = stageRef.current;
    const v = el as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (document.fullscreenElement) return void document.exitFullscreen();
    if (stage && document.fullscreenEnabled) void stage.requestFullscreen().catch(() => v?.webkitEnterFullscreen?.());
    else v?.webkitEnterFullscreen?.();
  };
  useEffect(() => {
    const on = () => setFullscreen(document.fullscreenElement === stageRef.current && Boolean(stageRef.current));
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  const toggle = () => {
    const v = clock.video();
    if (!v) return;
    if (v.paused) void v.play().catch(() => undefined);
    else v.pause();
  };
  const cycleNative = () => {
    const order = ['show', 'blur', 'after', 'hide'] as const;
    const next = order[(order.indexOf(settings.visio.native as (typeof order)[number]) + 1) % order.length];
    void patchSetting('visio', { native: next });
    toast(next === 'show' ? 'English line shown.' : next === 'blur' ? 'English line blurred.' : next === 'after' ? 'English line comes after the line.' : 'English line hidden.');
  };
  useHotkeys(
    {
      ' ': toggle,
      arrowleft: () => clock.seek(clock.now() - 5000),
      arrowright: () => clock.seek(clock.now() + 5000),
      arrowup: lines.previous,
      arrowdown: lines.next,
      r: lines.repeat,
      s: () => void lines.save(),
      f: toggleFullscreen,
      c: cycleNative,
      ',': () => following && nudge(-500),
      '.': () => following && nudge(500),
      p: () => {
        void patchSetting('visio', { autoPause: !autoPause });
        toast(autoPause ? 'Auto-pause off.' : 'Pausing after each line.');
      },
    },
    ready,
  );

  const nudge = (ms: number) => clock.seek(clock.now() + ms);

  const placeholder = (
    <div className="absolute inset-0 grid place-items-center bg-[#1d1a17] p-6 text-center text-white/85">
      <div>
        <FileVideo size={30} className="mx-auto mb-3 opacity-70" aria-hidden />
        <p className="font-serif text-lg font-semibold text-white">Subtitles only</p>
        <p className="mx-auto mt-1 max-w-xs text-[13.5px] text-white/70">Attach the video file to watch it here. The lines below can be read, looked up and saved meanwhile.</p>
        <button
          type="button"
          onClick={async () => {
            const file = await pickFile(VIDEO_ACCEPT);
            if (file) await attachVideoFile(media.id, file);
          }}
          className="mt-4 rounded-full bg-white px-4 py-2 text-[14px] font-semibold text-[#1d1a17]"
        >
          Attach the video file
        </button>
      </div>
    </div>
  );

  const followPanel = (
    <div className="absolute inset-0 grid place-items-center bg-[#1d1a17] p-6 text-center text-white/85">
      <div className="-mt-16">
        <Timer size={28} className="mx-auto mb-3 opacity-70" aria-hidden />
        <p className="font-serif text-lg font-semibold text-white">Follow along</p>
        <p className="mx-auto mt-1 max-w-sm text-[13.5px] text-white/70">Press play here when your show plays in its own app, and pause it when you pause. If the lines drift, nudge them with , and . (half a second).</p>
      </div>
    </div>
  );

  const stage = (
    <VideoStage
      media={media}
      src={src ?? null}
      target={target}
      native={native}
      clock={clock}
      stageRef={stageRef}
      player={player}
      onVideo={setEl}
      live={following || Boolean(media.youtubeId)}
      embed={media.youtubeId ? <YouTubeEmbed id={media.youtubeId} onPlayer={setEmbedded} /> : undefined}
      tracks={vtt}
      lines={lines}
      fullscreen={fullscreen}
      onFullscreen={toggleFullscreen}
      onHold={onHold}
      placeholder={following ? followPanel : src === null && !media.youtubeId ? placeholder : null}
    />
  );

  const lineBar = (
    <div className="flex items-center gap-1 px-3 sm:px-0">
      <LineButton icon={SkipBack} label="Previous line" shortcut="↑" onClick={lines.previous} disabled={!lines.hasLines || !ready} />
      <LineButton icon={Repeat} label="Repeat line" shortcut="R" onClick={lines.repeat} disabled={!lines.hasLines || !ready} />
      <LineButton icon={SkipForward} label="Next line" shortcut="↓" onClick={lines.next} disabled={!lines.hasLines || !ready} />
      {following && (
        <>
          <Button size="sm" variant="ghost" onClick={() => nudge(-500)} aria-label="Lines half a second earlier">
            −0.5 s
          </Button>
          <Button size="sm" variant="ghost" onClick={() => nudge(500)} aria-label="Lines half a second later">
            +0.5 s
          </Button>
        </>
      )}
      <span className="flex-1" />
      <Button size="sm" variant="secondary" icon={Bookmark} onClick={() => void lines.save()} disabled={!lines.hasLines || !ready}>
        Save line
      </Button>
      <SubtitleSettings />
    </div>
  );

  const meta = [media.collection, media.durationMs && formatDuration(media.durationMs)].filter(Boolean);
  const details = (
    <div className="flex items-start gap-2 px-3 sm:px-0">
      <div className="min-w-0 flex-1">
        <h1 lang={media.lang} className={cx('font-serif leading-tight font-semibold tracking-tight', wide ? 'text-[26px]' : 'text-[20px]')}>
          {media.title}
        </h1>
        {meta.length > 0 && <p className="mt-1 text-[13.5px] text-ink-soft">{meta.join(' · ')}</p>}
      </div>
      <OwnWordsButton lang={media.lang} lane="watch" title={media.title} refId={media.id} />
      <VideoOptions media={media} onRemoved={() => navigate('/sonus?show=watch')} />
    </div>
  );

  const transcript = target?.length ? (
    <section aria-label="Lines">
      <p className="mb-3 text-[12.5px] font-bold tracking-wide text-ink-soft uppercase">All lines</p>
      <KaraokeTranscript media={media} cues={target} live={ready} clock={clock} gutter={false} docked={false} />
    </section>
  ) : null;

  if (wide) {
    return (
      <>
        <BackLink to="/sonus?show=watch">Sonus et Visio</BackLink>
        <div className="grid gap-8 min-[1180px]:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-5">
            {stage}
            {lineBar}
            {details}
            <TrackPanel media={media} tracks={tracks} />
          </div>
          <aside className="min-w-0 min-[1180px]:sticky min-[1180px]:top-8 min-[1180px]:max-h-[calc(100dvh-4rem)] min-[1180px]:self-start min-[1180px]:overflow-x-hidden min-[1180px]:overflow-y-auto min-[1180px]:pr-1">
            {transcript ?? (
              <Card className="text-[14px] text-ink-soft">
                Once there are {getLanguage(media.lang)?.name ?? ''} subtitles, every line appears here to read along, look up and jump to.
              </Card>
            )}
          </aside>
        </div>
      </>
    );
  }

  // Phones: the picture stays at the top while the lines scroll beneath it.
  return (
    <div className="min-h-dvh bg-bg pb-[calc(env(safe-area-inset-bottom)+40px)]">
      <header className="no-callout sticky top-0 z-20 flex items-center gap-1 bg-bg/90 px-2 pt-safe backdrop-blur-xl">
        <button type="button" aria-label="Back to Sonus et Visio" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/sonus?show=watch'))} className="grid size-11 place-items-center rounded-xl text-ink-soft">
          <ChevronLeft size={24} aria-hidden />
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-[13px] font-semibold text-ink-soft">{media.collection ?? 'Visio'}</p>
        <span className="size-11" />
      </header>
      <div className="sticky top-[calc(env(safe-area-inset-top)+44px)] z-10">{stage}</div>
      <div className="mt-3 space-y-5">
        {lineBar}
        {details}
        {transcript && <div className="px-5">{transcript}</div>}
        <div className="px-3">
          <TrackPanel media={media} tracks={tracks} />
        </div>
      </div>
    </div>
  );
}

function LineButton({ icon: Icon, label, shortcut, onClick, disabled }: { icon: typeof Repeat; label: string; shortcut: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={`${label} (${shortcut})`}
      onClick={onClick}
      disabled={disabled}
      className="grid size-10 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-surface hover:text-ink active:scale-95 disabled:opacity-40"
    >
      <Icon size={19} aria-hidden />
    </button>
  );
}
