// Splits a long MP3 into parts at frame boundaries, so each part is a playable file on its own
// (used to send long episodes to a transcription service that limits upload size).

const BITRATES_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const BITRATES_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
const SAMPLE_RATES: Record<number, number[]> = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

/** Byte length of the MPEG Layer III frame starting at `i`, or 0 if no valid header is there. */
export function frameLength(b: Uint8Array, i: number): number {
  if (i + 4 > b.length || b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) return 0;
  const version = (b[i + 1] >> 3) & 3; // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
  const layer = (b[i + 1] >> 1) & 3; // 1 = Layer III
  const bitrateIndex = b[i + 2] >> 4;
  const rateIndex = (b[i + 2] >> 2) & 3;
  if (version === 1 || layer !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || rateIndex === 3) return 0;
  const bitrate = (version === 3 ? BITRATES_V1_L3 : BITRATES_V2_L3)[bitrateIndex] * 1000;
  const sampleRate = SAMPLE_RATES[version][rateIndex];
  const padding = (b[i + 2] >> 1) & 1;
  return Math.floor(((version === 3 ? 144 : 72) * bitrate) / sampleRate) + padding;
}

/** A real frame boundary: a valid header whose following frame is valid too. */
function isBoundary(b: Uint8Array, i: number): boolean {
  const len = frameLength(b, i);
  return len > 0 && (i + len >= b.length || frameLength(b, i + len) > 0);
}

export function isMp3(b: Uint8Array): boolean {
  if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) return true; // ID3 tag first
  for (let i = 0; i < Math.min(b.length, 4096); i++) if (isBoundary(b, i)) return true;
  return false;
}

/** Parts no larger than `maxBytes`, each starting on a frame (the first keeps the tag). */
export function splitMp3(bytes: Uint8Array, maxBytes: number): Uint8Array[] {
  const parts: Uint8Array[] = [];
  let start = 0;
  while (bytes.length - start > maxBytes) {
    let cut = -1;
    // Search backwards from the limit for a frame boundary (frames are well under 2 KB).
    for (let i = start + maxBytes; i > start + maxBytes * 0.75; i--) {
      if (isBoundary(bytes, i)) {
        cut = i;
        break;
      }
    }
    if (cut < 0) cut = start + maxBytes; // not a clean MP3 stream; cut anyway
    parts.push(bytes.subarray(start, cut));
    start = cut;
  }
  parts.push(bytes.subarray(start));
  return parts;
}
