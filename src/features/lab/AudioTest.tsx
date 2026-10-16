import { useEffect, useRef, useState } from 'react';
import { Headphones, Pause, Play } from 'lucide-react';
import { Badge, Button } from '@/design/primitives';
import { pickFile } from '@/services/files/files';
import { makeChimeWav } from './tone';
import { LabCard, LogList } from './LabCard';
import { useLabReport } from './report';

type Verdict = { hiddenSec: number; advancedSec: number; ok: boolean };

/**
 * Background playback check: play, lock the phone, come back. The audio clock is compared with
 * the wall clock across the hidden period. Uses a plain <audio> element, as Sonus will.
 */
export function AudioTest() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const urlRef = useRef<string | null>(null);
  const hiddenAt = useRef<{ wall: number; t: number } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const record = useLabReport((s) => s.record);

  const note = (line: string) => setLog((l) => [`${new Date().toLocaleTimeString()}  ${line}`, ...l].slice(0, 40));

  useEffect(() => {
    const onVisibility = () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (document.visibilityState === 'hidden') {
        hiddenAt.current = { wall: performance.now(), t: audio.currentTime };
        return;
      }
      const start = hiddenAt.current;
      hiddenAt.current = null;
      if (!start || audio.paused) {
        if (start) note('Came back: audio was paused.');
        return;
      }
      const hiddenSec = (performance.now() - start.wall) / 1000;
      if (hiddenSec < 3) return;
      // The track loops every 60 s, so unwrap the playhead.
      let advancedSec = audio.currentTime - start.t;
      while (advancedSec < hiddenSec - 30) advancedSec += audio.duration || 60;
      const v = { hiddenSec, advancedSec, ok: advancedSec >= hiddenSec * 0.8 };
      setVerdict(v);
      record('backgroundAudio', v);
      note(`Came back after ${hiddenSec.toFixed(1)} s; audio advanced ${advancedSec.toFixed(1)} s.`);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if ('mediaSession' in navigator) {
        for (const action of ['play', 'pause', 'seekbackward', 'seekforward', 'previoustrack', 'nexttrack'] as const) {
          try {
            navigator.mediaSession.setActionHandler(action, null);
          } catch {
            // Unsupported action on this browser.
          }
        }
      }
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [record]);

  const setupMediaSession = (title: string) => {
    if (!('mediaSession' in navigator)) {
      note('MediaSession is not supported here.');
      record('mediaSession', false);
      return;
    }
    record('mediaSession', true);
    const base = import.meta.env.BASE_URL;
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: 'Lingua · Device lab',
      album: 'Background audio test',
      artwork: [
        { src: `${base}pwa-192x192.png`, sizes: '192x192', type: 'image/png' },
        { src: `${base}pwa-512x512.png`, sizes: '512x512', type: 'image/png' },
      ],
    });
    const audio = audioRef.current!;
    const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ['play', () => void audio.play()],
      ['pause', () => audio.pause()],
      ['seekbackward', (d) => (audio.currentTime = Math.max(0, audio.currentTime - (d.seekOffset ?? 10)))],
      ['seekforward', (d) => (audio.currentTime = Math.min(audio.duration, audio.currentTime + (d.seekOffset ?? 10)))],
    ];
    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, (details) => {
          note(`Lock-screen control: ${action}`);
          record(`lockScreen.${action}`, true);
          handler(details);
        });
      } catch {
        note(`Action "${action}" is not supported.`);
      }
    }
  };

  const start = async (file?: File) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(file ?? makeChimeWav());
    audio.src = urlRef.current;
    setupMediaSession(file ? file.name : 'Chime every 2 seconds');
    try {
      await audio.play();
      note(file ? `Playing ${file.name}.` : 'Playing test chime. Now lock your phone for ~20 s.');
    } catch (error) {
      note(`Playback was blocked: ${(error as Error).message}`);
    }
  };

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio?.src) return void start();
    if (audio.paused) void audio.play();
    else audio.pause();
  };

  return (
    <LabCard icon={Headphones} title="Background audio" description="Press play, lock the screen for about 20 seconds, then come back.">
      {/* No `controls`, so the element itself is invisible; the buttons drive it. */}
      <audio
        ref={audioRef}
        loop
        preload="auto"
        onPlay={() => {
          setPlaying(true);
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        }}
        onPause={() => {
          setPlaying(false);
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button icon={playing ? Pause : Play} onClick={toggle}>
          {playing ? 'Pause' : 'Play test chime'}
        </Button>
        <Button variant="secondary" onClick={() => void pickFile('audio/*').then((f) => f && start(f))}>
          Use my own audio file
        </Button>
        {verdict && (
          <Badge tone={verdict.ok ? 'sage' : 'accent'}>{verdict.ok ? 'Kept playing while locked' : 'Stopped while locked'}</Badge>
        )}
      </div>
      <LogList lines={log} empty="Events appear here (play, lock-screen controls, coming back)." />
    </LabCard>
  );
}
