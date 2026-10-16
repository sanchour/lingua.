export interface FrameStats {
  /** Average frames per second over the run. */
  fps: number;
  /** 95th-percentile frame interval, ms. */
  p95: number;
  /** Longest frame interval, ms. */
  worst: number;
  /** Frames that took longer than 1.5 display refreshes. */
  dropped: number;
  frames: number;
  /** Estimated display refresh rate (rAF is capped to it). */
  refreshHz: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

/** Summarises requestAnimationFrame intervals (ms). Pure, so it can be unit-tested. */
export function summarizeFrames(deltas: number[]): FrameStats {
  if (deltas.length === 0) return { fps: 0, p95: 0, worst: 0, dropped: 0, frames: 0, refreshHz: 0 };
  const sorted = [...deltas].sort((a, b) => a - b);
  const median = percentile(sorted, 0.5);
  const total = deltas.reduce((sum, d) => sum + d, 0);
  return {
    fps: (deltas.length * 1000) / total,
    p95: percentile(sorted, 0.95),
    worst: sorted[sorted.length - 1],
    dropped: deltas.filter((d) => d > median * 1.5).length,
    frames: deltas.length,
    refreshHz: Math.round(1000 / median),
  };
}

/** Records frame intervals for `durationMs`, then resolves with the summary. */
export function measureFrames(durationMs: number): Promise<FrameStats> {
  return new Promise((resolve) => {
    const deltas: number[] = [];
    let start = 0;
    let last = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      else deltas.push(now - last);
      last = now;
      if (now - start < durationMs) requestAnimationFrame(tick);
      else resolve(summarizeFrames(deltas));
    };
    requestAnimationFrame(tick);
  });
}

/** Rolling one-second FPS samples for the live monitor. Returns a stop function. */
export function startFrameMeter(onSample: (fps: number, worstMs: number) => void): () => void {
  let frame = 0;
  let windowStart = 0;
  let last = 0;
  let count = 0;
  let worst = 0;
  const tick = (now: number) => {
    if (!windowStart) windowStart = now;
    if (last) {
      worst = Math.max(worst, now - last);
      count++;
    }
    last = now;
    if (now - windowStart >= 1000) {
      onSample((count * 1000) / (now - windowStart), worst);
      windowStart = now;
      count = 0;
      worst = 0;
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}
