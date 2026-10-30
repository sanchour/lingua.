// Beats and stress in a recording (6-10): where the syllables fall, how evenly, and which one is strongest. Found from loudness (and pitch,
// when the voice has it), so it is a guide to look at, not a measurement of a language. Pure: samples in, numbers out.

export interface Beat {
  /** Where the syllable peaks, in ms from the start. */
  ms: number;
  /** Its loudness, 0 to 1, against the loudest in the recording. */
  level: number;
  /** The pitch of the voice there, or null. */
  hz: number | null;
}

const FRAME_MS = 10;
const MIN_GAP_MS = 90;
const FLOOR = 0.15;
const LOW_HZ = 1000;
/** A dip between two peaks must go below this share of the lower one, or they are one syllable. */
const DIP = 0.8;

/**
 * The syllable peaks of a recording: the loudness every 10 ms, smoothed over 50 ms, its local maxima that stand out from the quiet and from
 * the dip before them, from the sound below 1 kHz. (shortcut: loudness only, so a very quiet syllable between loud ones can be missed and a
 * long vowel with a dip can count twice; upgrade to a syllable-nucleus model if real speech miscounts.) `contour` is pitchContour's output at a 20 ms hop.
 */
export function beatsOf(samples: Float32Array, sampleRate: number, contour: ReadonlyArray<number | null> = []): Beat[] {
  const frame = Math.max(1, Math.floor((sampleRate * FRAME_MS) / 1000));
  // Only the low sounds (vowels carry the syllable; s, f and bursts are noise to it): a one-pole low-pass at 1 kHz.
  const k = 1 - Math.exp((-2 * Math.PI * LOW_HZ) / sampleRate);
  const low = new Float32Array(samples.length);
  for (let i = 1; i < samples.length; i++) low[i] = low[i - 1] + k * (samples[i] - low[i - 1]);
  const raw: number[] = [];
  for (let s = 0; s + 2 * frame <= low.length; s += frame) {
    let sum = 0;
    for (let i = s; i < s + 2 * frame; i++) sum += low[i] * low[i];
    raw.push(Math.sqrt(sum / (2 * frame)));
  }
  const env = raw.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (let k = Math.max(0, i - 2); k <= Math.min(raw.length - 1, i + 2); k++) (sum += raw[k], n++);
    return sum / n;
  });
  const top = Math.max(0, ...env);
  if (top === 0) return [];
  const peaks: number[] = [];
  for (let i = 1; i < env.length - 1; i++) if (env[i] >= FLOOR * top && env[i] > env[i - 1] && env[i] >= env[i + 1]) peaks.push(i);
  // Close or shallow peaks are one syllable: keep the louder.
  const kept: number[] = [];
  for (const p of peaks) {
    const last = kept[kept.length - 1];
    if (last === undefined) {
      kept.push(p);
      continue;
    }
    const valley = Math.min(...env.slice(last, p + 1));
    if ((p - last) * FRAME_MS < MIN_GAP_MS || valley > DIP * Math.min(env[last], env[p])) {
      if (env[p] > env[last]) kept[kept.length - 1] = p;
    } else kept.push(p);
  }
  return kept.map((i) => ({ ms: i * FRAME_MS, level: env[i] / top, hz: contour[Math.round((i * FRAME_MS) / 20)] ?? null }));
}

/** Normalised pairwise variability of the gaps between beats: 0 for perfectly even, higher where short and long gaps alternate. Null under four beats. */
export function nPVI(beats: readonly Beat[]): number | null {
  const gaps = beats.slice(1).map((b, i) => b.ms - beats[i].ms);
  if (gaps.length < 3) return null;
  let sum = 0;
  for (let k = 0; k < gaps.length - 1; k++) sum += Math.abs(gaps[k] - gaps[k + 1]) / ((gaps[k] + gaps[k + 1]) / 2);
  return (100 * sum) / (gaps.length - 1);
}

/** The index of the strongest beat: the loud ones, and the high ones among them. */
export function strongest(beats: readonly Beat[]): number {
  const voiced = beats.flatMap((b) => (b.hz ? [12 * Math.log2(b.hz)] : []));
  const low = Math.min(...voiced);
  const span = Math.max(1, Math.max(...voiced) - low);
  let best = 0;
  let bestScore = -1;
  beats.forEach((b, i) => {
    const score = b.level + (b.hz ? (0.5 * (12 * Math.log2(b.hz) - low)) / span : 0);
    if (score > bestScore) (best = i, (bestScore = score));
  });
  return best;
}

const VOWELS: Record<string, string> = { es: 'aeiouáéíóúü', fr: 'aeiouyàâéèêëîïôùûüœ', de: 'aeiouyäöü', ru: 'аеёиоуыэюя' };
const STRONG = 'aeoáéíóú';

/** How many syllables a written word has, by the language's own spelling (a guess for French and German); null where it cannot be told from the letters (Arabic). */
export function syllablesIn(word: string, lang: string): number | null {
  const w = word.toLocaleLowerCase(lang).replace(/[^\p{L}]/gu, '');
  if (!w) return 0;
  if (lang === 'zh' || lang === 'ja') return [...w].length;
  const vowels = VOWELS[lang];
  if (!vowels) return null;
  // A silent u (que, gui).
  const letters = lang === 'es' ? w.replace(/(?<=[qg])u(?=[eiéí])/g, '') : w;
  const runs = letters.match(new RegExp(`[${vowels}]+`, 'g')) ?? [];
  let n = 0;
  for (const run of runs) {
    n++;
    if (lang === 'es') for (let i = 1; i < run.length; i++) if (STRONG.includes(run[i - 1]) && STRONG.includes(run[i])) n++;
  }
  // French: a final e after a consonant is not said (Anne, porte).
  if (lang === 'fr' && n > 1 && /[^aeiouyàâéèêëîïôùûüœ]e$/.test(w)) n--;
  return n;
}

/**
 * Which word of a sentence carries the strongest beat. Words and beats are matched by position (the syllable counts must be near); null when
 * the sentence cannot be counted or the beats do not fit it.
 */
export function strongestWord(words: readonly string[], lang: string, beats: readonly Beat[]): number | null {
  const counts = words.map((w) => syllablesIn(w, lang));
  if (counts.some((c) => c === null) || beats.length < 2) return null;
  const total = (counts as number[]).reduce((a, b) => a + b, 0);
  if (!total || Math.abs(beats.length - total) > Math.max(1, total * 0.25)) return null;
  const at = Math.round((strongest(beats) * (total - 1)) / (beats.length - 1));
  let upto = 0;
  for (let i = 0; i < words.length; i++) {
    upto += counts[i] as number;
    if (at < upto) return i;
  }
  return words.length - 1;
}
