// Which voice speaks a language on this device, and speaking with it. Gemini's library voice for
// the flag's locale when there's a Gemini key; else a good device voice for exactly that locale;
// else none (and no speaker button). What Gemini says is kept, so each text is generated once.
import { sameLocale, voiceLocale } from '@/core/lang/voiceLocale';
import { db } from '@/data/db';
import { getAiSettings } from '@/data/plan';
import { listVoices, pcmToWav, SpeechError, synthesize } from './gemini';

export type Speaker =
  | { kind: 'gemini'; locale: string; voice: { id: string; name: string } }
  | { kind: 'device'; locale: string; voice: SpeechSynthesisVoice }
  | { kind: 'none'; locale: string | null; why: 'off' | 'no-locale' | 'no-voice' };

type VoiceLike = Pick<SpeechSynthesisVoice, 'name' | 'voiceURI' | 'lang'>;

/** Device voices worth hearing: the natural, neural, premium and enhanced ones (and Google's, Siri's). */
const GOOD = /natural|neural|premium|enhanced|online|siri|google/i;

/** The best device voice for exactly this locale, or none: a robotic voice is worse than none. */
export function pickDeviceVoice<V extends VoiceLike>(voices: readonly V[], locale: string): V | undefined {
  const label = (v: V) => `${v.name} ${v.voiceURI}`;
  const rank = (v: V) => (/premium|natural|neural/i.test(label(v)) ? 0 : /enhanced|siri|online/i.test(label(v)) ? 1 : 2);
  return voices.filter((v) => sameLocale(v.lang, locale) && GOOD.test(label(v))).sort((a, b) => rank(a) - rank(b))[0];
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
  const device = pickDeviceVoice(await deviceVoices(), locale);
  return device ? { kind: 'device', locale, voice: device } : { kind: 'none', locale, why: 'no-voice' };
}

// One audio element, unlocked by the tap that asks for speech: iPhones only let an element play
// after a tap, and Gemini's answer arrives a moment later.
let player: HTMLAudioElement | null = null;
let playing: { url?: string; done: () => void } | null = null;
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
      if (playing?.url === url) stopSpeaking();
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
  if (speaker.kind === 'none') throw new SpeechError('There’s no natural voice for this language on this device.', 'no-model');
  if (speaker.kind === 'device') {
    return new Promise((resolve) => {
      const say = new SpeechSynthesisUtterance(clean);
      say.voice = speaker.voice;
      say.lang = speaker.locale;
      say.rate = 0.95;
      playing = { done: resolve };
      say.onstart = () => opts.onStart?.();
      say.onend = say.onerror = () => {
        if (playing?.done === resolve) playing = null;
        resolve();
      };
      speechSynthesis.speak(say);
    });
  }
  return sayWith(speaker.voice.id, lang, clean, opts.onStart);
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
