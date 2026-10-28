// Downloads, transcriptions and subtitle translations run in the background with their progress in a small store, so a
// row, the player and the mini player can all show them and leaving the page doesn't stop them.
import { create } from 'zustand';
import { db } from '@/data/db';
import { attachDownload, saveTranscript } from '@/data/media';
import type { Cue, Media } from '@/data/types';
import { setCues } from '@/services/audio/engine';
import { transcribe, TranscribeError } from '@/services/transcribe/groq';
import { makeNativeTrack, subtitleSized } from '@/services/visio/subtitles';
import { DEFAULT_GEMINI_MODEL, fetchYouTubeCaptions, transcribeWithGemini, TranscriptError } from '@/services/visio/youtubeTranscript';
import { aiKeys } from '@/data/plan';
import { getSettings } from '@/data/settings';
import { saveTrack } from '@/data/video';
import { toast } from '@/state/ui';
import { downloadBlob, NetError } from './net';
import { readAlongPart } from './readAlong';

interface JobsState {
  downloads: Record<string, number>;
  transcribing: Record<string, number>;
  translating: Record<string, number>;
  /** What a transcription is doing right now ("Getting the speech model ready…"). */
  notes: Record<string, string>;
}

export const useJobs = create<JobsState>(() => ({ downloads: {}, transcribing: {}, translating: {}, notes: {} }));

const setJob = (kind: 'downloads' | 'transcribing' | 'translating', id: string, value: number | null) =>
  useJobs.setState((s) => {
    const next = { ...s[kind] };
    if (value === null) delete next[id];
    else next[id] = value;
    return { [kind]: next };
  });

const controllers = new Map<string, AbortController>();

/** Saves a streamed episode on the device. */
export async function startDownload(media: Media): Promise<boolean> {
  if (!media.remoteUrl || useJobs.getState().downloads[media.id] !== undefined) return false;
  const controller = new AbortController();
  controllers.set(media.id, controller);
  setJob('downloads', media.id, 0);
  try {
    const blob = await downloadBlob(media.remoteUrl, (f) => setJob('downloads', media.id, f), controller.signal);
    await attachDownload(media.id, blob, blob.type || media.mime || 'audio/mpeg');
    toast(`“${media.title}” is saved for offline listening.`, { tone: 'success' });
    return true;
  } catch (error) {
    if (error instanceof NetError && error.kind === 'aborted') return false;
    const blocked = error instanceof NetError && error.kind === 'blocked';
    const message = blocked
      ? 'This podcast’s host doesn’t let apps download. It still streams; or save the file yourself and attach it from the ⋯ menu.'
      : error instanceof Error
        ? error.message
        : 'The download failed.';
    const url = media.remoteUrl;
    toast(message, { tone: 'error', duration: 10_000, action: blocked ? { label: 'Open the file', onClick: () => window.open(url, '_blank', 'noopener') } : undefined });
    return false;
  } finally {
    controllers.delete(media.id);
    setJob('downloads', media.id, null);
  }
}

export function cancelDownload(mediaId: string): void {
  controllers.get(mediaId)?.abort();
}

const setNote = (id: string, note: string | null) =>
  useJobs.setState((s) => {
    const notes = { ...s.notes };
    if (note === null) delete notes[id];
    else notes[id] = note;
    return { notes };
  });

/** Makes a transcript with Whisper (Groq or this device) and puts it to use straight away. */
export async function startTranscription(media: Media): Promise<boolean> {
  if (useJobs.getState().transcribing[media.id] !== undefined) return false;
  setJob('transcribing', media.id, 0);
  try {
    const { cues, source } = await transcribe(media, (f, note) => {
      setJob('transcribing', media.id, f);
      if (note) setNote(media.id, note);
    });
    if (!cues.length) throw new TranscribeError('No speech was found in this audio.', 'bad-response');
    const video = media.kind === 'video';
    await saveTranscript(media.id, media.lang, video ? subtitleSized(cues) : cues, source);
    if (!video) setCues(media.id, cues);
    // A part of a book read along with its ebook gets the book's sentences at once.
    const textId = (await db.media.get(media.id))?.readAlongTextId;
    const timed = textId ? await readAlongPart(media, textId) : null;
    toast(
      video
        ? `Subtitles for “${media.title}” are ready.`
        : timed === 'timed'
          ? `“${media.title}” now reads along with the book.`
          : timed
            ? `The transcript for “${media.title}” is ready, but the book’s text wasn’t found in it.`
            : `The transcript for “${media.title}” is ready.`,
      { tone: 'success' },
    );
    return true;
  } catch (error) {
    toast(error instanceof Error ? error.message : 'The transcript couldn’t be made.', { tone: 'error', duration: 8000 });
    return false;
  } finally {
    setJob('transcribing', media.id, null);
    setNote(media.id, null);
  }
}

/** English subtitles for a video, translated by the AI from its target track. */
export async function startTranslation(media: Media, cues: Cue[]): Promise<boolean> {
  if (useJobs.getState().translating[media.id] !== undefined) return false;
  setJob('translating', media.id, 0);
  try {
    const count = await makeNativeTrack(media, cues, (f) => setJob('translating', media.id, f));
    toast(`English subtitles are ready: ${count} lines.`, { tone: 'success' });
    return true;
  } catch (error) {
    toast(error instanceof Error ? error.message : 'The subtitles couldn’t be translated.', { tone: 'error', duration: 8000 });
    return false;
  } finally {
    setJob('translating', media.id, null);
  }
}

/** Subtitles for a YouTube video, made by Gemini with the learner's own key (Max). */
export async function startGeminiTranscript(media: Media): Promise<boolean> {
  if (!media.youtubeId || useJobs.getState().transcribing[media.id] !== undefined) return false;
  setJob('transcribing', media.id, 0.05);
  setNote(media.id, 'Gemini is watching the video…');
  try {
    const settings = await getSettings();
    const model = settings.llm.provider === 'gemini' && settings.llm.model ? settings.llm.model : DEFAULT_GEMINI_MODEL;
    const cues = await transcribeWithGemini({ youtubeId: media.youtubeId, lang: media.lang, key: aiKeys(settings).gemini?.trim() ?? '', model });
    await saveTrack(media.id, media.lang, 'target', subtitleSized(cues), 'gemini');
    toast(`Subtitles for “${media.title}” are ready: ${cues.length} lines.`, { tone: 'success' });
    return true;
  } catch (error) {
    toast(error instanceof TranscriptError || error instanceof Error ? error.message : 'Gemini couldn’t make the subtitles.', { tone: 'error', duration: 8000 });
    return false;
  } finally {
    setJob('transcribing', media.id, null);
    setNote(media.id, null);
  }
}

/** YouTube's own captions, if it will hand them over (often it won't, and the learner is told what else to try). */
export async function startYouTubeCaptions(media: Media): Promise<boolean> {
  if (!media.youtubeId || useJobs.getState().transcribing[media.id] !== undefined) return false;
  setJob('transcribing', media.id, 0.1);
  setNote(media.id, 'Asking YouTube for its captions…');
  try {
    const cues = await fetchYouTubeCaptions(media.youtubeId, media.lang);
    if (!cues.length) {
      toast('YouTube didn’t share captions for this video. Try the Lingua extension on YouTube, a subtitle file, or Gemini with Max.', { duration: 9000 });
      return false;
    }
    await saveTrack(media.id, media.lang, 'target', subtitleSized(cues), 'youtube');
    toast(`Captions added: ${cues.length} lines.`, { tone: 'success' });
    return true;
  } finally {
    setJob('transcribing', media.id, null);
    setNote(media.id, null);
  }
}
