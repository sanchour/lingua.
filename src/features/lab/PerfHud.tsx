import { UiText } from '@/design/i18n/UiText';
import { useEffect, useRef } from 'react';
import { startFrameMeter } from '@/services/perf/frames';

/**
 * Live FPS readout (Settings → Performance). Writes straight to the DOM once per second,
 * so the monitor itself never causes React renders.
 */
export default function PerfHud() {
  const fpsRef = useRef<HTMLSpanElement>(null);
  const worstRef = useRef<HTMLSpanElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);

  useEffect(
    () =>
      startFrameMeter((fps, worst) => {
        if (fpsRef.current) fpsRef.current.textContent = `${Math.round(fps)} fps`;
        if (worstRef.current) worstRef.current.textContent = `${Math.round(worst)} ms`;
        if (dotRef.current) dotRef.current.style.backgroundColor = fps >= 57 ? 'var(--sage)' : fps >= 45 ? 'var(--accent)' : '#d64545';
      }),
    [],
  );

  return (
    <div
      className="pointer-events-none fixed right-3 z-[100] flex items-center gap-2 rounded-full bg-ink/85 px-3 py-1.5 font-mono text-[11px] font-semibold text-bg shadow-elev-2 tabular-nums"
      style={{ top: 'calc(env(safe-area-inset-top) + 8px)' }}
      aria-hidden
    >
      <span ref={dotRef} className="size-2 rounded-full bg-sage" />
      <span ref={fpsRef}><UiText source={'— fps'} /></span>
      <span ref={worstRef} className="opacity-70"><UiText source={'— ms'} /></span>
    </div>
  );
}
