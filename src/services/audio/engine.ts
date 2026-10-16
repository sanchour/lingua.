// The one audio player for the whole app. It lives outside React so playback carries on across
// pages and with the screen locked; components read coarse state from `usePlayer` and subscribe to
// the playhead with `onTime` (called every frame while visible, on `timeupdate` while hidden).
import { create } from 'zustand';
import { cueIndexAt } from '@/core/audio/cues';
import { recordSession } from '@/data/activity';
import { db } from '@/data/db';
import { audioBlob, getTranscript, markPlayed, savePlayback } from '@/data/media';
import { getSettings } from '@/data/settings';
import type { Cue, Media } from '@/data/types';
import { setupMediaSession, updatePositionState } from './mediaSession';

export interface PlayerState {
  media: Media | null;
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'error';
  error?: string;
  durationMs: number;
  rate: number;
  /** How many times each sentence plays (1 = straight through). */
  repeat: number;
  /** The count Repeat switches on to (Ordo › Listening). */
  repeatTimes: number;
  cues: Cue[] | null;
  /** Seek lengths and the pause between sentence repeats, from Ordo › Listening. */
  skipBackSec: number;
  skipFwdSec: number;
  gapMs: number;
}

export const usePlayer = create<PlayerState>(() => ({
  media: null,
  status: 'idle',
  durationMs: 0,
  rate: 1,
  repeat: 1,
  repeatTimes: 2,
  cues: null,
  skipBackSec: 10,
  skipFwdSec: 30,
  gapMs: 1200,
}));

const get = usePlayer.getState;
const set = usePlayer.setState;

let audio: HTMLAudioElement | null = null;
let sourceUrl: string | null = null;
let unlocked = false;
let unlockUrl = '';
let frame = 0;
let lastSaved = 0;
let lastPosition = 0;
const listeners = new Set<(ms: number) => void>();

// Sentence repeats
let cueIndex = -1;
let repeatsDone = 0;
let gapTimer = 0;
let pausingForGap = false;

// Listening time (for statistics and the daily goal)
let playingSince = 0;
let listenedMs = 0;
let sessionStartedAt = Date.now();

/** A few samples of silence, played inside the first tap so iOS lets this element play later on. */
function silentWav(): Blob {
  const samples = 800;
  const bytes = new Uint8Array(44 + samples).fill(128, 44);
  const view = new DataView(bytes.buffer);
  const text = (at: number, s: string) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples, true);
  text(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true);
  view.setUint32(28, 8000, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  text(36, 'data');
  view.setUint32(40, samples, true);
  return new Blob([bytes], { type: 'audio/wav' });
}

function element(): HTMLAudioElement {
  if (audio) return audio;
  const a = document.createElement('audio');
  a.preload = 'auto';
  a.hidden = true;
  document.body.append(a);
  a.addEventListener('playing', () => {
    playingSince = performance.now();
    set({ status: 'playing', error: undefined });
    startTicking();
    updatePositionState(a);
  });
  a.addEventListener('pause', () => {
    if (pausingForGap || !get().media) return;
    stopTicking();
    countListening();
    set({ status: 'paused' });
    void persist();
    void flushListening();
    updatePositionState(a);
  });
  a.addEventListener('ended', () => {
    const media = get().media;
    stopTicking();
    countListening();
    set({ status: 'paused' });
    if (media) void savePlayback(media.id, 0, a.playbackRate, true);
    void flushListening();
  });
  a.addEventListener('durationchange', () => {
    if (Number.isFinite(a.duration)) set({ durationMs: Math.round(a.duration * 1000) });
  });
  a.addEventListener('ratechange', () => {
    set({ rate: a.playbackRate });
    updatePositionState(a);
  });
  // While hidden (screen locked) frames stop; timeupdate keeps repeats and saving going.
  a.addEventListener('timeupdate', () => {
    if (!frame) tick();
  });
  a.addEventListener('error', () => {
    if (!get().media || !a.getAttribute('src') || a.getAttribute('src') === unlockUrl) return;
    stopTicking();
    set({ status: 'error', error: navigator.onLine ? 'This audio couldn’t be played.' : 'You’re offline and this episode isn’t downloaded.' });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      void persist();
      void flushListening();
    } else if (!a.paused) startTicking();
  });
  window.addEventListener('pagehide', () => {
    void persist();
    void flushListening();
  });
  audio = a;
  return a;
}

/** Call first thing in a tap handler (before any await): iOS only allows playback that a tap started. */
export function unlockAudio(): void {
  const a = element();
  if (unlocked) return;
  unlocked = true;
  if (a.getAttribute('src')) {
    void a.play().catch(() => undefined);
    return;
  }
  unlockUrl = URL.createObjectURL(silentWav());
  a.src = unlockUrl;
  void a
    .play()
    .then(() => {
      // Only stop the silence; a real item may already have taken over.
      if (a.getAttribute('src') === unlockUrl) a.pause();
    })
    .catch(() => undefined);
}

// ── Ticking ──────────────────────────────────────────────────────────────────

export const currentMs = (): number => (audio ? audio.currentTime * 1000 : 0);

function tick() {
  const a = audio;
  if (!a) return;
  const ms = a.currentTime * 1000;
  handleRepeat(ms);
  for (const fn of listeners) fn(ms);
  const now = performance.now();
  if (!a.paused && now - lastSaved > 5000) {
    lastSaved = now;
    void persist();
  }
  // Long listens are recorded in chunks, so a killed app loses at most a couple of minutes.
  if (!a.paused && now - playingSince > 120_000) {
    countListening();
    playingSince = now;
    void flushListening();
  }
}

function loop() {
  tick();
  frame = requestAnimationFrame(loop);
}

function startTicking() {
  if (frame || document.visibilityState !== 'visible') return;
  frame = requestAnimationFrame(loop);
}

function stopTicking() {
  cancelAnimationFrame(frame);
  frame = 0;
  tick();
}

/** Follows the playhead. Returns an unsubscribe function. */
export function onTime(fn: (ms: number) => void): () => void {
  listeners.add(fn);
  fn(currentMs());
  return () => listeners.delete(fn);
}

// ── Sentence repeats ─────────────────────────────────────────────────────────

function handleRepeat(ms: number) {
  const { cues, repeat } = get();
  if (!cues?.length) return;
  const i = cueIndexAt(cues, ms);
  if (i !== cueIndex) {
    // Ran into the next sentence while the last one still has repeats to go: go back.
    if (repeat > 1 && cueIndex >= 0 && i === cueIndex + 1 && repeatsDone < repeat - 1 && !gapTimer && !audio?.paused) {
      loopBack(cues[cueIndex]);
      return;
    }
    cueIndex = i;
    repeatsDone = 0;
    return;
  }
  // A sentence followed by silence: repeat at its own end instead of waiting for the next one.
  const cue = cues[i];
  if (repeat > 1 && cue && repeatsDone < repeat - 1 && !gapTimer && !audio?.paused && ms >= cue.endMs - 40 && cue.endMs < (cues[i + 1]?.startMs ?? Infinity)) {
    loopBack(cue);
  }
}

function loopBack(cue: Cue) {
  const a = audio;
  if (!a) return;
  repeatsDone++;
  const { gapMs } = get();
  // With the screen locked a pause could let the system suspend us; jump back without one.
  if (document.visibilityState !== 'visible' || gapMs <= 0) {
    a.currentTime = cue.startMs / 1000;
    return;
  }
  pausingForGap = true;
  a.pause();
  gapTimer = window.setTimeout(() => {
    gapTimer = 0;
    a.currentTime = cue.startMs / 1000;
    void a.play().finally(() => (pausingForGap = false));
  }, gapMs);
}

function cancelGap() {
  window.clearTimeout(gapTimer);
  gapTimer = 0;
  pausingForGap = false;
}

// ── Saving ───────────────────────────────────────────────────────────────────

async function persist() {
  const { media } = get();
  const a = audio;
  if (!media || !a || !a.getAttribute('src')) return;
  const position = a.currentTime * 1000;
  if (Math.abs(position - lastPosition) < 500) return;
  lastPosition = position;
  await savePlayback(media.id, position, a.playbackRate, false);
}

function countListening() {
  if (playingSince) listenedMs += performance.now() - playingSince;
  playingSince = 0;
}

async function flushListening() {
  const { media } = get();
  if (!media || listenedMs < 5000) return;
  const activeMs = Math.round(listenedMs);
  listenedMs = 0;
  const startedAt = sessionStartedAt;
  sessionStartedAt = Date.now();
  await recordSession({ lang: media.lang, type: 'listen', refId: media.id, startedAt, endedAt: Date.now(), activeMs });
}

// ── Controls ─────────────────────────────────────────────────────────────────

/** Opens an item (resuming where it was left). Call `unlockAudio()` in the tap before awaiting. */
export async function loadMedia(media: Media, options: { autoplay?: boolean; startMs?: number } = {}): Promise<void> {
  if (media.kind === 'spotify') return;
  unlockAudio();
  const a = element();
  if (get().media?.id === media.id && a.getAttribute('src') && a.getAttribute('src') !== unlockUrl && get().status !== 'error') {
    set({ media });
    if (options.startMs !== undefined) seek(options.startMs);
    if (options.autoplay) await play();
    return;
  }
  await closePlayer({ keepElement: true });
  set({ media, status: 'loading', error: undefined, cues: null, durationMs: media.durationMs ?? 0 });

  const [blob, progress, transcript, settings] = await Promise.all([audioBlob(media), db.playbackProgress.get(media.id), getTranscript(media.id), getSettings()]);
  if (get().media?.id !== media.id) return; // another item was opened meanwhile
  if (blob) {
    sourceUrl = URL.createObjectURL(blob);
    a.src = sourceUrl;
  } else if (media.remoteUrl) {
    a.src = media.remoteUrl;
  } else {
    set({ status: 'error', error: 'This item has no audio.' });
    return;
  }
  const rate = progress?.rate ?? settings.audio.rate;
  a.defaultPlaybackRate = rate;
  a.playbackRate = rate;
  const start = options.startMs ?? (progress && !progress.completed ? progress.positionMs : 0);
  if (start > 0) a.currentTime = start / 1000;
  lastPosition = start;
  cueIndex = -1;
  repeatsDone = 0;
  sessionStartedAt = Date.now();
  set({
    status: 'paused',
    rate,
    cues: transcript?.cues ?? null,
    skipBackSec: settings.audio.skipBackSec,
    skipFwdSec: settings.audio.skipFwdSec,
    gapMs: settings.audio.repeatGapMs,
    repeatTimes: Math.max(2, settings.audio.sentenceRepeat),
  });
  setupMediaSession(media, { play, pause, skip, seek, previous: previousSentence, next: nextSentence });
  void markPlayed(media.id);
  if (options.autoplay) await play();
}

export async function play(): Promise<void> {
  const a = element();
  if (!get().media) return;
  try {
    await a.play();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotAllowedError') set({ status: 'paused' });
    else set({ status: 'error', error: navigator.onLine ? 'This audio couldn’t be played.' : 'You’re offline and this episode isn’t downloaded.' });
  }
}

export function pause(): void {
  cancelGap();
  audio?.pause();
}

export function toggle(): void {
  // During the pause between sentence repeats the player counts as playing.
  if (audio && (!audio.paused || pausingForGap)) return pause();
  unlockAudio();
  void play();
}

export function seek(ms: number): void {
  const a = audio;
  if (!a) return;
  cancelGap();
  const max = Number.isFinite(a.duration) ? a.duration * 1000 : Infinity;
  a.currentTime = Math.max(0, Math.min(ms, max)) / 1000;
  const cues = get().cues;
  cueIndex = cues ? cueIndexAt(cues, ms) : -1;
  repeatsDone = 0;
  for (const fn of listeners) fn(a.currentTime * 1000);
  updatePositionState(a);
}

export function skip(seconds: number): void {
  seek(currentMs() + seconds * 1000);
}

export function setRate(rate: number): void {
  const a = element();
  a.playbackRate = rate;
  a.defaultPlaybackRate = rate;
  set({ rate });
  void persist();
}

export function setRepeat(repeat: number): void {
  repeatsDone = 0;
  set({ repeat });
}

/** Repeat on (each sentence plays the chosen number of times) or off. */
export function toggleRepeat(): void {
  const { repeat, repeatTimes } = get();
  setRepeat(repeat > 1 ? 1 : repeatTimes);
}

/** Uses a new or edited transcript right away (sentence controls, repeats, lock screen). */
export function setCues(mediaId: string, cues: Cue[] | null): void {
  if (get().media?.id !== mediaId) return;
  set({ cues });
  cueIndex = cues ? cueIndexAt(cues, currentMs()) : -1;
}

/** Back to the start of this sentence, or to the previous one if it only just began. */
export function previousSentence(): void {
  const { cues, skipBackSec } = get();
  if (!cues?.length) return skip(-skipBackSec);
  const ms = currentMs();
  const i = cueIndexAt(cues, ms);
  const target = i >= 0 && ms - cues[i].startMs > 1500 ? cues[i].startMs : cues[Math.max(0, i - 1)].startMs;
  seek(target);
}

export function nextSentence(): void {
  const { cues, skipFwdSec } = get();
  if (!cues?.length) return skip(skipFwdSec);
  const next = cues[cueIndexAt(cues, currentMs()) + 1];
  if (next) seek(next.startMs);
}

export function replaySentence(): void {
  const { cues } = get();
  if (!cues?.length) return skip(-5);
  const i = cueIndexAt(cues, currentMs());
  seek(cues[Math.max(0, i)].startMs);
  if (audio?.paused) void play();
}

/** Stops and forgets the current item (position and listening time are saved first). */
export async function closePlayer(options: { keepElement?: boolean } = {}): Promise<void> {
  const a = audio;
  cancelGap();
  if (a && get().media) {
    countListening();
    await persist();
    await flushListening();
    a.pause();
  }
  stopTicking();
  if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  sourceUrl = null;
  if (a && !options.keepElement) {
    a.removeAttribute('src');
    a.load();
  }
  setupMediaSession(null);
  set({ media: null, status: 'idle', cues: null, error: undefined, durationMs: 0 });
}
