import { useId, useState } from 'react';
import { compact, niceMax, useWidth } from './useWidth';

export interface LinePoint {
  x: number;
  y: number;
}

export interface LineSeries {
  name: string;
  color: string;
  points: LinePoint[];
}

interface LineChartProps {
  series: LineSeries[];
  height?: number;
  /** Tooltip heading for an x value (e.g. a date). */
  formatX: (x: number) => string;
  formatY?: (y: number) => string;
  /** Steps (level history) instead of lines. */
  step?: boolean;
  /** Fixed y-axis labels instead of numbers (e.g. CEFR levels). */
  yTicks?: Array<{ y: number; label: string }>;
  yMax?: number;
  empty?: string;
}

const PAD = { top: 10, right: 8, bottom: 22, left: 34 };

/** A quiet line chart: soft area under the first series, a hover/tap readout, no clutter. */
export function LineChart({ series, height = 170, formatX, formatY = compact, step = false, yTicks, yMax, empty = 'Not enough history yet' }: LineChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const gradient = useId();
  const all = series.flatMap((s) => s.points);
  if (all.length < 2) {
    return (
      <div className="grid place-items-center rounded-2xl bg-sunken/40 text-[13px] text-ink-faint" style={{ height }}>
        {empty}
      </div>
    );
  }
  const xs = all.map((p) => p.x);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const top = yMax ?? niceMax(Math.max(...all.map((p) => p.y)));
  const w = Math.max(0, width - PAD.left - PAD.right);
  const h = height - PAD.top - PAD.bottom;
  const sx = (x: number) => PAD.left + (x1 === x0 ? w / 2 : ((x - x0) / (x1 - x0)) * w);
  const sy = (y: number) => PAD.top + h - (y / top) * h;

  const path = (points: LinePoint[]) =>
    points
      .map((p, i) => {
        if (i === 0) return `M${sx(p.x)},${sy(p.y)}`;
        return step ? `H${sx(p.x)}V${sy(p.y)}` : `L${sx(p.x)},${sy(p.y)}`;
      })
      .join('');
  const ticks = yTicks ?? [0, top / 2, top].map((y) => ({ y, label: formatY(y) }));
  const base = series[0]?.points ?? [];
  const hovered = hover === null ? null : base[hover];

  const onMove = (clientX: number, rect: DOMRect) => {
    if (!base.length) return;
    const x = clientX - rect.left;
    let best = 0;
    for (let i = 1; i < base.length; i++) if (Math.abs(sx(base[i].x) - x) < Math.abs(sx(base[best].x) - x)) best = i;
    setHover(best);
  };

  return (
    <div ref={ref} className="relative select-none" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          className="block touch-pan-y overflow-visible"
          onPointerMove={(e) => onMove(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerDown={(e) => onMove(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label={series.map((s) => `${s.name}: ${formatY(s.points.at(-1)?.y ?? 0)} now`).join(', ')}
        >
          <defs>
            <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={series[0].color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={series[0].color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t.label}>
              <line x1={PAD.left} x2={PAD.left + w} y1={sy(t.y)} y2={sy(t.y)} stroke="var(--line)" strokeDasharray={t.y === 0 ? undefined : '3 4'} />
              <text x={PAD.left - 8} y={sy(t.y) + 4} textAnchor="end" className="fill-ink-faint text-[10.5px] font-semibold tabular-nums">
                {t.label}
              </text>
            </g>
          ))}
          <text x={PAD.left} y={height - 4} className="fill-ink-faint text-[10.5px] font-semibold">
            {formatX(x0)}
          </text>
          <text x={PAD.left + w} y={height - 4} textAnchor="end" className="fill-ink-faint text-[10.5px] font-semibold">
            {formatX(x1)}
          </text>
          {base.length > 1 && <path d={`${path(base)}V${sy(0)}H${sx(base[0].x)}Z`} fill={`url(#${gradient})`} />}
          {series.map((s) => (
            <path key={s.name} d={path(s.points)} fill="none" stroke={s.color} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {hovered && (
            <g>
              <line x1={sx(hovered.x)} x2={sx(hovered.x)} y1={PAD.top} y2={PAD.top + h} stroke="var(--line-strong)" />
              {series.map((s) => {
                const p = s.points.find((q) => q.x === hovered.x);
                return p ? <circle key={s.name} cx={sx(p.x)} cy={sy(p.y)} r={4} fill="var(--bg)" stroke={s.color} strokeWidth={2} /> : null;
              })}
            </g>
          )}
        </svg>
      )}
      {hovered && (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-xl bg-inverse px-3 py-2 text-[12.5px] text-on-inverse shadow-elev-2"
          style={{ left: Math.min(Math.max(0, sx(hovered.x) - 70), Math.max(0, width - 150)), transform: 'translateY(-100%)' }}
        >
          <p className="font-bold">{formatX(hovered.x)}</p>
          {series.map((s) => {
            const p = s.points.find((q) => q.x === hovered.x);
            return p ? (
              <p key={s.name} className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="size-2 rounded-full" style={{ background: s.color }} />
                {s.name}: {yTicks ? (yTicks.find((t) => t.y === p.y)?.label ?? formatY(p.y)) : formatY(p.y)}
              </p>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}
