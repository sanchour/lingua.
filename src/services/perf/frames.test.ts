import { describe, expect, it } from 'vitest';
import { summarizeFrames } from './frames';

describe('summarizeFrames', () => {
  it('reports a clean 60 Hz run', () => {
    const stats = summarizeFrames(Array(300).fill(1000 / 60));
    expect(stats.fps).toBeCloseTo(60, 5);
    expect(stats.refreshHz).toBe(60);
    expect(stats.dropped).toBe(0);
  });

  it('counts long frames as dropped relative to the display rate', () => {
    const deltas = [...Array(118).fill(1000 / 120), 25, 40];
    const stats = summarizeFrames(deltas);
    expect(stats.refreshHz).toBe(120);
    expect(stats.dropped).toBe(2);
    expect(stats.worst).toBe(40);
  });

  it('handles an empty run', () => {
    expect(summarizeFrames([]).fps).toBe(0);
  });

  it('identifies a 30 Hz Low Power Mode run cleanly', () => {
    const stats = summarizeFrames(Array(150).fill(1000 / 30));
    expect(stats.fps).toBeCloseTo(30, 5);
    expect(stats.refreshHz).toBe(30);
    expect(stats.dropped).toBe(0);
  });
});
