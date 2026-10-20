import { describe, expect, it } from 'vitest';
import { readId3 } from './id3';

// ID3v2.3 and v2.4 tags built by hand. Frame sizes are plain 32-bit numbers in v2.3 and syncsafe
// (7 bits a byte) in v2.4, sub-frames inside CHAP included; sizes from 128 up tell the two apart.
type Version = 3 | 4;

const latin = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const utf8 = (s: string) => new TextEncoder().encode(s);
const zeros = (n: number) => new Uint8Array(n);
const u8 = (n: number) => Uint8Array.of(n);
const u32 = (n: number) => {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n);
  return b;
};
const syncsafe = (n: number) => Uint8Array.of((n >> 21) & 0x7f, (n >> 14) & 0x7f, (n >> 7) & 0x7f, n & 0x7f);
const utf16 = (s: string, littleEndian: boolean) => {
  const b = new Uint8Array(2 + s.length * 2);
  b.set(littleEndian ? [0xff, 0xfe] : [0xfe, 0xff]);
  for (let i = 0; i < s.length; i++) new DataView(b.buffer).setUint16(2 + i * 2, s.charCodeAt(i), littleEndian);
  return b;
};

function cat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

const frame = (v: Version, id: string, ...body: Uint8Array[]) => {
  const b = cat(...body);
  return cat(latin(id), v === 4 ? syncsafe(b.length) : u32(b.length), zeros(2), b);
};
/** A text frame: encoding 0 Latin-1, 1 UTF-16 with a byte order mark, 3 UTF-8. */
const text = (v: Version, id: string, value: string, encoding: 0 | 1 | 3 = 3, littleEndian = true) =>
  frame(v, id, u8(encoding), encoding === 1 ? utf16(value, littleEndian) : encoding === 3 ? utf8(value) : latin(value));
/** A chapter: its element id, start and end in ms, byte offsets (unused), then sub-frames. */
const chap = (v: Version, elementId: string, startMs: number, endMs: number, ...subFrames: Uint8Array[]) =>
  frame(v, 'CHAP', latin(elementId), u8(0), u32(startMs), u32(endMs), u32(0xffffffff), u32(0xffffffff), ...subFrames);
/** A table of contents: its element id, flags, its children's ids, then sub-frames. */
const ctoc = (v: Version, elementId: string, children: string[], ...subFrames: Uint8Array[]) =>
  frame(v, 'CTOC', latin(elementId), u8(0), u8(3), u8(children.length), ...children.map((c) => cat(latin(c), u8(0))), ...subFrames);
/** The tag (with padding), followed by the start of the audio. */
const tag = (v: Version, ...frames: Uint8Array[]) => {
  const body = cat(...frames, zeros(256));
  return cat(latin('ID3'), Uint8Array.of(v, 0, 0), syncsafe(body.length), body, Uint8Array.of(0xff, 0xfb, 0x90, 0x64), zeros(413));
};

const long = 'Capítulo tercero, en el que se cuenta lo que le sucedió al ingenioso hidalgo con unos cabreros y la graciosa aventura que tuvo con ellos';
const picture = (v: Version) => frame(v, 'APIC', u8(0), latin('image/jpeg'), u8(0), u8(3), u8(0), zeros(300));

describe('id3 track numbers and chapters', () => {
  it('reads TRCK as the track number', () => {
    expect(readId3(tag(3, text(3, 'TRCK', '3/12', 0))).track).toBe(3);
    expect(readId3(tag(4, text(4, 'TRCK', '7'))).track).toBe(7);
    expect(readId3(tag(4, text(4, 'TRCK', '/12'))).track).toBeUndefined();
  });

  it('reads v2.4 chapters (syncsafe sub-frame sizes), sorted, ignoring the table of contents', () => {
    expect(utf8(long).length).toBeGreaterThan(127);
    const tags = readId3(
      tag(
        4,
        text(4, 'TIT2', 'Don Quijote'),
        text(4, 'TRCK', '3/12'),
        ctoc(4, 'toc', ['ch3', 'ch1', 'ch2'], text(4, 'TIT2', 'Índice')),
        chap(4, 'ch3', 125_000, 300_000, picture(4), text(4, 'TIT3', long), text(4, 'TIT2', long)),
        chap(4, 'ch1', 0, 61_500, text(4, 'TIT2', 'Introducción')),
        chap(4, 'ch2', 61_500, 125_000, text(4, 'TIT3', 'Sin título')),
        text(4, 'TPE1', 'Miguel de Cervantes'),
      ),
    );
    expect(tags).toMatchObject({ title: 'Don Quijote', artist: 'Miguel de Cervantes', track: 3 });
    expect(tags.chapters).toEqual([
      { title: 'Introducción', startMs: 0 },
      { title: 'Chapter 2', startMs: 61_500 },
      { title: long, startMs: 125_000 },
    ]);
  });

  it('reads v2.3 chapters (plain sizes) with UTF-16 titles either way round', () => {
    expect(long.length).toBeGreaterThan(127);
    const tags = readId3(
      tag(
        3,
        text(3, 'TRCK', '3/12', 0),
        chap(3, 'chp3', 900_000, 1_000_000, picture(3), text(3, 'TIT2', 'Tres', 1, false)),
        chap(3, 'chp1', 0, 200_000, text(3, 'TIT2', 'Uno', 1, true)),
        chap(3, 'chp2', 200_000, 400_000, picture(3)),
        chap(3, 'chp4', 400_000, 900_000, text(3, 'TIT2', long, 0)),
        text(3, 'TALB', 'Novelas'),
      ),
    );
    expect(tags).toMatchObject({ track: 3, album: 'Novelas' });
    expect(tags.chapters).toEqual([
      { title: 'Uno', startMs: 0 },
      { title: 'Chapter 2', startMs: 200_000 },
      { title: long, startMs: 400_000 },
      { title: 'Tres', startMs: 900_000 },
    ]);
  });

  it('gives no chapters for one CHAP alone, or one too short to read', () => {
    expect(readId3(tag(4, chap(4, 'ch1', 0, 5000, text(4, 'TIT2', 'Todo')))).chapters).toBeUndefined();
    const broken = frame(4, 'CHAP', latin('ch2'), u8(0), u32(1000));
    const tags = readId3(tag(4, chap(4, 'ch1', 0, 5000, text(4, 'TIT2', 'Todo')), broken, text(4, 'TIT2', 'Libro')));
    expect(tags.chapters).toBeUndefined();
    expect(tags.title).toBe('Libro');
  });
});
