import { describe, expect, it } from 'vitest';
import { blobSource, bytesSource, readMp4 } from './mp4';
import type { ByteSource } from './mp4';

// MP4 files built byte by byte: a box is its size, its four-letter type and its content.
const latin = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const utf8 = (s: string) => new TextEncoder().encode(s);
const zeros = (n: number) => new Uint8Array(n);
const u8 = (n: number) => Uint8Array.of(n);
const u16 = (n: number) => Uint8Array.of(n >> 8, n & 0xff);
const u32 = (n: number) => {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n);
  return b;
};
const u64 = (n: number) => {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigUint64(0, BigInt(n));
  return b;
};
const utf16 = (s: string, littleEndian = false) => {
  const b = new Uint8Array(s.length * 2);
  for (let i = 0; i < s.length; i++) new DataView(b.buffer).setUint16(i * 2, s.charCodeAt(i), littleEndian);
  return b;
};

function cat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

const box = (type: string, ...content: Uint8Array[]) => {
  const body = cat(...content);
  return cat(u32(8 + body.length), latin(type), body);
};
/** A full box: a version byte and three bytes of flags come first. */
const fullBox = (type: string, version: number, flags: number, ...content: Uint8Array[]) => box(type, u8(version), u8((flags >> 16) & 0xff), u16(flags & 0xffff), ...content);

const ftyp = box('ftyp', latin('M4B '), u32(0), latin('M4B '), latin('isom'), latin('mp42'));
const mvhd = (scale: number, duration: number) => fullBox('mvhd', 0, 0, u32(0), u32(0), u32(scale), u32(duration), zeros(80));
const mvhd1 = (scale: number, duration: number) => fullBox('mvhd', 1, 0, u64(0), u64(0), u32(scale), u64(duration), zeros(80));

/** An iTunes tag: its value in a `data` box (type 1 text, 13 JPEG, 14 PNG, 0 numbers). */
const item = (type: string, kind: number, value: Uint8Array) => box(type, fullBox('data', 0, kind, u32(0), value));
const textItem = (type: string, value: string) => item(type, 1, utf8(value));
const metaHdlr = fullBox('hdlr', 0, 0, u32(0), latin('mdir'), latin('appl'), zeros(9));

/** Nero chapters; version 1 has a reserved byte and a 32-bit count (mp4v2), which ffmpeg reads as 4 bytes skipped and a count byte. */
const chpl = (version: number, chapters: Array<[number, string]>) =>
  fullBox(
    'chpl',
    version,
    0,
    version ? cat(u8(0), u32(chapters.length)) : u8(chapters.length),
    ...chapters.map(([ms, title]) => {
      const t = utf8(title);
      return cat(u64(ms * 10_000), u8(t.length), t);
    }),
  );

/** A file of only a few real pieces, zeros elsewhere: a 5 GB audiobook costs nothing. Counts what's read. */
function sparse(size: number, pieces: Array<[number, Uint8Array]>): ByteSource & { bytesRead: number } {
  const src = {
    size,
    bytesRead: 0,
    read: async (offset: number, length: number) => {
      const out = new Uint8Array(Math.max(0, Math.min(length, size - offset)));
      src.bytesRead += out.length;
      for (const [at, bytes] of pieces) {
        const from = Math.max(at, offset);
        const to = Math.min(at + bytes.length, offset + out.length);
        if (from < to) out.set(bytes.subarray(from - at, to - at), from - offset);
      }
      return out;
    },
  };
  return src;
}

const read = (...parts: Uint8Array[]) => readMp4(bytesSource(cat(...parts)));

describe('mp4 files', () => {
  it('is null for what isn’t MP4', async () => {
    const mp3 = cat(latin('ID3'), Uint8Array.of(3, 0, 0, 0, 0, 0, 0), Uint8Array.of(0xff, 0xfb, 0x90, 0x64), zeros(400));
    expect(await readMp4(bytesSource(mp3))).toBeNull();
    expect(await readMp4(bytesSource(zeros(4000)))).toBeNull();
    expect(await readMp4(bytesSource(ftyp.subarray(0, 12)))).toBeNull();
  });

  it('finds moov after a large mdat, reading only small slices', async () => {
    const mdatSize = 300 * 1024 * 1024;
    const moov = box('moov', mvhd(44_100, 44_100 * 3723.5));
    const free = box('free', zeros(16));
    const mdatAt = ftyp.length + free.length;
    const src = sparse(mdatAt + mdatSize + moov.length, [
      [0, ftyp],
      [ftyp.length, free],
      [mdatAt, cat(u32(mdatSize), latin('mdat'))],
      [mdatAt + mdatSize, moov],
    ]);
    expect(await readMp4(src)).toEqual({ durationMs: 3_723_500, chapters: [] });
    expect(src.bytesRead).toBeLessThan(1024);
  });

  it('skips an mdat with a 64-bit size', async () => {
    const mdatSize = 5 * 2 ** 30;
    const moov = box('moov', mvhd(1000, 90_000));
    const src = sparse(ftyp.length + mdatSize + moov.length, [
      [0, ftyp],
      [ftyp.length, cat(u32(1), latin('mdat'), u64(mdatSize))],
      [ftyp.length + mdatSize, moov],
    ]);
    expect((await readMp4(src))?.durationMs).toBe(90_000);
  });

  it('reads a version 1 mvhd (64-bit duration)', async () => {
    expect((await read(ftyp, box('moov', mvhd1(1000, 5_000_000_000))))?.durationMs).toBe(5_000_000_000);
    expect((await read(ftyp, box('moov', mvhd1(600, 600 * 90))))?.durationMs).toBe(90_000);
  });

  it('gives no tags and no chapters for an MP4 without moov', async () => {
    expect(await read(ftyp, box('mdat', zeros(64)))).toEqual({ chapters: [] });
  });

  it('works on a Blob', async () => {
    const file = new Blob([cat(ftyp, box('mdat', zeros(1000)), box('moov', mvhd(1000, 61_000)))]);
    expect((await readMp4(blobSource(file)))?.durationMs).toBe(61_000);
  });
});

describe('mp4 tags', () => {
  const jpeg = Uint8Array.of(0xff, 0xd8, 0xff, 0xe0, 1, 2, 3);
  const png = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 4, 5, 6);

  it('reads iTunes tags from a meta with version and flags (ISO)', async () => {
    const ilst = box(
      'ilst',
      textItem('©nam', 'Don Quijote, parte 1'),
      textItem('aART', 'LibriVox'),
      textItem('©ART', 'Miguel de Cervantes'),
      textItem('©alb', 'Don Quijote'),
      item('trkn', 0, cat(u16(0), u16(3), u16(12), u16(0))),
      item('covr', 13, jpeg),
      item('covr', 14, png),
    );
    const tags = await read(ftyp, box('moov', mvhd(1000, 1000), box('udta', fullBox('meta', 0, 0, metaHdlr, ilst))));
    expect(tags).toMatchObject({ title: 'Don Quijote, parte 1', artist: 'Miguel de Cervantes', album: 'Don Quijote', track: 3, chapters: [] });
    expect(tags?.cover?.mime).toBe('image/jpeg');
    expect([...tags!.cover!.data]).toEqual([...jpeg]);
  });

  it('reads them from a QuickTime meta (no version and flags), with the album artist as a fallback', async () => {
    const ilst = box('ilst', textItem('aART', 'Benito Pérez Galdós'), textItem('©nam', 'Marianela'), item('covr', 14, png), item('trkn', 0, cat(u16(0), u16(0), u16(0), u16(0))));
    const tags = await read(ftyp, box('moov', box('udta', box('meta', metaHdlr, ilst))));
    expect(tags).toMatchObject({ title: 'Marianela', artist: 'Benito Pérez Galdós', chapters: [] });
    expect(tags?.track).toBeUndefined();
    expect(tags?.cover?.mime).toBe('image/png');
    expect([...tags!.cover!.data]).toEqual([...png]);
  });
});

describe('mp4 Nero chapters', () => {
  it('reads version 0 and version 1 chpl, sorted by start', async () => {
    const chapters: Array<[number, string]> = [
      [61_500, 'Capítulo 2'],
      [0, 'Capítulo 1'],
      [3_725_250, 'Capítulo 3: el último'], // 37 252 500 000 × 100 ns, past 32 bits
    ];
    const expected = [
      { title: 'Capítulo 1', startMs: 0 },
      { title: 'Capítulo 2', startMs: 61_500 },
      { title: 'Capítulo 3: el último', startMs: 3_725_250 },
    ];
    for (const version of [0, 1]) {
      const tags = await read(ftyp, box('moov', mvhd(1000, 4_000_000), box('udta', chpl(version, chapters))));
      expect(tags?.chapters).toEqual(expected);
    }
  });

  it('numbers untitled chapters in their sorted order', async () => {
    const tags = await read(ftyp, box('moov', box('udta', chpl(1, [[90_000, ''], [0, 'Prólogo'], [30_000, '']]))));
    expect(tags?.chapters.map((c) => c.title)).toEqual(['Prólogo', 'Chapter 2', 'Chapter 3']);
  });

  it('gives no chapters for a single one', async () => {
    expect((await read(ftyp, box('moov', box('udta', chpl(1, [[0, 'Todo']])))))?.chapters).toEqual([]);
  });
});

// ── QuickTime chapter tracks ─────────────────────────────────────────────────

interface TextTrack {
  id: number;
  scale: number;
  /** Time to sample: [sample count, ticks each]. */
  stts: Array<[number, number]>;
  samples: Uint8Array[];
  /** How many samples each chunk holds, in order. */
  chunks: number[];
  /** Sample to chunk: [first chunk (from 1), samples per chunk]. */
  stsc: Array<[number, number]>;
  /** Every sample padded to this size, written as stsz's one size. */
  fixedSize?: number;
  co64?: boolean;
  version1?: boolean;
}

const encd = cat(u32(12), latin('encd'), u32(0x100));
/** A text sample: a 16-bit length, the title, and (as QuickTime writes it) an `encd` box. */
const title8 = (title: string) => {
  const t = utf8(title);
  return cat(u16(t.length), t, encd);
};
const title16 = (title: string, littleEndian = false) => {
  const t = cat(littleEndian ? Uint8Array.of(0xff, 0xfe) : Uint8Array.of(0xfe, 0xff), utf16(title, littleEndian));
  return cat(u16(t.length), t, encd);
};

const tkhd = (id: number, version1 = false) =>
  version1 ? fullBox('tkhd', 1, 3, u64(0), u64(0), u32(id), u32(0), u64(0), zeros(60)) : fullBox('tkhd', 0, 3, u32(0), u32(0), u32(id), u32(0), u32(0), zeros(60));
const hdlr = (type: string) => fullBox('hdlr', 0, 0, latin('mhlr'), latin(type), zeros(12), u8(0));

function audioTrak(id: number, chapterTrack?: number): Uint8Array {
  return box(
    'trak',
    tkhd(id),
    chapterTrack ? box('tref', box('chap', u32(chapterTrack))) : new Uint8Array(0),
    box('mdia', fullBox('mdhd', 0, 0, u32(0), u32(0), u32(44_100), u32(0), u32(0)), hdlr('soun'), box('minf', box('stbl'))),
  );
}

function textTrak(track: TextTrack, offsets: number[]): Uint8Array {
  const { scale, stts, samples, stsc, fixedSize } = track;
  const mdhd = track.version1
    ? fullBox('mdhd', 1, 0, u64(0), u64(0), u32(scale), u64(0), u32(0))
    : fullBox('mdhd', 0, 0, u32(0), u32(0), u32(scale), u32(0), u32(0));
  const stsz = fixedSize ? fullBox('stsz', 0, 0, u32(fixedSize), u32(samples.length)) : fullBox('stsz', 0, 0, u32(0), u32(samples.length), ...samples.map((s) => u32(s.length)));
  const chunkOffsets = track.co64 ? fullBox('co64', 0, 0, u32(offsets.length), ...offsets.map(u64)) : fullBox('stco', 0, 0, u32(offsets.length), ...offsets.map(u32));
  const stbl = box(
    'stbl',
    fullBox('stsd', 0, 0, u32(0)),
    fullBox('stts', 0, 0, u32(stts.length), ...stts.map(([count, ticks]) => cat(u32(count), u32(ticks)))),
    fullBox('stsc', 0, 0, u32(stsc.length), ...stsc.map(([first, per]) => cat(u32(first), u32(per), u32(1)))),
    stsz,
    chunkOffsets,
  );
  return box('trak', tkhd(track.id, track.version1), box('mdia', mdhd, hdlr('text'), box('minf', box('gmhd'), box('dinf'), stbl)));
}

/** The chunks' bytes in an mdat (with audio between them), and where each chunk starts in the file. */
function layChunks(track: TextTrack, base: number): { mdat: Uint8Array; offsets: number[] } {
  const pieces: Uint8Array[] = [];
  const offsets: number[] = [];
  let at = base;
  let n = 0;
  for (const count of track.chunks) {
    const audio = zeros(37 + 11 * offsets.length);
    pieces.push(audio);
    at += audio.length;
    offsets.push(at);
    for (let k = 0; k < count; k++, n++) {
      const sample = track.fixedSize ? cat(track.samples[n], zeros(track.fixedSize - track.samples[n].length)) : track.samples[n];
      pieces.push(sample);
      at += sample.length;
    }
  }
  return { mdat: cat(...pieces), offsets };
}

/** ftyp, then an mdat holding the chapter samples, then moov with an audio track pointing at the text track. */
function chapterFile(track: TextTrack, ...more: Uint8Array[]): Uint8Array {
  const { mdat, offsets } = layChunks(track, ftyp.length + 8);
  return cat(ftyp, box('mdat', mdat), box('moov', mvhd(1000, 600_000), audioTrak(1, track.id), textTrak(track, offsets), ...more));
}

// Chapters at 0:00, 0:45, 2:10, 4:00, 6:30 and 9:00, in ticks of 1/600 s.
const ticks: Array<[number, number]> = [
  [1, 27_000],
  [1, 51_000],
  [1, 66_000],
  [2, 90_000],
  [1, 60_000],
];
const starts = [0, 45_000, 130_000, 240_000, 390_000, 540_000];
const names = ['Introducción', 'Lección 1', 'Lección 2', 'Lección 3 — repaso', 'Lección 4', 'Despedida'];

describe('mp4 chapter tracks', () => {
  it('follows tref/chap to the text track and reads its samples by stsc, stsz and stco', async () => {
    const track: TextTrack = {
      id: 3,
      scale: 600,
      stts: ticks,
      samples: names.map((name, i) => (i === 3 ? title16(name) : title8(name))),
      // Chunks 1 and 2 hold two samples each, 3 and 4 one each: an stsc entry lasts until the next one's first chunk.
      chunks: [2, 2, 1, 1],
      stsc: [
        [1, 2],
        [3, 1],
      ],
    };
    // A subtitle track (id 2) that isn't the chapter track comes first.
    const subtitles: TextTrack = { id: 2, scale: 1000, stts: [[1, 5000]], samples: [title8('Subtítulo')], chunks: [1], stsc: [[1, 1]] };
    const { mdat, offsets } = layChunks(track, ftyp.length + 8);
    const sub = layChunks(subtitles, ftyp.length + 8 + mdat.length);
    const file = cat(ftyp, box('mdat', mdat, sub.mdat), box('moov', mvhd(1000, 600_000), audioTrak(1, 3), textTrak(subtitles, sub.offsets), textTrak(track, offsets)));
    const tags = await readMp4(bytesSource(file));
    expect(tags?.chapters).toEqual(names.map((title, i) => ({ title, startMs: starts[i] })));
  });

  it('reads fixed sample sizes, a version 1 mdhd and tkhd, and UTF-16 little-endian titles', async () => {
    const track: TextTrack = {
      id: 2,
      scale: 1000,
      stts: [[3, 600_000]],
      samples: [title8('Uno'), title16('Dos', true), title8('Tres')],
      chunks: [1, 2],
      stsc: [
        [1, 1],
        [2, 2],
      ],
      fixedSize: 48,
      version1: true,
    };
    expect((await readMp4(bytesSource(chapterFile(track))))?.chapters).toEqual([
      { title: 'Uno', startMs: 0 },
      { title: 'Dos', startMs: 600_000 },
      { title: 'Tres', startMs: 1_200_000 },
    ]);
  });

  it('reads 64-bit chunk offsets past 4 GB', async () => {
    const track: TextTrack = { id: 2, scale: 600, stts: ticks, samples: names.map((name) => title8(name)), chunks: [3, 3], stsc: [[1, 3]], co64: true };
    const mdatAt = ftyp.length;
    const chunkAt = 4.5 * 2 ** 30;
    const { mdat, offsets } = layChunks(track, chunkAt);
    const mdatSize = chunkAt + mdat.length - mdatAt;
    const moov = box('moov', mvhd(1000, 600_000), audioTrak(1, 2), textTrak(track, offsets));
    const src = sparse(mdatAt + mdatSize + moov.length, [
      [0, ftyp],
      [mdatAt, cat(u32(1), latin('mdat'), u64(mdatSize))],
      [chunkAt, mdat],
      [mdatAt + mdatSize, moov],
    ]);
    expect((await readMp4(src))?.chapters).toEqual(names.map((title, i) => ({ title, startMs: starts[i] })));
    expect(src.bytesRead).toBeLessThan(16 * 1024);
  });

  it('finds a text track without tref by its handler', async () => {
    const track: TextTrack = { id: 2, scale: 1000, stts: [[2, 30_000]], samples: [title8('A'), title8('B')], chunks: [2], stsc: [[1, 2]] };
    const { mdat, offsets } = layChunks(track, ftyp.length + 8);
    const file = cat(ftyp, box('mdat', mdat), box('moov', audioTrak(1), textTrak(track, offsets)));
    expect((await readMp4(bytesSource(file)))?.chapters).toEqual([
      { title: 'A', startMs: 0 },
      { title: 'B', startMs: 30_000 },
    ]);
  });

  it('prefers chpl to the chapter track', async () => {
    const track: TextTrack = { id: 2, scale: 600, stts: ticks, samples: names.map((name) => title8(name)), chunks: [6], stsc: [[1, 6]] };
    const file = chapterFile(track, box('udta', chpl(0, [[0, 'Nero 1'], [1000, 'Nero 2']])));
    expect((await readMp4(bytesSource(file)))?.chapters.map((c) => c.title)).toEqual(['Nero 1', 'Nero 2']);
  });

  it('gives no chapters for a track of one sample', async () => {
    const track: TextTrack = { id: 2, scale: 600, stts: [[1, 6000]], samples: [title8('Todo')], chunks: [1], stsc: [[1, 1]] };
    expect((await readMp4(bytesSource(chapterFile(track))))?.chapters).toEqual([]);
  });
});
