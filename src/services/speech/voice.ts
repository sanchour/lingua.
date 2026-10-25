// Which voice speaks a language on this device, and speaking with it. Gemini's library voice for
// the flag's locale when there's a Gemini key; else, for a common word, a real person saying it
// (recordings.ts), and for the rest a natural device voice (Edge's online ones, Apple's premium),
// else a Piper voice downloaded in Settings (piper.ts), else the best device voice for exactly that
// locale (the robotic ones last, never another language's); else none (and no speaker button).
// What Gemini and Piper say and the recordings are kept, so each is made or fetched once.
import { sameLocale, voiceLocale } from '@/core/lang/voiceLocale';
import { db } from '@/data/db';
import { getAiSettings } from '@/data/plan';
import { listVoices, pcmToWav, SpeechError, synthesize } from './gemini';
import { installedPiperFor, piperSpeech, warmPiper } from './piper';
import { findRecording, recordingBlob } from './recordings';
import { speechParts } from '@/core/audio/piper';
import type { PiperVoice } from '@/core/audio/piper';

export type Speaker =
  | { kind: 'gemini'; locale: string; voice: { id: string; name: string } }
  | { kind: 'device'; locale: string; voice: SpeechSynthesisVoice; quality: VoiceQuality }
  | { kind: 'piper'; locale: string; voice: PiperVoice }
  | { kind: 'none'; locale: string | null; why: 'off' | 'no-locale' | 'no-voice' };

type VoiceLike = Pick<SpeechSynthesisVoice, 'name' | 'voiceURI' | 'lang'>;

/** natural: Edge's online natural voices, Apple's premium ones; good: Google's, enhanced, Siri's; robotic: the old system voices. */
export type VoiceQuality = 'natural' | 'good' | 'robotic';

/** How good a device voice sounds, 0 best: Edge's "Online (Natural)" voices, then premium, natural and neural ones, Google's, enhanced and Siri's, the old robotic ones last. */
export function voiceRank(v: VoiceLike): number {
  const label = `${v.name} ${v.voiceURI}`;
  if (/online/i.test(label) && /natural/i.test(label)) return 0;
  if (/premium|natural|neural/i.test(label)) return 1;
  if (/google/i.test(label)) return 2;
  if (/enhanced|siri|online/i.test(label)) return 3;
  return 4;
}

export const voiceQuality = (v: VoiceLike): VoiceQuality => (voiceRank(v) <= 1 ? 'natural' : voiceRank(v) <= 3 ? 'good' : 'robotic');

/** The device's voices for exactly this locale, the best first. */
export function voicesForLocale<V extends VoiceLike>(voices: readonly V[], locale: string): V[] {
  return voices.filter((v) => sameLocale(v.lang, locale)).sort((a, b) => voiceRank(a) - voiceRank(b));
}

/** The voice the learner chose for this locale if the device still has it, else the best one; never another locale's. */
export function pickDeviceVoice<V extends VoiceLike>(voices: readonly V[], locale: string, chosen?: string): V | undefined {
  const own = voicesForLocale(voices, locale);
  return own.find((v) => v.voiceURI === chosen) ?? own[0];
}

/** The device's voices for a locale, the best first (for Settings). */
export async function listDeviceVoices(locale: string): Promise<SpeechSynthesisVoice[]> {
  return voicesForLocale(await deviceVoices(), locale);
}

async function deviceVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof speechSynthesis === 'undefined') return [];
  const now = speechSynthesis.getVoices();
  if (now.length) return now;
  // Chrome fills the list a moment after the page loads.
  return new Promise((resolve) => {
    const done = () => resolve(speechSynthesis.getVoices());
    speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 1500);
  });
}

// The library voice picked for a locale when the learner hasn't chosen one, so it needn't be asked
// again (and works offline for what was already spoken). Per device, like the key.
const remembered = (locale: string) => `lingua.voice.${locale}`;
function recall(locale: string): { id: string; name: string } | undefined {
  try {
    const raw = localStorage.getItem(remembered(locale));
    return raw ? (JSON.parse(raw) as { id: string; name: string }) : undefined;
  } catch {
    return undefined;
  }
}
function remember(locale: string, voice: { id: string; name: string }) {
  try {
    localStorage.setItem(remembered(locale), JSON.stringify(voice));
  } catch {
    // Private mode: asked again next time.
  }
}

const speakers = new Map<string, Promise<Speaker>>();

/** Forget what was worked out (the key, the flag or the chosen voice changed). */
export function resetSpeakers() {
  speakers.clear();
}

/** Who speaks `lang` (with the learner's flag) on this device. */
export function speakerFor(lang: string, flag?: string): Promise<Speaker> {
  const key = `${lang}|${flag ?? ''}`;
  let found = speakers.get(key);
  if (!found) {
    found = resolve(lang, flag);
    speakers.set(key, found);
  }
  return found;
}

async function resolve(lang: string, flag?: string): Promise<Speaker> {
  const locale = voiceLocale(lang, flag);
  if (!locale) return { kind: 'none', locale: null, why: 'no-locale' };
  const { voice, apiKeys } = await getAiSettings();
  if (voice.off) return { kind: 'none', locale, why: 'off' };
  if (apiKeys.gemini.trim()) {
    const chosen = voice.chosen[locale] ?? recall(locale);
    if (chosen) return { kind: 'gemini', locale, voice: chosen };
    try {
      const first = (await listVoices(apiKeys.gemini.trim(), locale))[0];
      if (first) {
        remember(locale, { id: first.id, name: first.name });
        return { kind: 'gemini', locale, voice: { id: first.id, name: first.name } };
      }
    } catch {
      // Offline or the key was refused: the device's voice, if it has a good one.
    }
  }
  const chosen = voice.device?.[locale];
  const choseDevice = Boolean(chosen && !chosen.startsWith(PIPER));
  const device = pickDeviceVoice(await deviceVoices(), locale, chosen);
  const piper = await installedPiperFor(locale, chosen?.startsWith(PIPER) ? chosen.slice(PIPER.length) : undefined).catch(() => undefined);
  // Piper is slower to start than Edge's or Apple's natural voices, so those stay first unless chosen.
  if (piper && (chosen?.startsWith(PIPER) || !device || (!choseDevice && voiceQuality(device) !== 'natural'))) {
    warmPiper(piper.id);
    return { kind: 'piper', locale, voice: piper };
  }
  return device ? { kind: 'device', locale, voice: device, quality: voiceQuality(device) } : { kind: 'none', locale, why: 'no-voice' };
}

// One audio element, unlocked by the tap that asks for speech: iPhones only let an element play
// after a tap, and Gemini's answer arrives a moment later.
let player: HTMLAudioElement | null = null;
let playing: { url?: string; done: () => void } | null = null;
/** Counts the times speech was asked or stopped, so a voice saying a text in parts knows to stop. */
let turn = 0;

/** `voice.device[locale]` for a Piper voice: "piper:fr_FR-siwis-medium". */
export const PIPER = 'piper:';
const SILENCE = typeof URL !== 'undefined' && typeof Blob !== 'undefined' ? URL.createObjectURL(new Blob([pcmToWav(new Uint8Array(480)) as Uint8Array<ArrayBuffer>], { type: 'audio/wav' })) : '';

function unlock(): HTMLAudioElement {
  if (!player) {
    player = new Audio();
    player.src = SILENCE;
    void player.play().catch(() => undefined);
  }
  return player;
}

/** Stops whatever is being said. */
export function stopSpeaking() {
  turn++;
  endPlaying();
}

function endPlaying() {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  if (player && playing) player.pause();
  const was = playing;
  playing = null;
  if (was?.url) URL.revokeObjectURL(was.url);
  was?.done();
}

function play(blob: Blob, onStart?: () => void): Promise<void> {
  const audio = unlock();
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    playing = { url, done: resolve };
    audio.onended = () => {
      if (playing?.url === url) endPlaying();
    };
    audio.onerror = () => {
      stopSpeaking();
      reject(new SpeechError('This audio couldn’t be played.', 'bad-response'));
    };
    audio.src = url;
    audio
      .play()
      .then(() => onStart?.())
      .catch((e: unknown) => {
        stopSpeaking();
        reject(e instanceof Error ? e : new Error('The audio couldn’t start.'));
      });
  });
}

/** Says `text` in `lang`. Resolves when it has been said (or was stopped). */
export async function speak(lang: string, text: string, opts: { flag?: string; onStart?: () => void } = {}): Promise<void> {
  // Before anything is awaited: this tap is what lets the phone play the answer.
  if (typeof Audio !== 'undefined') unlock();
  stopSpeaking();
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return;
  const speaker = await speakerFor(lang, opts.flag);
  if (speaker.kind !== 'gemini' && !(speaker.kind === 'none' && speaker.why === 'off')) {
    const found = await findRecording(lang, clean, speaker.locale);
    if (found) {
      try {
        return await play(await recordingBlob(lang, clean, found), opts.onStart);
      } catch {
        // Offline, or Commons didn't answer: the voice says it instead.
      }
    }
  }
  if (speaker.kind === 'none') throw new SpeechError('There’s no natural voice for this language on this device.', 'no-model');
  if (speaker.kind === 'device') return sayOnDevice(speaker.voice, clean, opts.onStart);
  if (speaker.kind === 'piper') return sayWithPiper(speaker.voice.id, lang, clean, opts.onStart);
  return sayWith(speaker.voice.id, lang, clean, opts.onStart);
}

/** Says `text` with a Piper voice, part by part: each part is made while the one before it plays. */
export async function sayWithPiper(voice: string, lang: string, text: string, onStart?: () => void): Promise<void> {
  if (typeof Audio !== 'undefined') unlock();
  stopSpeaking();
  const mine = turn;
  const parts = speechParts(text);
  let next: Promise<Blob> | null = parts.length ? piperSpeech(voice, lang, parts[0]) : null;
  for (let i = 0; next; i++) {
    const blob = await next;
    if (turn !== mine) return;
    next = i + 1 < parts.length ? piperSpeech(voice, lang, parts[i + 1]) : null;
    await play(blob, i === 0 ? onStart : undefined);
    if (turn !== mine) return;
  }
}

/** Says `text` with one of the device's voices (also to try one before choosing it). */
export function sayOnDevice(voice: SpeechSynthesisVoice, text: string, onStart?: () => void): Promise<void> {
  stopSpeaking();
  return new Promise((resolve) => {
    const say = new SpeechSynthesisUtterance(text);
    say.voice = voice;
    say.lang = voice.lang.replace('_', '-');
    say.rate = 0.95;
    playing = { done: resolve };
    say.onstart = () => onStart?.();
    say.onend = say.onerror = () => {
      if (playing?.done === resolve) playing = null;
      resolve();
    };
    speechSynthesis.speak(say);
  });
}

/** Says `text` with one Gemini library voice (also to try a voice before choosing it). */
export async function sayWith(voice: string, lang: string, text: string, onStart?: () => void): Promise<void> {
  if (typeof Audio !== 'undefined') unlock();
  stopSpeaking();
  const clean = text.replace(/\s+/g, ' ').trim();
  const id = `${voice}|${clean}`;
  let row = await db.speech.get(id);
  if (!row) {
    const { apiKeys } = await getAiSettings();
    const blob = await synthesize(apiKeys.gemini.trim(), voice, clean);
    row = { id, lang, text: clean, voice, blob, createdAt: Date.now() };
    await db.speech.put(row);
  }
  return play(row.blob, onStart);
}
