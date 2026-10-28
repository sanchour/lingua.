// The app's side of the Lingua extension (5.2-4): the extension's page script posts a request to this tab, and the answer goes back the same way.
// Looking words up and saving them stay here, in Lingua, so the extension needs no data of its own.
import { GLOSS_LANG } from '@/core/lang/languages';
import { normalizeWord } from '@/core/text/normalize';
import { db } from '@/data/db';
import { saveTrack } from '@/data/video';
import { setWordState } from '@/data/words';
import { lookupGlosses } from '@/services/translate/gloss';

export type BridgeRequest =
  | { type: 'hello' }
  | { type: 'lookup'; lang: string; word: string }
  | { type: 'save'; lang: string; word: string; sentence?: string; gloss?: string }
  | { type: 'captions'; youtubeId: string; lang: string; cues: Array<{ startMs: number; endMs: number; text: string }> };

export interface BridgeReply {
  ok: boolean;
  lang?: string;
  gloss?: string;
  error?: string;
}

const str = (v: unknown, max = 400) => (typeof v === 'string' && v.length <= max ? v : null);

/** Only well-formed requests are acted on; everything else is dropped. */
export function parseRequest(raw: unknown): BridgeRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const lang = str(r.lang, 12);
  switch (r.type) {
    case 'hello':
      return { type: 'hello' };
    case 'lookup': {
      const word = str(r.word, 80);
      return lang && word ? { type: 'lookup', lang, word } : null;
    }
    case 'save': {
      const word = str(r.word, 80);
      return lang && word ? { type: 'save', lang, word, sentence: str(r.sentence, 600) ?? undefined, gloss: str(r.gloss, 300) ?? undefined } : null;
    }
    case 'captions': {
      const youtubeId = str(r.youtubeId, 16);
      const cues = Array.isArray(r.cues) ? r.cues : null;
      if (!lang || !youtubeId || !cues || cues.length > 20_000) return null;
      const clean = cues.filter((c): c is { startMs: number; endMs: number; text: string } => !!c && typeof c.startMs === 'number' && typeof c.endMs === 'number' && typeof c.text === 'string' && c.text.length < 600);
      return { type: 'captions', youtubeId, lang, cues: clean };
    }
    default:
      return null;
  }
}

export async function handleRequest(request: BridgeRequest, currentLang: string): Promise<BridgeReply> {
  switch (request.type) {
    case 'hello':
      return { ok: true, lang: currentLang, gloss: GLOSS_LANG };
    case 'lookup': {
      const norm = normalizeWord(request.word, request.lang);
      const found = (await lookupGlosses(request.lang, [norm])).get(norm);
      return { ok: true, gloss: found?.text };
    }
    case 'save': {
      const norm = normalizeWord(request.word, request.lang);
      await setWordState(request.lang, norm, 2, { surface: request.word, sentence: request.sentence, gloss: request.gloss });
      return { ok: true };
    }
    case 'captions': {
      // Kept for that video when it is in Visio and has no lines of its own yet.
      const media = await db.media.filter((m) => m.youtubeId === request.youtubeId && !m.deletedAt).first();
      if (!media || !request.cues.length) return { ok: false, error: 'not-in-visio' };
      const have = await db.transcripts.get(`${media.id}:target`);
      if (have && !have.deletedAt && have.cues.length) return { ok: true };
      await saveTrack(media.id, request.lang, 'target', request.cues, 'vtt');
      return { ok: true };
    }
  }
}

/** Listens for the extension on this page; returns what stops it. */
export function startBridge(currentLang: () => string): () => void {
  const on = (event: MessageEvent) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const data = event.data as { source?: string; id?: string; request?: unknown } | null;
    if (!data || data.source !== 'lingua-extension' || typeof data.id !== 'string') return;
    const request = parseRequest(data.request);
    const reply = (r: BridgeReply) => window.postMessage({ source: 'lingua-app', id: data.id, reply: r }, window.location.origin);
    if (!request) return reply({ ok: false, error: 'bad-request' });
    handleRequest(request, currentLang()).then(reply, () => reply({ ok: false, error: 'failed' }));
  };
  window.addEventListener('message', on);
  return () => window.removeEventListener('message', on);
}
