// Videos and subtitle files from the device: duration and a poster frame for videos; subtitles are
// paired with videos by file name ("Episode 1.mp4" + "Episode 1.es.srt" + "Episode 1.en.srt").
import { GLOSS_LANG } from '@/core/lang/languages';
import { looksTimed, parseSubtitles } from '@/core/parsers/subtitles';
import { decodeText } from '@/core/parsers/text';
import type { Cue, Transcript } from '@/data/types';
import { addVideo, saveTrack } from '@/data/video';
import type { TrackRole } from '@/data/video';

export const VIDEO_ACCEPT = 'video/*,.mp4,.m4v,.mov,.webm,.mkv';
export const SUBTITLE_ACCEPT = '.srt,.vtt,text/vtt';
const VIDEO_EXT = /\.(mp4|m4v|mov|webm|mkv|ogv)$/i;
const SUB_EXT = /\.(srt|vtt)$/i;

const MIME_BY_EXT: Record<string, string> = { mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', mkv: 'video/x-matroska', ogv: 'video/ogg' };

const THREE: Record<string, string> = { eng: 'en', spa: 'es', rus: 'ru', por: 'pt', fra: 'fr', fre: 'fr', deu: 'de', ger: 'de', ita: 'it', swe: 'sv', hun: 'hu', ell: 'el', gre: 'el', nld: 'nl', dut: 'nl', nor: 'nb', nob: 'nb', tur: 'tr', ind: 'id', swa: 'sw', lat: 'la', ara: 'ar', zho: 'zh', chi: 'zh', cmn: 'zh', jpn: 'ja', kor: 'ko',
  hin: 'hi', pol: 'pl', vie: 'vi', tgl: 'tl', fil: 'tl', tha: 'th', fas: 'fa', per: 'fa', yue: 'yue', ces: 'cs', cze: 'cs', ron: 'ro', rum: 'ro',
  hbs: 'sh', hrv: 'sh', srp: 'sh', bos: 'sh', scr: 'sh', scc: 'sh', msa: 'ms', may: 'ms', zsm: 'ms', tam: 'ta', kat: 'ka', geo: 'ka', uzb: 'uz', mon: 'mn' };

/** "Show.S01E02.es.forced.srt" → { base: "show s01e02", lang: "es" } */
export function subtitleName(name: string): { base: string; lang?: string } {
  const parts = name.replace(SUB_EXT, '').split('.');
  let lang: string | undefined;
  while (parts.length > 1) {
    const last = parts.at(-1)!.toLowerCase();
    if (/^(forced|sdh|cc|hi|default)$/.test(last)) parts.pop();
    else if (/^[a-z]{2}(-[a-z]{2,4})?$/.test(last) || THREE[last]) {
      lang = THREE[last] ?? last.slice(0, 2);
      parts.pop();
      break;
    } else break;
  }
  return { base: baseKey(parts.join('.')), lang };
}

const baseKey = (name: string) =>
  name
    .replace(VIDEO_EXT, '')
    .toLowerCase()
    .replace(/[._\-\s]+/g, ' ')
    .trim();

export const prettyTitle = (name: string) => name.replace(VIDEO_EXT, '').replace(/[._]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Duration, size and a poster frame from the browser's own decoder (nothing is played aloud). */
export function probeVideo(blob: Blob): Promise<{ durationMs?: number; poster?: Blob; width?: number; height?: number }> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(blob);
    let settled = false;
    const done = (out: { durationMs?: number; poster?: Blob; width?: number; height?: number }) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      video.load();
      resolve(out);
    };
    let durationMs: number | undefined;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      durationMs = Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : undefined;
      // A frame a little way in is usually more telling than the first (often black).
      video.currentTime = Math.min(60, (video.duration || 0) * 0.08);
    };
    video.onseeked = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return done({ durationMs });
      const scale = Math.min(1, 640 / w);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((poster) => done({ durationMs, poster: poster ?? undefined, width: w, height: h }), 'image/jpeg', 0.82);
    };
    video.onerror = () => done({ durationMs });
    window.setTimeout(() => done({ durationMs }), 12_000);
    video.src = url;
  });
}

/** Reads a timed subtitle file (SRT or WebVTT). */
export async function readSubtitleFile(file: File, lang: string): Promise<{ cues: Cue[]; source: Transcript['source'] }> {
  const text = decodeText(new Uint8Array(await file.arrayBuffer()), lang);
  if (!looksTimed(text)) throw new Error('That file has no timings. Subtitles need to be .srt or .vtt.');
  const cues = parseSubtitles(text);
  if (!cues.length) throw new Error('No subtitles were found in that file.');
  return { cues, source: /\.vtt$/i.test(file.name) || text.startsWith('WEBVTT') ? 'vtt' : 'srt' };
}

/** Which track a subtitle file is: by its language tag, otherwise the first is the target. */
export function roleFor(tag: string | undefined, lang: string, taken: Set<TrackRole>): TrackRole | null {
  if (tag === lang) return taken.has('target') ? null : 'target';
  if (tag === GLOSS_LANG) return taken.has('native') ? null : 'native';
  if (!taken.has('target')) return 'target';
  if (!taken.has('native')) return 'native';
  return null;
}

/**
 * Adds videos (and any subtitle files picked with them) to Visio. Returns the new ids and the
 * files that were skipped.
 */
export async function importVideoFiles(lang: string, files: File[], onProgress?: (done: number, total: number) => void): Promise<{ ids: string[]; skipped: string[]; subtitles: number }> {
  const videos = files.filter((f) => VIDEO_EXT.test(f.name) || f.type.startsWith('video/'));
  const subs = files.filter((f) => SUB_EXT.test(f.name));
  const skipped = files.filter((f) => !videos.includes(f) && !subs.includes(f)).map((f) => f.name);
  const ids: string[] = [];
  let subtitles = 0;
  const used = new Set<File>();
  for (let i = 0; i < videos.length; i++) {
    onProgress?.(i, videos.length);
    const file = videos[i];
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const probe = await probeVideo(file);
    if (probe.durationMs === undefined && !probe.width) {
      skipped.push(file.name);
      continue;
    }
    const id = await addVideo({ lang, title: prettyTitle(file.name), blob: file, mime: file.type || MIME_BY_EXT[ext] || 'video/mp4', durationMs: probe.durationMs, poster: probe.poster });
    ids.push(id);
    const key = baseKey(file.name);
    const taken = new Set<TrackRole>();
    // Sole video: every subtitle belongs to it; otherwise match by name.
    const mine = subs.filter((s) => !used.has(s) && (videos.length === 1 || subtitleName(s.name).base === key || subtitleName(s.name).base.startsWith(key)));
    for (const sub of mine) {
      const role = roleFor(subtitleName(sub.name).lang, lang, taken);
      if (!role) continue;
      try {
        const { cues, source } = await readSubtitleFile(sub, role === 'target' ? lang : GLOSS_LANG);
        await saveTrack(id, role === 'target' ? lang : GLOSS_LANG, role, cues, source);
        taken.add(role);
        used.add(sub);
        subtitles++;
      } catch {
        skipped.push(sub.name);
      }
    }
  }
  for (const s of subs) if (!used.has(s)) skipped.push(s.name);
  onProgress?.(videos.length, videos.length);
  return { ids, skipped, subtitles };
}

/** Duration of a video on the web (when its host allows it to be read). */
export function probeLink(url: string): Promise<number | undefined> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    let settled = false;
    const done = (ms?: number) => {
      if (settled) return;
      settled = true;
      video.removeAttribute('src');
      video.load();
      resolve(ms);
    };
    video.preload = 'metadata';
    video.muted = true;
    video.onloadedmetadata = () => done(Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : undefined);
    video.onerror = () => done(undefined);
    window.setTimeout(() => done(undefined), 10_000);
    video.src = url;
  });
}

/** Adds a video that streams from a web address. */
export async function addVideoLink(lang: string, url: string, title: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new Error('That isn’t a web address.');
  }
  if (!/^https?:$/.test(parsed.protocol)) throw new Error('Use an http or https address.');
  if (/(^|\.)(youtube\.com|youtu\.be|netflix\.com|disneyplus\.com|max\.com|primevideo\.com)$/i.test(parsed.hostname)) {
    throw new Error('Streaming sites can’t be played inside Lingua. Add the show’s subtitle file instead (Subtitles only), and watch it there.');
  }
  const durationMs = await probeLink(parsed.href);
  if (durationMs === undefined) throw new Error('That address didn’t play as a video here. Use a direct link to an .mp4 or .webm file.');
  const name = decodeURIComponent(parsed.pathname.split('/').pop() ?? '') || parsed.hostname;
  return addVideo({ lang, title: title.trim() || prettyTitle(name), url: parsed.href, durationMs });
}

/**
 * Subtitles without a video (for a show watched elsewhere): read them, mine lines and words.
 * Files with the same name (Spanish + English) become one item. With a title (Mundus's "Add its
 * subtitles"), every file belongs to that one title.
 */
export async function importSubtitlesOnly(lang: string, files: File[], title?: string): Promise<{ ids: string[]; skipped: string[] }> {
  const groups = new Map<string, File[]>();
  const skipped: string[] = [];
  for (const f of files) {
    if (!SUB_EXT.test(f.name)) {
      skipped.push(f.name);
      continue;
    }
    const base = title ?? subtitleName(f.name).base;
    groups.set(base, [...(groups.get(base) ?? []), f]);
  }
  const ids: string[] = [];
  for (const group of groups.values()) {
    const taken = new Set<TrackRole>();
    const tracks: Array<{ role: TrackRole; cues: Cue[]; source: Transcript['source'] }> = [];
    for (const sub of group) {
      const role = roleFor(subtitleName(sub.name).lang, lang, taken);
      if (!role) continue;
      try {
        const read = await readSubtitleFile(sub, role === 'target' ? lang : GLOSS_LANG);
        tracks.push({ role, ...read });
        taken.add(role);
      } catch {
        skipped.push(sub.name);
      }
    }
    const main = tracks.find((t) => t.role === 'target');
    if (!main) continue;
    const name = group[0].name.replace(SUB_EXT, '').replace(/\.[a-z]{2,3}(-[a-z]{2,4})?$/i, '');
    const id = await addVideo({ lang, title: title ?? prettyTitle(name), durationMs: main.cues.at(-1)?.endMs });
    for (const t of tracks) await saveTrack(id, t.role === 'target' ? lang : GLOSS_LANG, t.role, t.cues, t.source);
    ids.push(id);
  }
  return { ids, skipped };
}
