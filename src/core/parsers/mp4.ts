// Tags and chapters from an MP4 audio file (M4A, M4B): title, artist, album, track number and cover
// from iTunes-style `ilst`, chapters from Nero's `chpl` or from a QuickTime chapter track (the way
// Apple's audiobooks keep them). Only the `moov` box is read whole; a chapter track's titles are
// read from the file by their offsets, so a 500 MB audiobook costs a few small reads.
import type { AudioChapter } from '@/data/types';

export interface Mp4Tags {
  title?: string;
  artist?: string;
  album?: string;
  track?: number;
  durationMs?: number;
  cover?: { mime: string; data: Uint8Array };
  chapters: AudioChapter[];
}

/** Random access to a file's bytes (a Blob in the app, an array in tests). */
export interface ByteSource {
  size: number;
  read(offset: number, length: number): Promise<Uint8Array>;
}

export const blobSource = (blob: Blob): ByteSource => ({
  size: blob.size,
  read: async (offset, length) => new Uint8Array(await blob.slice(offset, offset + length).arrayBuffer()),
});

export const bytesSource = (bytes: Uint8Array): ByteSource => ({
  size: bytes.length,
  read: async (offset, length) => bytes.subarray(offset, offset + length),
});

const u16 = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const u32 = (b: Uint8Array, i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const u64 = (b: Uint8Array, i: number) => u32(b, i) * 2 ** 32 + u32(b, i + 4);
const fourcc = (b: Uint8Array, i: number) => String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]);
const utf8 = new TextDecoder('utf-8');

interface Box {
  type: string;
  /** Where the box's content starts and ends (after its header). */
  start: number;
  end: number;
}

function* boxes(b: Uint8Array, from: number, to: number): Generator<Box> {
  let i = from;
  while (i + 8 <= to) {
    let size = u32(b, i);
    let header = 8;
    if (size === 1) {
      if (i + 16 > to) return;
      size = u64(b, i + 8);
      header = 16;
    } else if (size === 0) size = to - i;
    if (size < header || i + size > to) return;
    yield { type: fourcc(b, i + 4), start: i + header, end: i + size };
    i += size;
  }
}

const child = (b: Uint8Array, box: Box | undefined, type: string, skip = 0): Box | undefined => {
  if (!box) return undefined;
  for (const c of boxes(b, box.start + skip, box.end)) if (c.type === type) return c;
  return undefined;
};

const path = (b: Uint8Array, box: Box | undefined, ...types: string[]): Box | undefined => types.reduce<Box | undefined>((at, type) => child(b, at, type), box);

/** Reads an MP4's tags and chapters; null when the file isn't MP4. */
export async function readMp4(src: ByteSource): Promise<Mp4Tags | null> {
  if (src.size < 16 || fourcc(await src.read(0, 8), 4) !== 'ftyp') return null;
  // Find `moov` among the top-level boxes (it may sit after a large `mdat`).
  let at = 0;
  let moov: Uint8Array | null = null;
  while (at + 8 <= src.size) {
    const head = await src.read(at, 16);
    let size = u32(head, 0);
    let header = 8;
    if (size === 1) {
      size = u64(head, 8);
      header = 16;
    } else if (size === 0) size = src.size - at;
    if (size < header) break;
    if (fourcc(head, 4) === 'moov') {
      if (size > 64 * 1024 * 1024) return null;
      moov = await src.read(at, size);
      break;
    }
    at += size;
  }
  if (!moov) return { chapters: [] };
  const b = moov;
  const root: Box = { type: 'moov', start: u32(b, 0) === 1 ? 16 : 8, end: b.length };
  const tags: Mp4Tags = { chapters: [] };

  const mvhd = child(b, root, 'mvhd');
  if (mvhd) {
    const v1 = b[mvhd.start] === 1;
    const scale = u32(b, mvhd.start + (v1 ? 20 : 12));
    const duration = v1 ? u64(b, mvhd.start + 24) : u32(b, mvhd.start + 16);
    if (scale) tags.durationMs = Math.round((duration / scale) * 1000);
  }

  readIlst(b, root, tags);
  tags.chapters = readChpl(b, root) ?? (await readChapterTrack(b, root, src)) ?? [];
  return tags;
}

function readIlst(b: Uint8Array, root: Box, tags: Mp4Tags) {
  const meta = path(b, root, 'udta', 'meta');
  if (!meta) return;
  // ISO `meta` is a full box (4 bytes of version and flags); QuickTime's isn't.
  const ilst = child(b, meta, 'ilst', fourcc(b, meta.start + 4) === 'hdlr' ? 0 : 4);
  if (!ilst) return;
  for (const item of boxes(b, ilst.start, ilst.end)) {
    const data = child(b, item, 'data');
    if (!data || data.end - data.start < 8) continue;
    const kind = u32(b, data.start) & 0xffffff;
    const value = b.subarray(data.start + 8, data.end);
    const text = () => utf8.decode(value).replace(/\0+$/, '').trim() || undefined;
    switch (item.type) {
      case '©nam':
        tags.title = text() ?? tags.title;
        break;
      case '©ART':
        tags.artist = text() ?? tags.artist;
        break;
      case 'aART':
        tags.artist ??= text();
        break;
      case '©alb':
        tags.album = text() ?? tags.album;
        break;
      case 'trkn':
        if (value.length >= 4 && u16(value, 2)) tags.track = u16(value, 2);
        break;
      case 'covr':
        if (!tags.cover && value.length) tags.cover = { mime: kind === 14 ? 'image/png' : 'image/jpeg', data: value.slice() };
        break;
    }
  }
}

/** Nero chapters: a list of start times (in 100 ns) and titles. */
function readChpl(b: Uint8Array, root: Box): AudioChapter[] | null {
  const chpl = path(b, root, 'udta', 'chpl');
  if (!chpl) return null;
  let i = chpl.start + 4 + (b[chpl.start] >= 1 ? 4 : 0);
  const count = b[i++];
  const chapters: AudioChapter[] = [];
  for (let n = 0; n < count && i + 9 <= chpl.end; n++) {
    const start = u64(b, i);
    const length = b[i + 8];
    const title = utf8.decode(b.subarray(i + 9, Math.min(chpl.end, i + 9 + length))).trim();
    i += 9 + length;
    chapters.push({ title: title || `Chapter ${n + 1}`, startMs: Math.round(start / 10_000) });
  }
  return chapters.length > 1 ? chapters.sort((x, y) => x.startMs - y.startMs) : null;
}

const fullBoxInts = (b: Uint8Array, box: Box | undefined, skip: number): number[] => {
  if (!box) return [];
  const out: number[] = [];
  for (let i = box.start + skip; i + 4 <= box.end; i += 4) out.push(u32(b, i));
  return out;
};

/** A QuickTime chapter track: a text track whose samples are the chapter titles. */
async function readChapterTrack(b: Uint8Array, root: Box, src: ByteSource): Promise<AudioChapter[] | null> {
  const traks = [...boxes(b, root.start, root.end)].filter((x) => x.type === 'trak');
  const idOf = (trak: Box) => {
    const tkhd = child(b, trak, 'tkhd');
    return tkhd ? u32(b, tkhd.start + (b[tkhd.start] === 1 ? 20 : 12)) : -1;
  };
  const handler = (trak: Box) => {
    const hdlr = path(b, trak, 'mdia', 'hdlr');
    return hdlr ? fourcc(b, hdlr.start + 8) : '';
  };
  const chapId = traks.map((t) => fullBoxInts(b, path(b, t, 'tref', 'chap'), 0)[0]).find((id) => id !== undefined);
  const track = traks.find((t) => chapId !== undefined && idOf(t) === chapId) ?? traks.find((t) => handler(t) === 'text');
  if (!track) return null;

  const mdhd = path(b, track, 'mdia', 'mdhd');
  const stbl = path(b, track, 'mdia', 'minf', 'stbl');
  if (!mdhd || !stbl) return null;
  const scale = u32(b, mdhd.start + (b[mdhd.start] === 1 ? 20 : 12)) || 1000;

  // Sample times.
  const stts = fullBoxInts(b, child(b, stbl, 'stts'), 8);
  const starts: number[] = [];
  let t = 0;
  for (let e = 0; e + 1 < stts.length; e += 2) {
    for (let k = 0; k < stts[e] && starts.length < 10_000; k++) {
      starts.push(t);
      t += stts[e + 1];
    }
  }
  // Sample sizes.
  const stszBox = child(b, stbl, 'stsz');
  if (!stszBox) return null;
  const fixed = u32(b, stszBox.start + 4);
  const count = Math.min(starts.length, u32(b, stszBox.start + 8));
  const sizes = fixed ? Array.from({ length: count }, () => fixed) : fullBoxInts(b, stszBox, 12).slice(0, count);
  // Chunk offsets, and which samples sit in which chunk.
  const co64 = child(b, stbl, 'co64');
  const offsets: number[] = [];
  if (co64) for (let i = co64.start + 8; i + 8 <= co64.end; i += 8) offsets.push(u64(b, i));
  else offsets.push(...fullBoxInts(b, child(b, stbl, 'stco'), 8));
  const stsc = fullBoxInts(b, child(b, stbl, 'stsc'), 8);

  const sampleOffsets: number[] = [];
  for (let c = 0; c < offsets.length && sampleOffsets.length < count; c++) {
    let perChunk = 1;
    for (let e = 0; e + 2 < stsc.length; e += 3) if (stsc[e] - 1 <= c) perChunk = stsc[e + 1];
    let offset = offsets[c];
    for (let k = 0; k < perChunk && sampleOffsets.length < count; k++) {
      sampleOffsets.push(offset);
      offset += sizes[sampleOffsets.length - 1] ?? 0;
    }
  }

  const chapters: AudioChapter[] = [];
  for (let n = 0; n < sampleOffsets.length; n++) {
    const size = sizes[n];
    let title = '';
    if (size >= 2 && sampleOffsets[n] + size <= src.size) {
      const sample = await src.read(sampleOffsets[n], Math.min(size, 2 + 1024));
      const length = Math.min(u16(sample, 0), sample.length - 2);
      const raw = sample.subarray(2, 2 + length);
      title = (raw[0] === 0xfe && raw[1] === 0xff ? new TextDecoder('utf-16be').decode(raw.subarray(2)) : utf8.decode(raw)).trim();
    }
    chapters.push({ title: title || `Chapter ${n + 1}`, startMs: Math.round((starts[n] / scale) * 1000) });
  }
  return chapters.length > 1 ? chapters : null;
}
