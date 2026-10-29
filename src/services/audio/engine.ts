// The one audio player for the whole app. It lives outside React so playback carries on across
// pages and with the screen locked; components read coarse state from `usePlayer` and subscribe to
// the playhead with `onTime` (called every frame while visible, on `timeupdate` while hidden).
import { create } from 'zustand';
import { cueIndexAt } from '@/core/audio/cues';
import { loopJump, nextLoop } from '@/core/audio/loop';
import type { AbLoop } from '@/core/audio/loop';
import { fadeVolume, sleepAfterSeek, sleepDue, startSleep } from '@/core/audio/sleep';
import type { SleepChoice, SleepTimer } from '@/core/audio/sleep';
import { recordSession } from '@/data/activity';
import { nextPart, setLessonDone } from '@/data/books';
import { db } from '@/data/db';
import { audioBlob, getTranscript, markPlayed, savePlayback } from '@/data/media';
import { getSettings } from '@/data/settings';
import type { Cue, Media } from '@/data/types';
import { setupMediaSession, showNowPlaying, updatePositionState } from './mediaSession';

export interface PlayerState {
  media: Media | null;
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'error';
  error?: string;
  durationMs: number;
  rate: number;
  /** How many times each sentence plays (1 = straight through). */
  repeat: number;
  /** The count Repeat switches on to (Settings › Listening). */
  repeatTimes: number;
  cues: Cue[] | null;
  /** Seek lengths and the pause between sentence repeats, from Settings › Listening. */
  skipBackSec: number;
  skipFwdSec: number;
  gapMs: number;
  /** A live station's song or show, when it shares one. */
  nowPlaying?: string;
  /** The sleep timer, while one is set. */
  sleep: SleepTimer | null;
  /** The part between A and B that plays again and again, while one is set (6-9). */
  abLoop: AbLoop | null;
  /** Pauses at the end of every line of a transcript, to be started again by hand (6-9: sentence by sentence). */
  lineByLine: boolean;
  /** Speed changes keep the pitch (the default), or change it with the speed. */
  keepPitch: boolean;
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
  sleep: null,
  abLoop: null,
  lineByLine: false,
  keepPitch: true,
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
// When a live station was paused: after a while it resumes from what's on now.
let pausedAt = 0;
const listeners = new Set<(ms: number) => void>();

// Sentence repeats
let cueIndex = -1;
let repeatsDone = 0;
let gapTimer = 0;
let pausingForGap = false;
// Line by line: the line that has just paused the player.
let stepIndex = -1;
let stepPaused = false;

// Sleep timer
let sleepTimeout = 0;
// The volume before a timer in minutes began to fade it, put back once it stops.
let volumeBeforeFade: number | null = null;

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
    if (!pausingForGap) paused();
  });
  a.addEventListener('ended', () => {
    const media = get().media;
    // A timer for the end of this chapter or part stops here, before a book's next part starts.
    const sleepNow = sleepDue(get().sleep, { now: Date.now(), positionMs: a.currentTime * 1000, chapters: media?.chapters, ended: true });
    if (sleepNow) setSleep(null);
    stopTicking();
    countListening();
    set({ status: 'paused' });
    // So moving on to the next part doesn't save the end as a place to resume.
    lastPosition = a.currentTime * 1000;
    if (media && media.kind !== 'radio') void savePlayback(media.id, 0, a.playbackRate, true);
    void flushListening();
    if (media?.bookId) void partEnded(media, !sleepNow);
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
    set({ status: 'error', error: failure() });
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

/** Playback stopped (a real pause, not the gap between two repeats): save it and say so. */
function paused() {
  const a = audio;
  if (!a || !get().media) return;
  if (get().media?.kind === 'radio') pausedAt = Date.now();
  stopTicking();
  countListening();
  set({ status: 'paused' });
  void persist();
  void flushListening();
  updatePositionState(a);
}

/** Why playback failed, in words for the item that failed. */
function failure(): string {
  if (get().media?.kind === 'radio') return navigator.onLine ? 'This station isn’t answering. Try another one.' : 'You’re offline.';
  return navigator.onLine ? 'This audio couldn’t be played.' : 'You’re offline and this episode isn’t downloaded.';
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
  checkSleep(ms);
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
  const back = loopJump(get().abLoop, ms);
  if (back !== null && audio && !audio.paused) {
    audio.currentTime = back / 1000;
    return;
  }
  const { cues, repeat } = get();
  if (!cues?.length) return;
  stepByLine(cues, ms);
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

/** Line by line: stops at the end of each line of the transcript. */
function stepByLine(cues: Cue[], ms: number) {
  if (!get().lineByLine || !audio || audio.paused) return;
  const i = cueIndexAt(cues, ms);
  const cue = cues[i];
  if (!cue) return;
  if (i !== stepIndex) {
    stepIndex = i;
    stepPaused = false;
  }
  if (!stepPaused && ms >= cue.endMs - 40) {
    stepPaused = true;
    pause();
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

// ── Sleep timer ──────────────────────────────────────────────────────────────

/** Pauses when the sleep timer is due; a timer in minutes fades the volume out over its last seconds. */
function checkSleep(ms: number) {
  const a = audio;
  const { sleep, media } = get();
  if (!a || !sleep) return;
  const now = Date.now();
  if (sleepDue(sleep, { now, positionMs: ms, chapters: media?.chapters })) {
    pause();
    setSleep(null);
  } else if (sleep.mode === 'minutes' && !a.paused) {
    // iOS ignores the volume, so there it simply stops.
    const level = fadeVolume(sleep.endsAt, now);
    if (level < 1) {
      volumeBeforeFade ??= a.volume;
      a.volume = volumeBeforeFade * level;
    }
  }
}

function setSleep(sleep: SleepTimer | null) {
  window.clearTimeout(sleepTimeout);
  sleepTimeout = 0;
  if (audio && volumeBeforeFade !== null) audio.volume = volumeBeforeFade;
  volumeBeforeFade = null;
  // Frames stop and timeupdate slows down with the screen locked; this stops it on time anyway
  // (a moment late, so it is surely due by the clock).
  if (sleep?.mode === 'minutes') sleepTimeout = window.setTimeout(() => checkSleep(currentMs()), Math.max(0, sleep.endsAt - Date.now()) + 250);
  set({ sleep });
}

/** Stops playback after some minutes, at the end of this chapter, or at the end of this part. */
export function setSleepTimer(choice: SleepChoice): void {
  const { media } = get();
  if (!media) return;
  setSleep(startSleep(choice, { now: Date.now(), positionMs: currentMs(), chapters: media.chapters }));
}

export function cancelSleepTimer(): void {
  setSleep(null);
}

// ── Saving ───────────────────────────────────────────────────────────────────

async function persist() {
  const { media } = get();
  const a = audio;
  if (!media || media.kind === 'radio' || !a || !a.getAttribute('src')) return;
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
  if (media.kind === 'radio') return loadStation(a, media, options.autoplay);
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
  a.preservesPitch = get().keepPitch;
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
    abLoop: null,
    skipBackSec: settings.audio.skipBackSec,
    skipFwdSec: settings.audio.skipFwdSec,
    gapMs: settings.audio.repeatGapMs,
    repeatTimes: Math.max(2, settings.audio.sentenceRepeat),
  });
  // In a book, previous and next on the lock screen go by chapter and part instead of by sentence.
  const steps = media.bookId ? { previous: () => bookStep(-1), next: () => bookStep(1) } : { previous: previousSentence, next: nextSentence };
  setupMediaSession(media, { play, pause, skip, seek, ...steps });
  void markPlayed(media.id);
  if (options.autoplay) await play();
}

/** A live station: no position, speed or transcript; the stream plays as it comes. */
async function loadStation(a: HTMLAudioElement, media: Media, autoplay?: boolean): Promise<void> {
  set({ media, status: 'loading', error: undefined, cues: null, durationMs: 0, rate: 1, nowPlaying: undefined });
  if (!media.remoteUrl) return set({ status: 'error', error: 'This station has no stream.' });
  a.src = media.remoteUrl;
  a.defaultPlaybackRate = 1;
  a.playbackRate = 1;
  lastPosition = 0;
  cueIndex = -1;
  pausedAt = 0;
  sessionStartedAt = Date.now();
  setupMediaSession(media, { play, pause, skip: () => undefined, seek: () => undefined, previous: () => undefined, next: () => undefined });
  if (autoplay) await play();
  else set({ status: 'paused' });
}

/** The song or show a live station says is on (or null when it stopped saying). */
export function setNowPlaying(mediaId: string, text: string | null): void {
  const { media, nowPlaying } = get();
  if (media?.id !== mediaId || (text ?? undefined) === nowPlaying) return;
  set({ nowPlaying: text ?? undefined });
  showNowPlaying(media, text);
}

export async function play(): Promise<void> {
  const a = element();
  const media = get().media;
  if (!media) return;
  // A station paused for more than a moment starts again from what's on now, not the old buffer.
  if (media.kind === 'radio' && media.remoteUrl && (get().status === 'error' || (pausedAt && Date.now() - pausedAt > 4000))) {
    set({ status: 'loading', error: undefined });
    a.src = media.remoteUrl;
  }
  pausedAt = 0;
  try {
    await a.play();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotAllowedError') set({ status: 'paused' });
    else if (!(error instanceof DOMException && error.name === 'AbortError')) set({ status: 'error', error: failure() });
  }
}

export function pause(): void {
  // Between two repeats the element is paused already, so no 'pause' event will come.
  const betweenRepeats = Boolean(gapTimer);
  cancelGap();
  audio?.pause();
  if (betweenRepeats) paused();
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
  const { cues, sleep, media } = get();
  cueIndex = cues ? cueIndexAt(cues, ms) : -1;
  repeatsDone = 0;
  // A line played again by hand pauses at its end again.
  stepIndex = -1;
  stepPaused = false;
  const moved = sleepAfterSeek(sleep, a.currentTime * 1000, media?.chapters);
  if (moved !== sleep) set({ sleep: moved });
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

/** The A–B loop: marks A, then B, then clears. */
export function cycleLoop(): void {
  set({ abLoop: nextLoop(get().abLoop, currentMs()) });
}

export function clearLoop(): void {
  set({ abLoop: null });
}

export function toggleLineByLine(): void {
  stepIndex = -1;
  stepPaused = false;
  set({ lineByLine: !get().lineByLine });
}

export function setKeepPitch(keepPitch: boolean): void {
  const a = element();
  a.preservesPitch = keepPitch;
  set({ keepPitch });
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
  // Opening another item (keepElement) keeps a timer in minutes; a chapter's or a part's ends here.
  if (!options.keepElement || get().sleep?.mode !== 'minutes') setSleep(null);
  stopTicking();
  if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  sourceUrl = null;
  if (a && !options.keepElement) {
    a.removeAttribute('src');
    a.load();
  }
  setupMediaSession(null);
  pausedAt = 0;
  set({ media: null, status: 'idle', cues: null, error: undefined, durationMs: 0, nowPlaying: undefined });
}

// ── Books ────────────────────────────────────────────────────────────────────

/** A book's part played to its end: a course's lesson is done; an audiobook goes on to the next part. */
async function partEnded(media: Media, goOn: boolean): Promise<void> {
  // Read again: the book may have become a course (or an audiobook) while it played.
  const part = (await db.media.get(media.id)) ?? media;
  if (part.bookKind === 'course') return setLessonDone(part.id, true);
  const next = goOn ? await nextPart(part) : null;
  if (next && get().media?.id === media.id) await loadMedia(next, { autoplay: true, startMs: 0 });
}

/** Opens the next (or previous) part of the book that's open, from its start; it plays on if it was playing. */
export async function playPart(step: 1 | -1): Promise<void> {
  const { media, status } = get();
  if (!media?.bookId) return;
  unlockAudio();
  const part = await nextPart(media, step);
  if (part && get().media?.id === media.id) await loadMedia(part, { autoplay: status === 'playing', startMs: 0 });
}

/** Jumps to one of the item's chapters (its index in `media.chapters`). */
export function seekChapter(index: number): void {
  const chapter = get().media?.chapters?.[index];
  if (chapter) seek(chapter.startMs);
}

/** Previous and next in a book (lock screen, headphones): by chapter inside the file, else by part. */
function bookStep(step: 1 | -1) {
  const chapters = get().media?.chapters ?? [];
  const ms = currentMs();
  const i = cueIndexAt(chapters, ms);
  if (step === 1) {
    if (chapters[i + 1]) seekChapter(i + 1);
    else void playPart(1);
    return;
  }
  // Back to the start of this chapter (or part), or to the one before when it only just began.
  const start = i >= 0 ? chapters[i].startMs : 0;
  if (ms - start > 3000) seek(start);
  else if (i > 0) seekChapter(i - 1);
  else void playPart(-1);
}
