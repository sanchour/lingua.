// Subtitles for a YouTube video that has none yet. Two routes, both honest about what they can't do:
//  - Gemini (Lingua+ Max, the learner's own key): the video's address is handed to Gemini, which listens and answers with timed lines.
//    The key travels only in the x-goog-api-key header, never in a URL.
//  - YouTube's own captions, tried straight from the browser: YouTube often answers with nothing to a page it doesn't know, so an
//    empty answer is normal and the caller says so. The Lingua extension and a subtitle file are the other ways.
import { getLanguage } from '@/core/lang/languages';
import type { Cue } from '@/data/types';

const API = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Used when the learner's chosen AI isn't Gemini. */
export const DEFAULT_GEMINI_MODEL = 'gemini-flash-latest';

export class TranscriptError extends Error {
  constructor(
    message: string,
    readonly kind: 'no-key' | 'auth' | 'rate' | 'network' | 'unavailable' | 'bad-response' | 'empty',
  ) {
    super(message);
  }
}

/** "1:05", "01:02:03", "65.5" or 65.5 (seconds) as milliseconds; null for anything else. */
export function parseStamp(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? Math.round(value * 1000) : null;
  if (typeof value !== 'string') return null;
  const parts = value.trim().replace(',', '.').split(':');
  if (parts.length > 3 || parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return null;
  const seconds = parts.reduce((total, p) => total * 60 + Number(p), 0);
  return Math.round(seconds * 1000);
}

/** Gemini's answer ({"cues": [{start, end, text}]} or the bare list) as subtitle lines: sorted, with no empty or overlapping-nonsense lines. */
export function parseGeminiCues(text: string): Cue[] {
  let data: unknown;
  try {
    data = JSON.parse(text.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, ''));
  } catch {
    throw new TranscriptError('Gemini’s answer could not be read. Try again.', 'bad-response');
  }
  const list = Array.isArray(data) ? data : Array.isArray((data as { cues?: unknown })?.cues) ? (data as { cues: unknown[] }).cues : null;
  if (!list) throw new TranscriptError('Gemini’s answer could not be read. Try again.', 'bad-response');
  const cues: Cue[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const startMs = parseStamp(o.start ?? o.startMs ?? o.from);
    const line = typeof o.text === 'string' ? o.text.replace(/\s+/g, ' ').trim() : '';
    if (startMs === null || !line) continue;
    const endMs = parseStamp(o.end ?? o.endMs ?? o.to);
    cues.push({ startMs, endMs: endMs !== null && endMs > startMs ? endMs : startMs + Math.min(6000, 400 + line.length * 60), text: line });
  }
  cues.sort((a, b) => a.startMs - b.startMs);
  // A line never runs into the next one.
  for (let i = 0; i < cues.length - 1; i++) if (cues[i].endMs > cues[i + 1].startMs) cues[i].endMs = Math.max(cues[i].startMs + 300, cues[i + 1].startMs);
  return cues;
}

export interface GeminiRequest {
  youtubeId: string;
  lang: string;
  key: string;
  model: string;
}

/** The request body: the video by its address, and what to do with it. */
export function geminiBody(youtubeId: string, lang: string) {
  const name = getLanguage(lang)?.name ?? lang;
  const prompt =
    `Transcribe the speech in this video as subtitles in ${name}, exactly as spoken, with correct spelling and punctuation. ` +
    'Answer only with JSON: {"cues": [{"start": "MM:SS", "end": "MM:SS", "text": string}]}. ' +
    'Each cue is one subtitle of at most about 84 characters, in time order, with its own start and end as minutes and seconds from the start of the video. ' +
    'No speaker names, no descriptions of sounds or music, no translation.';
  return {
    contents: [{ parts: [{ file_data: { file_uri: `https://www.youtube.com/watch?v=${youtubeId}` } }, { text: prompt }] }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json' },
  };
}

/** Subtitles for a YouTube video from Gemini. Needs the learner's key (Max); it can take a minute for a long video. */
export async function transcribeWithGemini({ youtubeId, lang, key, model }: GeminiRequest, fetchImpl: typeof fetch = fetch): Promise<Cue[]> {
  if (!key) throw new TranscriptError('Add your Gemini key in Settings → AI first.', 'no-key');
  let res: Response;
  try {
    res = await fetchImpl(`${API}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody(youtubeId, lang)),
      signal: AbortSignal.timeout(300_000),
    });
  } catch {
    throw new TranscriptError('Couldn’t reach Gemini. Check your connection.', 'network');
  }
  if (res.status === 401 || res.status === 403) throw new TranscriptError('Gemini didn’t accept the key.', 'auth');
  if (res.status === 429) throw new TranscriptError('Gemini’s free quota is used up for now. Try again later.', 'rate');
  if (res.status === 400 || res.status === 404) throw new TranscriptError('Gemini couldn’t open this video. It must be public, and not too long.', 'unavailable');
  if (!res.ok) throw new TranscriptError(`Gemini answered with an error (${res.status}).`, 'bad-response');
  const answer = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = answer.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  const cues = parseGeminiCues(text);
  if (!cues.length) throw new TranscriptError('Gemini found no speech in this video.', 'empty');
  return cues;
}

/** YouTube's json3 captions as lines. */
export function parseJson3(body: string): Cue[] {
  let data: { events?: { tStartMs?: number; dDurationMs?: number; segs?: { utf8?: string }[] }[] };
  try {
    data = JSON.parse(body);
  } catch {
    return [];
  }
  const cues: Cue[] = [];
  for (const e of data.events ?? []) {
    const text = (e.segs ?? []).map((s) => s.utf8 ?? '').join('').replace(/\s+/g, ' ').trim();
    if (!text || typeof e.tStartMs !== 'number') continue;
    cues.push({ startMs: e.tStartMs, endMs: e.tStartMs + (e.dDurationMs ?? 3000), text });
  }
  return cues;
}

/**
 * YouTube's own captions for a video in a language, asked for straight from the browser. Often empty: YouTube doesn't hand
 * captions to a page it doesn't know. An empty list is an answer, not an error.
 */
export async function fetchYouTubeCaptions(youtubeId: string, lang: string, fetchImpl: typeof fetch = fetch): Promise<Cue[]> {
  for (const kind of ['', '&kind=asr']) {
    try {
      const res = await fetchImpl(`https://www.youtube.com/api/timedtext?v=${encodeURIComponent(youtubeId)}&lang=${encodeURIComponent(lang)}&fmt=json3${kind}`, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) continue;
      const cues = parseJson3(await res.text());
      if (cues.length) return cues;
    } catch {
      /* offline, or blocked: try the next, then say nothing was found */
    }
  }
  return [];
}
