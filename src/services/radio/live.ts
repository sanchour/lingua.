// A live transcript of the station on air. Where the station's server lets web pages read its
// stream (most do), the stream is read a second time, cut into parts of about twelve seconds, and
// Whisper writes each one out (Groq with a key, or on this device), a little behind the sound.
import { create } from 'zustand';
import { frameLength } from '@/core/audio/mp3';
import type { Cue } from '@/data/types';
import { usePlayer } from '@/services/audio/engine';
import { clipBlocker, transcribeClip, TranscribeError } from '@/services/transcribe/groq';

const PART_MS = 12_000;
/** Lines kept on screen; older ones go. */
const KEEP = 80;
const PREF = 'lingua.radio.live';

export interface LiveState {
  /** The learner wants stations written out. */
  on: boolean;
  /** The station the lines belong to. */
  mediaId: string | null;
  status: 'off' | 'connecting' | 'listening' | 'writing' | 'paused' | 'blocked' | 'error';
  message?: string;
  /** Times count from when the transcript started. */
  cues: Cue[];
}

const wanted = () => {
  try {
    return localStorage.getItem(PREF) === '1';
  } catch {
    return false;
  }
};

export const useLive = create<LiveState>(() => ({ on: wanted(), mediaId: null, status: 'off', cues: [] }));

let run: AbortController | null = null;
/** Stations whose stream can't be read here: not tried again this session. */
const blocked = new Map<string, string>();
let startedAt = 0;

export function setLiveTranscript(on: boolean): void {
  try {
    localStorage.setItem(PREF, on ? '1' : '0');
  } catch {
    // Private mode: the choice lasts until the app closes.
  }
  useLive.setState({ on, ...(on ? {} : { status: 'off', message: undefined }) });
  sync();
}

function stop() {
  run?.abort();
  run = null;
}

/** Starts, pauses or stops listening along as the player and the learner's choice change. */
function sync() {
  const { on, mediaId } = useLive.getState();
  const { media, status } = usePlayer.getState();
  const live = media?.kind === 'radio' && media.remoteUrl ? media : null;
  if ((live?.id ?? null) !== mediaId) {
    stop();
    startedAt = Date.now();
    useLive.setState({ mediaId: live?.id ?? null, cues: [], status: 'off', message: undefined });
  }
  if (!live || !on) return void (run && stop());
  const why = blocked.get(live.id);
  if (why) return useLive.setState({ status: 'blocked', message: why });
  if (status === 'playing') {
    if (!run) void listen(live.id, live.remoteUrl!, live.lang);
  } else if (run) {
    stop();
    useLive.setState({ status: 'paused' });
  }
}

usePlayer.subscribe(sync);

/** Where the first whole MP3 or AAC (ADTS) frame starts, so a part decodes cleanly. */
export function firstFrame(b: Uint8Array): number {
  for (let i = 0; i + 8 < Math.min(b.length, 16_384); i++) {
    if (b[i] !== 0xff) continue;
    const mp3 = frameLength(b, i);
    if (mp3 > 0 && frameLength(b, i + mp3) > 0) return i;
    if ((b[i + 1] & 0xf6) === 0xf0) {
      const adts = ((b[i + 3] & 3) << 11) | (b[i + 4] << 3) | (b[i + 5] >> 5);
      if (adts > 7 && b[i + adts] === 0xff && (b[i + adts + 1] & 0xf6) === 0xf0) return i;
    }
  }
  return 0;
}

const concat = (parts: Uint8Array[], size: number) => {
  const out = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.byteLength;
  }
  return out;
};

/** Something only the learner can fix (a key, a setting): live text turns itself off and says why. */
function turnOff(message: string) {
  stop();
  try {
    localStorage.setItem(PREF, '0');
  } catch {
    // Private mode.
  }
  useLive.setState({ on: false, status: 'error', message });
}

const fail = (id: string, message: string) => {
  blocked.set(id, message);
  if (useLive.getState().mediaId === id) useLive.setState({ status: 'blocked', message });
};

async function listen(id: string, url: string, lang: string) {
  const controller = new AbortController();
  run = controller;
  const mine = () => run === controller && !controller.signal.aborted;
  useLive.setState({ status: 'connecting', message: undefined });
  const blocker = await clipBlocker();
  if (blocker) return void (mine() && turnOff(blocker));
  if (/\.m3u8(\?|$)/i.test(url)) return fail(id, 'This station sends its sound in small pieces (HLS), which can’t be written out here.');
  let res: Response;
  try {
    res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
  } catch {
    if (mine()) {
      run = null;
      fail(id, 'This station doesn’t let web pages read its stream, so it can’t be written out. Most stations do: try another.');
    }
    return;
  }
  if (!res.ok || !res.body) {
    run = null;
    return fail(id, 'This station’s stream couldn’t be read for a transcript.');
  }
  const reader = res.body.getReader();
  controller.signal.addEventListener('abort', () => void reader.cancel().catch(() => undefined));
  if (mine()) useLive.setState({ status: 'listening' });
  let parts: Uint8Array[] = [];
  let size = 0;
  let since = performance.now();
  let partStart = Date.now() - startedAt;
  let busy = false;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done || !mine()) break;
      parts.push(value);
      size += value.byteLength;
      if (performance.now() - since < PART_MS) continue;
      const bytes = concat(parts, size);
      const offset = partStart;
      parts = [];
      size = 0;
      since = performance.now();
      partStart = Date.now() - startedAt;
      // Whisper still busy with the last part (a slow device): this one is let go.
      if (busy) continue;
      busy = true;
      void write(id, bytes.subarray(firstFrame(bytes)), lang, offset, mine).finally(() => (busy = false));
    }
  } catch {
    // Stopped, or the stream ended.
  }
  if (run === controller) {
    run = null;
    // The stream ended by itself while still wanted: pick it up again in a moment.
    if (!controller.signal.aborted) window.setTimeout(sync, 3000);
  }
}

async function write(id: string, bytes: Uint8Array, lang: string, offset: number, mine: () => boolean) {
  if (mine()) useLive.setState({ status: 'writing' });
  try {
    const cues = await transcribeClip(bytes, lang);
    if (!mine() || useLive.getState().mediaId !== id) return;
    const shifted = cues.map((c) => ({ ...c, startMs: c.startMs + offset, endMs: c.endMs + offset, words: c.words?.map((w) => ({ ...w, startMs: w.startMs + offset, endMs: w.endMs + offset })) }));
    useLive.setState((s) => ({ cues: [...s.cues, ...shifted].slice(-KEEP), status: 'listening', message: undefined }));
  } catch (error) {
    if (!mine()) return;
    if (error instanceof TranscribeError && error.kind !== 'network' && error.kind !== 'bad-response') {
      // No key, a refused key, the free allowance used up, or a sound this browser can't read.
      return turnOff(error.kind === 'no-audio' ? 'This station’s sound format can’t be read here for a transcript.' : error.message);
    }
    useLive.setState({ status: 'listening', message: 'A part couldn’t be written out; carrying on.' });
  }
}
