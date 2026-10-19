// Gemini's natural voices, with the learner's own key (sent only in the x-goog-api-key header).
// The accent is the voice's: voices are chosen from Gemini's voice library by locale, never
// steered by the prompt. Speech comes back as base64 WAV (24 kHz, mono, 16-bit).
const API = 'https://generativelanguage.googleapis.com/v1beta';

/** Newest first; the next is tried when a model isn't offered to this key. */
export const TTS_MODELS = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts', 'gemini-3.1-flash-tts-preview'];

export interface GeminiVoice {
  id: string;
  name: string;
  locale: string;
  accent?: string;
  gender?: string;
  description?: string;
}

export class SpeechError extends Error {
  constructor(
    message: string,
    readonly kind: 'auth' | 'rate' | 'network' | 'no-model' | 'bad-response',
  ) {
    super(message);
  }
}

async function call(url: string, key: string, init: RequestInit = {}): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { 'x-goog-api-key': key, ...(init.body ? { 'Content-Type': 'application/json' } : {}) }, signal: AbortSignal.timeout(30_000) });
  } catch {
    throw new SpeechError('Couldn’t reach Gemini. Check your connection.', 'network');
  }
  if (res.status === 401 || res.status === 403) throw new SpeechError('Gemini didn’t accept the key.', 'auth');
  if (res.status === 429) throw new SpeechError('Gemini’s free quota for voices is used up for now.', 'rate');
  if (res.status === 404) throw new SpeechError('This Gemini voice model isn’t available to your key.', 'no-model');
  if (!res.ok) throw new SpeechError(`Gemini answered with an error (${res.status}).`, 'bad-response');
  return res.json();
}

type Raw = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

/** A voice-library entry, however the fields are cased. */
export function readVoice(v: Raw, locale: string): GeminiVoice | null {
  const id = str(v.id) ?? str(v.name);
  if (!id) return null;
  return {
    id,
    name: str(v.display_name) ?? str(v.displayName) ?? id.replace(/^voices\//, ''),
    locale: str(v.language_code) ?? str(v.languageCode) ?? locale,
    accent: str(v.accent),
    gender: str(v.gender),
    description: str(v.description),
  };
}

/** The library's voices for one locale (es-ES, pt-BR…), as Gemini lists them. */
export async function listVoices(key: string, locale: string): Promise<GeminiVoice[]> {
  const params = new URLSearchParams({ language_code: locale, page_size: '50' });
  const data = (await call(`${API}/voices?${params}`, key)) as { voices?: Raw[] };
  return (data.voices ?? []).map((v) => readVoice(v, locale)).filter((v): v is GeminiVoice => v !== null);
}

/** The audio in an answer: the last audio part, in any of the shapes Gemini answers with. */
export function findAudio(answer: unknown): string | null {
  let found: string | null = null;
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    const o = node as Raw;
    if (o.type === 'audio' && typeof o.data === 'string') found = o.data;
    const inline = (o.inlineData ?? o.inline_data) as Raw | undefined;
    if (inline && typeof inline.data === 'string' && /audio/.test(String(inline.mimeType ?? inline.mime_type ?? 'audio'))) found = inline.data;
    for (const value of Object.values(o)) if (value && typeof value === 'object') walk(value);
  };
  walk(answer);
  return found;
}

const fromBase64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

/** Raw 16-bit PCM wrapped as a WAV file, for when the answer has no header. */
export function pcmToWav(pcm: Uint8Array, sampleRate = 24_000): Uint8Array {
  const out = new Uint8Array(44 + pcm.length);
  const view = new DataView(out.buffer);
  const text = (at: number, s: string) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, pcm.length, true);
  out.set(pcm, 44);
  return out;
}

let workingModel: string | undefined;

/** The text read aloud by a library voice, as a WAV blob. */
export async function synthesize(key: string, voice: string, text: string): Promise<Blob> {
  const models = workingModel ? [workingModel] : TTS_MODELS;
  let last: unknown;
  for (const model of models) {
    const body = {
      model,
      input: [{ type: 'user_input', content: [{ type: 'text', text }] }],
      response_format: { type: 'audio', mime_type: 'audio/wav' },
      generation_config: { speech_config: [{ voice }] },
    };
    try {
      const answer = await call(`${API}/interactions`, key, { method: 'POST', body: JSON.stringify(body) });
      const b64 = findAudio(answer);
      if (!b64) throw new SpeechError('Gemini sent no audio back.', 'bad-response');
      const bytes = fromBase64(b64);
      const isWav = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
      workingModel = model;
      return new Blob([(isWav ? bytes : pcmToWav(bytes)) as Uint8Array<ArrayBuffer>], { type: 'audio/wav' });
    } catch (e) {
      last = e;
      if (!(e instanceof SpeechError) || e.kind !== 'no-model') throw e;
    }
  }
  throw last instanceof Error ? last : new SpeechError('No Gemini voice model is available to your key.', 'no-model');
}
