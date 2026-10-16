// Spoken words and sentences with the device's own voices (Web Speech API): offline on iPhone and
// Windows, no account, no cost. Voice availability differs per device, so features check canSpeak().
import { useEffect, useState } from 'react';

/** Preferred locales per language, best first (Lingua's Portuguese frequency data is Brazilian). */
const LOCALES: Record<string, string[]> = {
  en: ['en-GB', 'en-US', 'en'],
  es: ['es-ES', 'es-MX', 'es-US', 'es'],
  ru: ['ru-RU', 'ru'],
  pt: ['pt-BR', 'pt-PT', 'pt'],
  fr: ['fr-FR', 'fr-CA', 'fr'],
  el: ['el-GR', 'el'],
  de: ['de-DE', 'de-AT', 'de-CH', 'de'],
  it: ['it-IT', 'it'],
  sv: ['sv-SE', 'sv'],
  hu: ['hu-HU', 'hu'],
};

/** Natural-sounding voices first (Edge "Natural", Apple "Enhanced"/"Premium", Google). */
const QUALITY = /natural|neural|premium|enhanced|google/i;

const supported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

/** The device's voices; some browsers load them asynchronously. */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!supported()) return Promise.resolve([]);
  const now = speechSynthesis.getVoices();
  if (now.length) return Promise.resolve(now);
  voicesPromise ??= new Promise((resolve) => {
    const done = () => resolve(speechSynthesis.getVoices());
    speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    window.setTimeout(done, 1500);
  });
  return voicesPromise;
}

export function voicesFor(lang: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const locales = LOCALES[lang] ?? [lang];
  const rank = (v: SpeechSynthesisVoice) => {
    const tag = v.lang.replace('_', '-');
    const i = locales.findIndex((l) => tag === l || tag.toLowerCase().startsWith(`${l.toLowerCase()}-`) || tag.toLowerCase() === l.toLowerCase());
    return i < 0 ? -1 : i;
  };
  return voices
    .filter((v) => rank(v) >= 0)
    .sort((a, b) => rank(a) - rank(b) || Number(QUALITY.test(b.name)) - Number(QUALITY.test(a.name)) || Number(b.localService) - Number(a.localService));
}

export function pickVoice(lang: string, voices: SpeechSynthesisVoice[], preferredUri?: string): SpeechSynthesisVoice | null {
  const list = voicesFor(lang, voices);
  return list.find((v) => v.voiceURI === preferredUri) ?? list[0] ?? null;
}

/** Russian learner texts carry stress marks; voices read the plain spelling better. */
const speakable = (text: string, lang: string) => (lang === 'ru' ? text.normalize('NFD').replace(/[̀́]/g, '').normalize('NFC') : text);

export interface SpeakOptions {
  rate?: number;
  voiceUri?: string;
}

/** Speaks text, interrupting anything already playing. Resolves when it finishes (or fails). */
export async function speak(text: string, lang: string, { rate = 1, voiceUri }: SpeakOptions = {}): Promise<void> {
  if (!supported() || !text.trim()) return;
  const voice = pickVoice(lang, await loadVoices(), voiceUri);
  speechSynthesis.cancel();
  await new Promise<void>((resolve) => {
    const u = new SpeechSynthesisUtterance(speakable(text, lang));
    u.lang = voice?.lang ?? LOCALES[lang]?.[0] ?? lang;
    if (voice) u.voice = voice;
    u.rate = rate;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    speechSynthesis.speak(u);
  });
}

export function stopSpeaking(): void {
  if (supported()) speechSynthesis.cancel();
}

/** Whether this device has a voice for the language (listening exercises need one). */
export function useCanSpeak(lang: string): boolean {
  const [can, setCan] = useState(false);
  useEffect(() => {
    let alive = true;
    void loadVoices().then((voices) => alive && setCan(voicesFor(lang, voices).length > 0));
    return () => {
      alive = false;
    };
  }, [lang]);
  return can;
}

export function useVoices(lang: string): SpeechSynthesisVoice[] {
  const [list, setList] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    let alive = true;
    void loadVoices().then((voices) => alive && setList(voicesFor(lang, voices)));
    return () => {
      alive = false;
    };
  }, [lang]);
  return list;
}
