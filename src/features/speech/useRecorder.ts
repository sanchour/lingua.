import { useCallback, useEffect, useRef, useState } from 'react';

export type RecorderStatus = 'idle' | 'starting' | 'recording';

/** Whether this browser can record from the microphone. */
export const canRecord = () => typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

/** Why the microphone didn't start, in words for the learner. */
function micMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Lingua may not use the microphone. Allow it in the browser’s settings for this site, then try again.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No microphone was found.';
  if (name === 'NotReadableError') return 'The microphone is busy in another app.';
  return 'The microphone didn’t start.';
}

/**
 * Recording from the microphone: start, then stop for the recording as one Blob. It stops by
 * itself after `maxMs` (Whisper's uploads stay small), and lets the microphone go on unmount.
 */
export function useRecorder(maxMs = 5 * 60_000) {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [elapsed, setElapsed] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const done = useRef<((blob: Blob | null) => void) | null>(null);

  const release = useCallback(() => {
    window.clearInterval(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    recorder.current = null;
  }, []);

  /** Ends the recording; the Blob (null when nothing was recorded) arrives once the recorder has flushed. */
  const stop = useCallback(
    () =>
      new Promise<Blob | null>((resolve) => {
        const r = recorder.current;
        if (!r || r.state === 'inactive') return resolve(null);
        done.current = resolve;
        r.stop();
      }),
    [],
  );

  const start = useCallback(async () => {
    if (!canRecord()) throw new Error('This browser can’t record from the microphone.');
    setStatus('starting');
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (error) {
      setStatus('idle');
      throw new Error(micMessage(error));
    }
    const r = new MediaRecorder(stream.current);
    chunks.current = [];
    r.ondataavailable = (e) => e.data.size > 0 && chunks.current.push(e.data);
    r.onstop = () => {
      const blob = chunks.current.length ? new Blob(chunks.current, { type: r.mimeType || 'audio/webm' }) : null;
      release();
      setStatus('idle');
      done.current?.(blob);
      done.current = null;
    };
    recorder.current = r;
    r.start(1000);
    startedAt.current = performance.now();
    setElapsed(0);
    setStatus('recording');
    timer.current = window.setInterval(() => {
      const ms = performance.now() - startedAt.current;
      setElapsed(ms);
      if (ms >= maxMs) void stop();
    }, 250);
  }, [maxMs, release, stop]);

  useEffect(
    () => () => {
      if (recorder.current?.state === 'recording') {
        recorder.current.onstop = null;
        recorder.current.stop();
      }
      release();
    },
    [release],
  );

  return { status, elapsed, start, stop };
}
