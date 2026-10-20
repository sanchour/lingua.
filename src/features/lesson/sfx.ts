// Lesson sounds, made in the browser (no audio files): a soft chime for a right answer, a low
// note for a miss, a rising run for a combo and a short flourish at the end. Phones also get a
// small vibration where the browser allows it (Android; iOS Safari has no vibration API).

export type Cue = 'right' | 'wrong' | 'combo' | 'tick' | 'finish' | 'tap';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  return ctx;
}

/** One soft bell-like note: a sine with a quick attack and an exponential fall. */
function note(ac: AudioContext, freq: number, at: number, length = 0.22, gain = 0.12, type: OscillatorType = 'sine') {
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(gain, at + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(amp).connect(ac.destination);
  osc.start(at);
  osc.stop(at + length + 0.02);
}

const NOTES: Record<Cue, Array<[number, number, number?, OscillatorType?]>> = {
  // [frequency, delay in s, length, wave]
  right: [
    [659.25, 0],
    [987.77, 0.07, 0.3],
  ],
  wrong: [
    [233.08, 0, 0.18, 'triangle'],
    [196.0, 0.09, 0.26, 'triangle'],
  ],
  combo: [
    [659.25, 0],
    [830.61, 0.06],
    [987.77, 0.12],
    [1318.51, 0.18, 0.34],
  ],
  tick: [[1760, 0, 0.05, 'triangle']],
  tap: [[880, 0, 0.06]],
  finish: [
    [523.25, 0],
    [659.25, 0.1],
    [783.99, 0.2],
    [1046.5, 0.32, 0.5],
  ],
};

const VIBRATE: Partial<Record<Cue, number | number[]>> = { right: 12, wrong: [30, 40, 30], combo: [10, 30, 10, 30, 18], finish: [20, 60, 40] };

export interface CueOptions {
  sounds: boolean;
  haptics: boolean;
}

/** Plays a cue as the learner's settings allow. Never throws: sound is a nicety. */
export function play(cue: Cue, opts: CueOptions): void {
  if (opts.sounds) {
    const ac = audio();
    if (ac) {
      const t = ac.currentTime + 0.01;
      try {
        for (const [freq, delay, length, type] of NOTES[cue]) note(ac, freq, t + delay, length, cue === 'tick' || cue === 'tap' ? 0.05 : 0.12, type);
      } catch {
        /* an audio graph that won't build is no reason to stop a lesson */
      }
    }
  }
  const pattern = VIBRATE[cue];
  if (opts.haptics && pattern !== undefined && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* not allowed here */
    }
  }
}
