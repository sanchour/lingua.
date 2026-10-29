// A bed of noise to listen through (6-9: speech in noise): white noise, softened, until it is stopped. One at a time.
let stopCurrent: (() => void) | null = null;

/** Starts the noise at a level (0 to 1) and returns what stops it. A second call stops the first. */
export function startNoise(level = 0.18): () => void {
  stopCurrent?.();
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return () => undefined;
  const ctx = new AC();
  const length = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // Brown-ish noise: white noise leaky-integrated, so it sounds like a room rather than a hiss.
  let last = 0;
  for (let i = 0; i < length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3.5;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const gain = ctx.createGain();
  gain.gain.value = Math.max(0, Math.min(1, level));
  source.connect(gain).connect(ctx.destination);
  source.start();
  const stop = () => {
    source.stop();
    void ctx.close();
    if (stopCurrent === stop) stopCurrent = null;
  };
  stopCurrent = stop;
  return stop;
}
