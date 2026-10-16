// Speech recognition for speaking exercises (Web Speech API: Chrome, Edge and Safari on iPhone).
// The browser's own recogniser is used; nothing is recorded or sent anywhere by Lingua.

const LOCALES: Record<string, string> = {
  en: 'en-US',
  es: 'es-ES',
  ru: 'ru-RU',
  pt: 'pt-PT',
  fr: 'fr-FR',
  el: 'el-GR',
  de: 'de-DE',
  it: 'it-IT',
  sv: 'sv-SE',
  hu: 'hu-HU',
};

interface RecognitionResultList {
  length: number;
  [i: number]: { isFinal: boolean; length: number; [j: number]: { transcript: string } };
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: RecognitionResultList }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionClass = new () => Recognition;

function recognitionClass(): RecognitionClass | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionClass; webkitSpeechRecognition?: RecognitionClass };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const recognitionSupported = (): boolean => typeof window !== 'undefined' && recognitionClass() !== null;

export class RecognitionError extends Error {
  constructor(
    message: string,
    readonly kind: 'denied' | 'no-speech' | 'unavailable',
  ) {
    super(message);
  }
}

/**
 * Listens for one utterance and resolves with what was heard (the best few alternatives).
 * `onHeard` receives the words as they arrive.
 */
export function listenOnce(lang: string, onHeard?: (text: string) => void): { result: Promise<string[]>; stop: () => void } {
  const Class = recognitionClass();
  if (!Class) return { result: Promise.reject(new RecognitionError('Speech recognition isn’t available in this browser.', 'unavailable')), stop: () => {} };
  const rec = new Class();
  rec.lang = LOCALES[lang] ?? lang;
  rec.interimResults = true;
  rec.maxAlternatives = 4;
  rec.continuous = false;
  let heard: string[] = [];
  const result = new Promise<string[]>((resolve, reject) => {
    rec.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      const options: string[] = [];
      for (let j = 0; j < last.length; j++) options.push(last[j].transcript.trim());
      heard = options;
      onHeard?.(options[0] ?? '');
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') reject(new RecognitionError('Lingua may not use the microphone. Allow it in the browser’s settings.', 'denied'));
      else if (e.error === 'no-speech') reject(new RecognitionError('Nothing was heard. Try again a little louder.', 'no-speech'));
      else if (e.error !== 'aborted') reject(new RecognitionError('Speech recognition stopped unexpectedly.', 'unavailable'));
    };
    rec.onend = () => resolve(heard);
  });
  rec.start();
  return { result, stop: () => rec.stop() };
}
