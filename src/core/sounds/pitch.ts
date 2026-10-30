// The shape of a recording (6-10): where it is loud, and the pitch of the voice over time. Both are drawn beside the model's, so the
// learner sees stress and intonation rather than being told a score. Pure: samples in, numbers out; no audio API here.

/** The loudest sample of each of `bars` equal stretches, 0 to 1. */
export function waveformPeaks(samples: Float32Array, bars: number): number[] {
  const out: number[] = [];
  const step = Math.max(1, Math.floor(samples.length / bars));
  for (let b = 0; b < bars; b++) {
    let peak = 0;
    for (let i = b * step; i < Math.min(samples.length, (b + 1) * step); i++) peak = Math.max(peak, Math.abs(samples[i]));
    out.push(Math.min(1, peak));
  }
  return out;
}

/** Highest and lowest pitch of a voice that this looks for. */
const MIN_HZ = 70;
const MAX_HZ = 420;

/**
 * The pitch of the voice every `hopMs`, in Hz, or null where it is silent or unvoiced. By autocorrelation of a 40 ms window:
 * good enough to draw a contour and to see where a rise or a fall is, not to measure a note. (shortcut: no octave-error repair beyond
 * taking the first strong peak; upgrade to YIN if contours jump an octave.)
 */
export function pitchContour(samples: Float32Array, sampleRate: number, hopMs = 20): Array<number | null> {
  const win = Math.floor(sampleRate * 0.04);
  const hop = Math.max(1, Math.floor((sampleRate * hopMs) / 1000));
  const minLag = Math.floor(sampleRate / MAX_HZ);
  const maxLag = Math.min(win - 1, Math.floor(sampleRate / MIN_HZ));
  const out: Array<number | null> = [];
  // Quiet windows are not speech: quiet compared with the loudest part of this recording, so a quietly recorded voice still counts.
  let loudest = 0;
  for (let start = 0; start + win <= samples.length; start += hop) {
    let e = 0;
    for (let i = 0; i < win; i++) e += samples[start + i] * samples[start + i];
    loudest = Math.max(loudest, e);
  }
  for (let start = 0; start + win + maxLag <= samples.length; start += hop) {
    let energy = 0;
    for (let i = 0; i < win; i++) energy += samples[start + i] * samples[start + i];
    if (energy < 0.02 * loudest || energy / win < 1e-8) {
      out.push(null);
      continue;
    }
    const r: number[] = [];
    let max = 0;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let sum = 0;
      for (let i = 0; i < win; i++) sum += samples[start + i] * samples[start + i + lag];
      r.push(sum);
      max = Math.max(max, sum);
    }
    // Not periodic enough to be a voice (a hiss, a click): no pitch.
    let bestLag = 0;
    if (max >= 0.3 * energy) {
      // The first peak that is nearly as strong as the strongest: the strongest alone is often an octave down.
      for (let i = 1; i < r.length - 1; i++) {
        if (r[i] >= r[i - 1] && r[i] >= r[i + 1] && r[i] >= 0.9 * max) {
          bestLag = minLag + i;
          break;
        }
      }
    }
    out.push(bestLag ? sampleRate / bestLag : null);
  }
  return out;
}

/** The contour with its gaps joined and only its shape kept: semitones above the voice's own lowest note, so a high voice and a low voice can be compared. */
export function contourInSemitones(contour: ReadonlyArray<number | null>): Array<number | null> {
  const voiced = contour.filter((x): x is number => x !== null);
  if (!voiced.length) return contour.map(() => null);
  const base = Math.min(...voiced);
  return contour.map((hz) => (hz === null ? null : 12 * Math.log2(hz / base)));
}

/** A real-input FFT by the radix-2 recursion: the magnitudes of the first half of the bins. `size` must be a power of two. */
function fftMagnitudes(input: Float32Array): Float32Array {
  const n = input.length;
  const re = Float64Array.from(input);
  const im = new Float64Array(n);
  // Bit reversal.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) [re[i], re[j]] = [re[j], re[i]];
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k);
        const wi = Math.sin(ang * k);
        const a = i + k;
        const b = i + k + len / 2;
        const tr = re[b] * wr - im[b] * wi;
        const ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
      }
    }
  }
  const out = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) out[i] = Math.hypot(re[i], im[i]);
  return out;
}

export interface Spectrogram {
  /** One row per time step, one value per frequency bin, 0 (quiet) to 1 (loud, on the decibel scale of this recording). */
  frames: Float32Array[];
  /** The width of a bin in Hz, and of a step in ms. */
  binHz: number;
  stepMs: number;
}

/** The loudness at each frequency over time (up to `maxHz`), for drawing where the sounds are: vowels as bands, "s" as a smear at the top. */
export function spectrogram(samples: Float32Array, sampleRate: number, opts: { size?: number; stepMs?: number; maxHz?: number } = {}): Spectrogram {
  const size = opts.size ?? 512;
  const stepMs = opts.stepMs ?? 10;
  const maxHz = opts.maxHz ?? 5000;
  const hop = Math.max(1, Math.floor((sampleRate * stepMs) / 1000));
  const binHz = sampleRate / size;
  const bins = Math.min(size / 2, Math.floor(maxHz / binHz));
  const window = Float32Array.from({ length: size }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1)));
  const raw: Float32Array[] = [];
  let top = 1e-9;
  for (let start = 0; start + size <= samples.length; start += hop) {
    const frame = new Float32Array(size);
    for (let i = 0; i < size; i++) frame[i] = samples[start + i] * window[i];
    const mag = fftMagnitudes(frame).slice(0, bins);
    for (const m of mag) top = Math.max(top, m);
    raw.push(mag);
  }
  // 60 dB of range below the loudest point.
  const frames = raw.map((mag) => Float32Array.from(mag, (m) => Math.max(0, Math.min(1, 1 + (20 * Math.log10(Math.max(m, 1e-9) / top)) / 60))));
  return { frames, binHz, stepMs: (hop / sampleRate) * 1000 };
}

/**
 * Which way the voice goes at the end (6-10, for questions and statements): the last quarter of the voiced frames against the quarter before it,
 * in semitones. Null when too little was voiced to say; 'level' within a semitone and a half.
 */
export function endDirection(semitones: ReadonlyArray<number | null>): 'rise' | 'fall' | 'level' | null {
  const voiced = semitones.filter((x): x is number => x !== null);
  if (voiced.length < 8) return null;
  const q = Math.floor(voiced.length / 4);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const move = mean(voiced.slice(-q)) - mean(voiced.slice(-2 * q, -q));
  return move > 1.5 ? 'rise' : move < -1.5 ? 'fall' : 'level';
}
