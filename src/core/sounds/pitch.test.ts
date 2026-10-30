import { describe, expect, it } from 'vitest';
import { contourInSemitones, pitchContour, waveformPeaks } from './pitch';

const tone = (hz: number, seconds: number, rate = 16000, amp = 0.5) => Float32Array.from({ length: rate * seconds }, (_, i) => amp * Math.sin((2 * Math.PI * hz * i) / rate));

describe('the shape of a recording', () => {
  it('draws loud and quiet stretches as bars', () => {
    const samples = new Float32Array([...tone(200, 1).slice(0, 8000), ...new Float32Array(8000)]);
    const bars = waveformPeaks(samples, 4);
    expect(bars[0]).toBeGreaterThan(0.4);
    expect(bars[3]).toBe(0);
  });
  it('finds the pitch of a steady voice', () => {
    for (const hz of [110, 180, 260]) {
      const contour = pitchContour(tone(hz, 0.6), 16000).filter((x): x is number => x !== null);
      expect(contour.length).toBeGreaterThan(10);
      const mid = contour[Math.floor(contour.length / 2)];
      expect(Math.abs(mid - hz) / hz).toBeLessThan(0.05);
    }
  });
  it('finds the pitch of a voice recorded quietly', () => {
    const c = pitchContour(tone(150, 0.5, 16000, 0.02), 16000).filter((x): x is number => x !== null);
    expect(c.length).toBeGreaterThan(10);
    expect(Math.abs(c[5] - 150) / 150).toBeLessThan(0.05);
  });
  it('leaves silence unvoiced, and sees a rise', () => {
    expect(pitchContour(new Float32Array(16000), 16000).every((x) => x === null)).toBe(true);
    const rising = new Float32Array([...tone(150, 0.4), ...tone(220, 0.4)]);
    const c = pitchContour(rising, 16000).filter((x): x is number => x !== null);
    expect(c.at(-1)!).toBeGreaterThan(c[0] * 1.3);
  });
  it('compares in semitones from the voice’s own lowest note', () => {
    const s = contourInSemitones([100, null, 200]);
    expect(s[0]).toBe(0);
    expect(s[1]).toBeNull();
    expect(s[2]).toBeCloseTo(12, 5);
    expect(contourInSemitones([null, null])).toEqual([null, null]);
  });
});

describe('the spectrogram', () => {
  it('puts a steady tone in the right band, and a higher tone higher up', async () => {
    const { spectrogram } = await import('./pitch');
    const peakHz = (hz: number) => {
      const s = spectrogram(tone(hz, 0.3), 16000);
      const mid = s.frames[Math.floor(s.frames.length / 2)];
      return mid.indexOf(Math.max(...mid)) * s.binHz;
    };
    expect(Math.abs(peakHz(1000) - 1000)).toBeLessThan(40);
    expect(peakHz(2500)).toBeGreaterThan(peakHz(1000));
  });
  it('is quiet where the sound is quiet, and cuts at the highest frequency asked for', async () => {
    const { spectrogram } = await import('./pitch');
    const s = spectrogram(new Float32Array([...tone(800, 0.2), ...new Float32Array(3200)]), 16000, { maxHz: 4000 });
    expect(Math.max(...s.frames[s.frames.length - 1])).toBeLessThan(0.05);
    expect(s.frames[0].length * s.binHz).toBeLessThanOrEqual(4000 + s.binHz);
  });
});
