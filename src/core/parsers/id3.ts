// Title, artist, album and cover art from an MP3's ID3v2 tag (versions 2.2–2.4).

export interface AudioTags {
  title?: string;
  artist?: string;
  album?: string;
  cover?: { mime: string; data: Uint8Array };
}

const syncsafe = (b: Uint8Array, i: number) => ((b[i] & 0x7f) << 21) | ((b[i + 1] & 0x7f) << 14) | ((b[i + 2] & 0x7f) << 7) | (b[i + 3] & 0x7f);
const uint32 = (b: Uint8Array, i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const uint24 = (b: Uint8Array, i: number) => (b[i] << 16) | (b[i + 1] << 8) | b[i + 2];

function decode(bytes: Uint8Array, encoding: number): string {
  const label = encoding === 1 ? 'utf-16' : encoding === 2 ? 'utf-16be' : encoding === 3 ? 'utf-8' : 'latin1';
  return new TextDecoder(label).decode(bytes).replace(/\0+$/, '').replace(/\0/g, ' / ').trim();
}

/** Index just past the encoded, null-terminated string that starts at `from`. */
function skipString(b: Uint8Array, from: number, encoding: number): number {
  const wide = encoding === 1 || encoding === 2;
  for (let i = from; i < b.length - (wide ? 1 : 0); i += wide ? 2 : 1) {
    if (b[i] === 0 && (!wide || b[i + 1] === 0)) return i + (wide ? 2 : 1);
  }
  return b.length;
}

/** Reads the tag at the start of the file (pass at least the first few hundred KB). */
export function readId3(bytes: Uint8Array): AudioTags {
  const tags: AudioTags = {};
  if (bytes.length < 10 || bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return tags; // "ID3"
  const version = bytes[3];
  const end = Math.min(bytes.length, 10 + syncsafe(bytes, 6));
  const v22 = version === 2;
  const headerSize = v22 ? 6 : 10;
  let i = 10;
  if (!v22 && bytes[5] & 0x40) i += version === 4 ? syncsafe(bytes, 10) : uint32(bytes, 10) + 4; // extended header

  while (i + headerSize <= end) {
    const id = String.fromCharCode(...bytes.subarray(i, i + (v22 ? 3 : 4)));
    if (!/^[A-Z0-9]{3,4}$/.test(id)) break; // padding
    const size = v22 ? uint24(bytes, i + 3) : version === 4 ? syncsafe(bytes, i + 4) : uint32(bytes, i + 4);
    const body = bytes.subarray(i + headerSize, Math.min(end, i + headerSize + size));
    i += headerSize + size;
    if (!body.length) continue;
    const enc = body[0];
    switch (id) {
      case 'TIT2':
      case 'TT2':
        tags.title = decode(body.subarray(1), enc) || tags.title;
        break;
      case 'TPE1':
      case 'TP1':
        tags.artist = decode(body.subarray(1), enc) || tags.artist;
        break;
      case 'TALB':
      case 'TAL':
        tags.album = decode(body.subarray(1), enc) || tags.album;
        break;
      case 'APIC': {
        if (tags.cover) break;
        const mimeEnd = skipString(body, 1, 0);
        const mime = decode(body.subarray(1, mimeEnd - 1), 0) || 'image/jpeg';
        const dataStart = skipString(body, mimeEnd + 1, enc); // after picture type + description
        tags.cover = { mime: mime.includes('/') ? mime : `image/${mime.toLowerCase()}`, data: body.slice(dataStart) };
        break;
      }
      case 'PIC': {
        if (tags.cover) break;
        const format = String.fromCharCode(...body.subarray(1, 4)).toLowerCase();
        const dataStart = skipString(body, 5, enc);
        tags.cover = { mime: format === 'png' ? 'image/png' : 'image/jpeg', data: body.slice(dataStart) };
        break;
      }
    }
  }
  return tags;
}
