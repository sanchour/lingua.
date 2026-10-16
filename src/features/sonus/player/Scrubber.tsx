import { useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { formatClock } from '@/core/audio/cues';
import { cx } from '@/lib/cx';
import { onTime, seek, skip, usePlayer } from '@/services/audio/engine';

/**
 * The progress bar. The playhead is written straight to the DOM every frame (no React renders);
 * dragging previews the time and seeks on release.
 */
export function Scrubber({ className, compact = false }: { className?: string; compact?: boolean }) {
  const duration = usePlayer((s) => s.durationMs);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const nowRef = useRef<HTMLSpanElement>(null);
  const leftRef = useRef<HTMLSpanElement>(null);
  const dragging = useRef<number | null>(null);
  const durationRef = useRef(duration);
  durationRef.current = duration;

  const paint = (ms: number) => {
    const d = durationRef.current;
    const share = d > 0 ? Math.min(1, Math.max(0, ms / d)) : 0;
    if (fillRef.current) fillRef.current.style.transform = `scaleX(${share})`;
    if (thumbRef.current && trackRef.current) thumbRef.current.style.transform = `translateX(${share * trackRef.current.clientWidth}px)`;
    if (nowRef.current) nowRef.current.textContent = formatClock(ms);
    if (leftRef.current) leftRef.current.textContent = d > 0 ? `−${formatClock(d - ms)}` : '';
  };

  useEffect(() => onTime((ms) => dragging.current === null && paint(ms)), []);

  const at = (e: ReactPointerEvent) => {
    const r = trackRef.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * durationRef.current;
  };

  return (
    <div className={className}>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Position"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration / 1000)}
        className={cx('group relative flex cursor-pointer touch-none items-center', compact ? 'h-4' : 'h-6')}
        onPointerDown={(e) => {
          if (!durationRef.current) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          dragging.current = at(e);
          paint(dragging.current);
        }}
        onPointerMove={(e) => {
          if (dragging.current === null) return;
          dragging.current = at(e);
          paint(dragging.current);
        }}
        onPointerUp={() => {
          if (dragging.current === null) return;
          seek(dragging.current);
          dragging.current = null;
        }}
        onPointerCancel={() => (dragging.current = null)}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          // Handled here (5 s steps); the page's own ←/→ skips must not run as well.
          e.preventDefault();
          e.stopPropagation();
          skip(e.key === 'ArrowLeft' ? -5 : 5);
        }}
      >
        <div className="absolute inset-x-0 h-1.5 overflow-hidden rounded-full bg-sunken">
          <div ref={fillRef} className="h-full origin-left rounded-full bg-accent" style={{ transform: 'scaleX(0)' }} />
        </div>
        <div
          ref={thumbRef}
          className={cx('pointer-events-none absolute left-0 rounded-full bg-raised shadow-elev-2 ring-1 ring-line-strong transition-[scale] duration-150', compact ? '-ml-1.5 size-3' : '-ml-2 size-4 group-active:scale-125')}
          aria-hidden
        />
      </div>
      {!compact && (
        <div className="mt-1 flex justify-between text-[12px] font-semibold text-ink-faint tabular-nums">
          <span ref={nowRef}>0:00</span>
          <span ref={leftRef} />
        </div>
      )}
    </div>
  );
}
