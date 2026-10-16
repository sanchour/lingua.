// Audio and transcript files from the device: tags, cover art and duration for audio; SRT, VTT or
// plain text for transcripts.
import { readId3 } from '@/core/parsers/id3';
import { looksTimed, parseSubtitles, textToCues } from '@/core/parsers/subtitles';
import { decodeText } from '@/core/parsers/text';
import { addAudio } from '@/data/media';
import type { Cue, Transcript } from '@/data/types';

export const AUDIO_ACCEPT = 'audio/*,.mp3,.m4a,.aac,.ogg,.oga,.opus,.wav,.flac,.webm';
export const TRANSCRIPT_ACCEPT = '.srt,.vtt,.txt,text/plain,text/vtt';

const MIME_BY_EXT: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  wav: 'audio/wav',
  flac: 'audio/flac',
  webm: 'audio/webm',
};

const baseName = (name: string) => name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim();

/** Duration from the browser's own decoder (metadata only, nothing is played). */
export function probeDuration(blob: Blob): Promise<number | undefined> {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    const url = URL.createObjectURL(blob);
    const done = (ms?: number) => {
      URL.revokeObjectURL(url);
      audio.removeAttribute('src');
      resolve(ms);
    };
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => done(Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : undefined);
    audio.onerror = () => done(undefined);
    window.setTimeout(() => done(undefined), 8000);
    audio.src = url;
  });
}

/** Adds audio files to the library; returns the new ids (files the device can't play are skipped). */
export async function importAudioFiles(lang: string, files: File[]): Promise<{ ids: string[]; skipped: string[] }> {
  const ids: string[] = [];
  const skipped: string[] = [];
  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const mime = file.type || MIME_BY_EXT[ext] || 'audio/mpeg';
    const durationMs = await probeDuration(file);
    if (durationMs === undefined && !MIME_BY_EXT[ext]) {
      skipped.push(file.name);
      continue;
    }
    const head = new Uint8Array(await file.slice(0, 1024 * 1024).arrayBuffer());
    const tags = readId3(head);
    ids.push(
      await addAudio({
        lang,
        title: tags.title || baseName(file.name),
        artist: tags.artist,
        collection: tags.album,
        durationMs,
        blob: file,
        mime,
        cover: tags.cover ? { blob: new Blob([tags.cover.data as BlobPart], { type: tags.cover.mime }), mime: tags.cover.mime } : undefined,
      }),
    );
  }
  return { ids, skipped };
}

/** Reads a transcript file: timed (SRT/VTT) or plain text spread over the audio. */
export async function readTranscriptFile(file: File, lang: string, durationMs: number | undefined): Promise<{ cues: Cue[]; source: Transcript['source'] }> {
  const text = decodeText(new Uint8Array(await file.arrayBuffer()), lang);
  if (looksTimed(text)) {
    const cues = parseSubtitles(text);
    if (!cues.length) throw new Error('No captions were found in that file.');
    return { cues, source: /\.vtt$/i.test(file.name) || text.startsWith('WEBVTT') ? 'vtt' : 'srt' };
  }
  if (!text.trim()) throw new Error('That file is empty.');
  return { cues: textToCues(text, durationMs ?? 0, lang), source: 'text' };
}
