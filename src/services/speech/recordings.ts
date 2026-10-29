// A real person saying the word (5.1-3c): the language's index of recordings on Wikimedia Commons,
// and each recording fetched when first played and kept in db.speech with its speaker and licence,
// so it plays offline afterwards.
import { pickRecording, recordingKey, recordingPage, recordingUrl, SOUNDS_LANGS, soundsFileName, speakerOf } from '@/core/audio/recordings';
import type { SoundsFile, SoundsRecording } from '@/core/audio/recordings';
import { db } from '@/data/db';
import type { SpeechRow } from '@/data/types';

/** The `voice` of a kept recording in db.speech. */
export const COMMONS = 'commons';

const indexes = new Map<string, Promise<SoundsFile['words'] | null>>();

async function unpack(res: Response): Promise<SoundsFile> {
  const blob = await res.blob();
  const head = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  // Some servers decompress .gz transparently; only gunzip when the bytes are still gzip.
  const gzipped = head[0] === 0x1f && head[1] === 0x8b;
  const text = gzipped ? await new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text() : await blob.text();
  return JSON.parse(text) as SoundsFile;
}

/** The language's index (fetched once a session; the browser keeps the file), or null without one or offline. */
function index(lang: string): Promise<SoundsFile['words'] | null> {
  if (!SOUNDS_LANGS.includes(lang)) return Promise.resolve(null);
  let found = indexes.get(lang);
  if (!found) {
    found = fetch(`${import.meta.env.BASE_URL}sounds/${soundsFileName(lang)}`)
      .then(async (res) => (res.ok ? (await unpack(res)).words : null))
      .catch(() => null);
    // Offline: try again next time instead of remembering the failure.
    void found.then((words) => words || indexes.delete(lang));
    indexes.set(lang, found);
  }
  return found;
}

export type Recorded = { kept: SpeechRow } | { recording: SoundsRecording };

/** The recording of `text` for this accent: one already kept on this device, else one in the index. */
export async function findRecording(lang: string, text: string, locale: string | null): Promise<Recorded | null> {
  if (!SOUNDS_LANGS.includes(lang)) return null;
  const key = recordingKey(text, lang);
  if (!key || key.length > 40) return null;
  const kept = await db.speech.get(`${COMMONS}|${key}`).catch(() => undefined);
  if (kept) return { kept };
  const recording = pickRecording((await index(lang))?.[key], locale);
  return recording ? { recording } : null;
}

/** Who to thank before Commons has been asked: Lingua Libre puts the speaker in the file name. */
export function creditOf(found: Recorded): string {
  if ('kept' in found) return found.kept.credit?.speaker ?? 'a Wikimedia Commons speaker';
  return speakerOf(found.recording) ?? 'a Wiktionary speaker';
}

const plain = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/** The speaker and licence from the file's page on Commons (its API allows any site to ask). */
async function credit(r: SoundsRecording): Promise<NonNullable<SpeechRow['credit']>> {
  const page = recordingPage(r);
  const fallback = { speaker: speakerOf(r) ?? 'Wikimedia Commons', licence: '', page };
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&iiprop=extmetadata&iiextmetadatafilter=LicenseShortName|Artist&titles=${encodeURIComponent(`File:${r[1]}`)}`;
    const res = await fetch(url);
    if (!res.ok) return fallback;
    const json = (await res.json()) as { query?: { pages?: Record<string, { imageinfo?: Array<{ extmetadata?: Record<string, { value?: string }> }> }> } };
    const meta = Object.values(json.query?.pages ?? {})[0]?.imageinfo?.[0]?.extmetadata ?? {};
    const artist = plain(meta.Artist?.value ?? '');
    const speaker = /Speaker:\s*(.+?)(?:\s+Recorder:|$)/.exec(artist)?.[1] ?? (artist || fallback.speaker);
    return { speaker, licence: plain(meta.LicenseShortName?.value ?? ''), page };
  } catch {
    return fallback;
  }
}

/** The recording as sound: kept already, or fetched now and kept. Throws when it can't be fetched. */
export async function recordingBlob(lang: string, text: string, found: Recorded): Promise<Blob> {
  if ('kept' in found) return found.kept.blob;
  const [res, who] = await Promise.all([fetch(recordingUrl(found.recording)), credit(found.recording)]);
  if (!res.ok) throw new Error(`Commons answered ${res.status}.`);
  const blob = await res.blob();
  const key = recordingKey(text, lang);
  await db.speech.put({ id: `${COMMONS}|${key}`, lang, text: key, voice: COMMONS, blob, createdAt: Date.now(), credit: who }).catch(() => undefined);
  return blob;
}

/** The recordings heard in `lang` on this device, the latest first, for the credits in Settings. */
export function heardRecordings(lang: string, limit = 40): Promise<SpeechRow[]> {
  return db.speech
    .orderBy('createdAt')
    .reverse()
    .filter((r) => r.voice === COMMONS && r.lang === lang)
    .limit(limit)
    .toArray();
}

/** Region-labelled Commons clips (Lingua Libre and Wiktionary); requested only when the learner searches. */
export async function recordingsForWord(lang: string, text: string): Promise<SoundsRecording[]> {
  if (!SOUNDS_LANGS.includes(lang)) return [];
  const key = recordingKey(text, lang);
  if (!key || key.length > 40) return [];
  const words = await index(lang);
  if (!words) throw new Error('The recording index is unavailable.');
  return (words[key] ?? []).filter((r) => Boolean(r[2].trim())).slice(0, 8);
}
