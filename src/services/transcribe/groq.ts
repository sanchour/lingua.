// Transcripts with word timings from Whisper on Groq, with the learner's own key (sent only in
// the request header). Files over Groq's upload limit are split into parts at MP3 frame
// boundaries; streamed podcast episodes are fetched by Groq itself from their address.
import { isMp3, splitMp3 } from '@/core/audio/mp3';
import { cuesFromWhisper } from '@/core/parsers/whisper';
import type { WhisperResult } from '@/core/parsers/whisper';
import { audioBlob } from '@/data/media';
import { getSettings } from '@/data/settings';
import type { Cue, Media } from '@/data/types';

const ENDPOINT = 'https://api.groq.com/openai/v1/audio/transcriptions';
/** Groq's free tier accepts uploads up to 25 MB; parts stay safely under it. */
const UPLOAD_LIMIT = 24 * 1024 * 1024;
const PART_SIZE = 20 * 1024 * 1024;

export class TranscribeError extends Error {
  constructor(
    message: string,
    readonly kind: 'no-key' | 'auth' | 'rate' | 'too-large' | 'network' | 'bad-response' | 'no-audio',
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
  if (res.status === 401 || res.status === 403) throw new TranscribeError('Groq didn’t accept the API key (Ordo › AI).', 'auth');
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

/**
 * Transcribes an item: its downloaded audio when there is some, otherwise its web address.
 * `onProgress` gets 0–1 as parts finish.
 */
export async function transcribe(media: Media, onProgress?: (fraction: number) => void): Promise<Cue[]> {
  const { apiKeys, audio } = await getSettings();
  const key = apiKeys.groq;
  if (!key) throw new TranscribeError('Add a free Groq key in Ordo › AI to make transcripts.', 'no-key');
  const model = audio.whisperModel;
  const blob = await audioBlob(media);

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
  if (!isMp3(bytes)) throw new TranscribeError('Files over 25 MB can be transcribed when they are MP3. Convert this one, or use a shorter file.', 'too-large');
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
