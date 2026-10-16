/**
 * A gentle test signal for the background-audio check: a C5+G5 chime every 2 seconds,
 * as a 16-bit mono WAV (no network, no bundled audio file).
 */
export function makeChimeWav(seconds = 60, sampleRate = 22050): Blob {
  const samples = seconds * sampleRate;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, samples * 2, true);

  const twoPi = 2 * Math.PI;
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const local = t % 2;
    const envelope = Math.exp(-local * 3.5) * Math.min(1, local * 200);
    const value = (0.6 * Math.sin(twoPi * 523.25 * t) + 0.4 * Math.sin(twoPi * 783.99 * t)) * envelope * 0.28;
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, value)) * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}
