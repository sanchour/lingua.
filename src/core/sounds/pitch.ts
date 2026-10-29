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
