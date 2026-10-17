// Audio for transcription: any audio or video file decoded to 16 kHz mono (what Whisper expects),
// and cut into WAV parts small enough to upload.

export const WHISPER_RATE = 16_000;

/** Decodes a file's sound track to 16 kHz mono samples. Throws when the browser can't decode it. */
export async function decodeToMono16k(blob: Blob): Promise<Float32Array> {
  const bytes = await blob.arrayBuffer();
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(bytes);
  } finally {
    void ctx.close();
  }
  const frames = Math.ceil(decoded.duration * WHISPER_RATE);
  const offline = new OfflineAudioContext(1, Math.max(1, frames), WHISPER_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  // A copy, so it can be handed to a worker.
  return new Float32Array(rendered.getChannelData(0));
}

/** 16-bit PCM WAV of a stretch of samples. */
export function wav(samples: Float32Array, rate = WHISPER_RATE): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const text = (offset: number, s: string) => [...s].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Splits samples into parts of at most `maxSeconds`, cutting in the quietest moment near each
 * boundary so words aren't split. Returns each part with its start time.
 */
export function splitAtPauses(samples: Float32Array, maxSeconds = 600, rate = WHISPER_RATE): Array<{ samples: Float32Array; offsetMs: number }> {
  const max = maxSeconds * rate;
  const parts: Array<{ samples: Float32Array; offsetMs: number }> = [];
  let start = 0;
  while (start < samples.length) {
    let end = Math.min(samples.length, start + max);
    if (end < samples.length) {
      // Look back up to 20 s for the quietest 100 ms window.
      const window = rate / 10;
      let best = end;
      let quietest = Infinity;
      for (let at = end - window; at > end - 20 * rate && at > start + window; at -= window) {
        let energy = 0;
        for (let k = at; k < at + window; k += 8) energy += samples[k] * samples[k];
        if (energy < quietest) {
          quietest = energy;
          best = at + window / 2;
        }
      }
      end = Math.round(best);
    }
    parts.push({ samples: samples.subarray(start, end), offsetMs: Math.round((start / rate) * 1000) });
    start = end;
  }
  return parts;
}
