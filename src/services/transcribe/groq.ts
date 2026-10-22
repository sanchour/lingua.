// Transcripts with word timings from Whisper on Groq, with the learner's own key (sent only in
// the request header), or from Whisper on this device (./device). Files over Groq's upload limit
// are split into parts at MP3 frame boundaries, or decoded and sent as WAV parts (videos and
// other formats); streamed podcast episodes are fetched by Groq itself from their address.
import { isMp3, splitMp3 } from '@/core/audio/mp3';
import { cuesFromWhisper } from '@/core/parsers/whisper';
import type { WhisperResult } from '@/core/parsers/whisper';
import { audioBlob } from '@/data/media';
import { aiBlock, AI_NEEDS_MAX, getAiSettings } from '@/data/plan';
import { getSettings } from '@/data/settings';
import type { Cue, Media } from '@/data/types';
import { downloadBlob } from '@/services/sonus/net';
import { decodeToMono16k, splitAtPauses, wav } from './audio';
import { DEVICE_MODELS, whisperOnDevice } from './device';
import type { DeviceModel, DeviceProgress } from './device';

const ENDPOINT = 'https://api.groq.com/openai/v1/audio/transcriptions';
/** Groq's free tier accepts uploads up to 25 MB; parts stay safely under it. */
const UPLOAD_LIMIT = 24 * 1024 * 1024;
const PART_SIZE = 20 * 1024 * 1024;

export class TranscribeError extends Error {
  constructor(
    message: string,
    readonly kind: 'no-key' | 'no-plan' | 'auth' | 'rate' | 'too-large' | 'network' | 'bad-response' | 'no-audio',
  ) {
    super(message);
  }
}

async function request(key: string, body: FormData): Promise<WhisperResult> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body, signal: AbortSignal.timeout(300_000) });
  } catch {
    throw new TranscribeError('Couldn’t reach Groq. Check your connection.', 'network');
  }
  if (res.status === 401 || res.status === 403) throw new TranscribeError('Groq didn’t accept the API key (Settings › AI).', 'auth');
  if (res.status === 413) throw new TranscribeError('That audio is larger than Groq accepts.', 'too-large');
  if (res.status === 429) throw new TranscribeError('Groq’s free transcription allowance is used up for now. Try again later.', 'rate');
  if (!res.ok) {
    const detail = ((await res.json().catch(() => null)) as { error?: { message?: string } } | null)?.error?.message;
    throw new TranscribeError(detail ? `Groq: ${detail}` : `Groq answered with an error (${res.status}).`, 'bad-response');
  }
  return (await res.json()) as WhisperResult;
}

function form(model: string, lang: string, audio: { file: Blob; name: string } | { url: string }): FormData {
  const body = new FormData();
  if ('url' in audio) body.append('url', audio.url);
  else body.append('file', audio.file, audio.name);
  body.append('model', model);
  body.append('language', lang);
  body.append('response_format', 'verbose_json');
  body.append('timestamp_granularities[]', 'word');
  body.append('timestamp_granularities[]', 'segment');
  body.append('temperature', '0');
  return body;
}

export type TranscribeProgress = (fraction: number, note?: string) => void;

async function decode(blob: Blob): Promise<Float32Array> {
  try {
    return await decodeToMono16k(blob);
  } catch {
    throw new TranscribeError('The browser couldn’t read the sound in this file. Try an MP3, M4A or MP4.', 'no-audio');
  }
}

/** Sends decoded sound to Groq as WAV parts of up to ten minutes (each well under the upload limit). */
async function groqSamples(key: string, model: string, lang: string, samples: Float32Array, onProgress?: TranscribeProgress): Promise<Cue[]> {
  const parts = splitAtPauses(samples, 600);
  const cues: Cue[] = [];
  for (let i = 0; i < parts.length; i++) {
    onProgress?.(0.1 + (0.9 * i) / parts.length);
    const result = await request(key, form(model, lang, { file: wav(parts[i].samples), name: `part-${i + 1}.wav` }));
    cues.push(...cuesFromWhisper(result, lang, parts[i].offsetMs));
  }
  onProgress?.(1);
  return cues;
}

/** Whisper on this device, for any item with stored sound (or one that can be downloaded). */
async function onDevice(media: Media, model: DeviceModel, onProgress?: TranscribeProgress): Promise<Cue[]> {
  let blob = await audioBlob(media);
  if (!blob && media.remoteUrl) {
    onProgress?.(0.02, 'Fetching the audio…');
    try {
      blob = await downloadBlob(media.remoteUrl);
    } catch {
      throw new TranscribeError('Save this item on the device first (⋯ › Download), then make the transcript.', 'no-audio');
    }
  }
  if (!blob) throw new TranscribeError('This item has no audio to transcribe.', 'no-audio');
  onProgress?.(0.04, 'Reading the sound…');
  const samples = await decode(blob);
  const size = DEVICE_MODELS[model].size;
  const result = await whisperOnDevice(samples, media.lang, model, (p) => {
    if (p.phase === 'model') onProgress?.(0.05 + 0.15 * p.pct, `Getting the speech model ready (${size}, only once)…`);
    else onProgress?.(0.2 + 0.8 * p.pct, 'Listening on this device…');
  });
  return cuesFromWhisper(result, media.lang);
}

/**
 * Transcribes an item with the transcriber chosen in Settings › Listening: Whisper on Groq (its
 * downloaded audio, otherwise its web address) or Whisper on this device. `onProgress` gets 0–1.
 */
export async function transcribe(media: Media, onProgress?: TranscribeProgress): Promise<{ cues: Cue[]; source: 'whisper-groq' | 'whisper-local' }> {
  const settings = await getSettings();
  const { apiKeys, audio } = settings;
  if (audio.transcriber === 'device') return { cues: await onDevice(media, audio.deviceModel, onProgress), source: 'whisper-local' };
  if (aiBlock(settings, 'groq') === 'max') throw new TranscribeError(NO_PLAN, 'no-plan');
  return { cues: await withGroq(media, apiKeys.groq, audio.whisperModel, onProgress), source: 'whisper-groq' };
}

async function withGroq(media: Media, key: string | undefined, model: string, onProgress?: TranscribeProgress): Promise<Cue[]> {
  if (!key) throw new TranscribeError('Add a free Groq key in Settings › AI to make transcripts, or choose Whisper on this device in Settings › Listening.', 'no-key');
  const blob = await audioBlob(media);

  // Videos: only the sound is sent, as compact WAV parts.
  if (blob && media.kind === 'video') {
    onProgress?.(0.04, 'Reading the sound…');
    return groqSamples(key, model, media.lang, await decode(blob), onProgress);
  }

  if (!blob) {
    if (!media.remoteUrl) throw new TranscribeError('This item has no audio to transcribe.', 'no-audio');
    onProgress?.(0.05);
    const result = await request(key, form(model, media.lang, { url: media.remoteUrl }));
    onProgress?.(1);
    return cuesFromWhisper(result, media.lang);
  }

  const ext = (media.mime ?? blob.type).includes('mp4') ? 'm4a' : (media.mime ?? blob.type).split('/')[1]?.replace('mpeg', 'mp3') || 'mp3';
  if (blob.size <= UPLOAD_LIMIT) {
    onProgress?.(0.05);
    const result = await request(key, form(model, media.lang, { file: blob, name: `audio.${ext}` }));
    onProgress?.(1);
    return cuesFromWhisper(result, media.lang);
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (!isMp3(bytes)) return groqSamples(key, model, media.lang, await decode(blob), onProgress);
  const parts = splitMp3(bytes, PART_SIZE);
  const cues: Cue[] = [];
  let offsetMs = 0;
  for (let i = 0; i < parts.length; i++) {
    onProgress?.(i / parts.length);
    const result = await request(key, form(model, media.lang, { file: new Blob([parts[i] as BlobPart], { type: 'audio/mpeg' }), name: `part-${i + 1}.mp3` }));
    cues.push(...cuesFromWhisper(result, media.lang, offsetMs));
    // Whisper reports each part's length; fall back to its share of the file.
    offsetMs += result.duration ? Math.round(result.duration * 1000) : Math.round(((media.durationMs ?? 0) * parts[i].length) / bytes.length);
  }
  onProgress?.(1);
  return cues;
}

/** What Whisper tends to invent over music or silence (credits, "thanks for watching"). */
const INVENTED = /amara\.org|subt[ií]tul|untertitel|sous-titr|sottotitol|ondertitel|legendas|thanks for watching|gracias por ver|merci d.avoir regard|suscr[ií]b|abonnez|abonniert|^[\s.♪♫…-]*$/i;

/**
 * A short stretch of a live stream (a station's last few seconds), with the transcriber chosen in
 * Settings › Listening. MP3 goes to Groq as it is; anything else is decoded here and sent as WAV.
 */
const NO_CLIP_KEY = 'Add a free Groq key in Settings › AI, or choose Whisper on this device in Settings › Listening.';
const NO_PLAN = `${AI_NEEDS_MAX} Or choose Whisper on this device in Settings › Listening.`;

/** Why live text can't start (no Groq key, and Whisper isn't set to run on this device), or null. */
export async function clipBlocker(): Promise<string | null> {
  const settings = await getSettings();
  if (settings.audio.transcriber === 'device') return null;
  const block = aiBlock(settings, 'groq');
  return block === 'max' ? NO_PLAN : block === 'key' ? NO_CLIP_KEY : null;
}

export async function transcribeClip(bytes: Uint8Array, lang: string, onProgress?: (p: DeviceProgress) => void): Promise<Cue[]> {
  const { apiKeys, audio } = await getAiSettings();
  const device = audio.transcriber === 'device';
  if (!device && !apiKeys.groq) throw new TranscribeError(NO_CLIP_KEY, 'no-key');
  let result: WhisperResult;
  if (!device && isMp3(bytes)) {
    result = await request(apiKeys.groq!, form(audio.whisperModel, lang, { file: new Blob([bytes as BlobPart], { type: 'audio/mpeg' }), name: 'live.mp3' }));
  } else {
    const samples = await decode(new Blob([bytes as BlobPart]));
    result = device ? await whisperOnDevice(samples, lang, audio.deviceModel, onProgress) : await request(apiKeys.groq!, form(audio.whisperModel, lang, { file: wav(samples), name: 'live.wav' }));
  }
  return cuesFromWhisper(result, lang).filter((c) => !INVENTED.test(c.text.trim()));
}
