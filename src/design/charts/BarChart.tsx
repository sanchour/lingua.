import { useUi } from '@/design/i18n/UiText';
import { useId, useState } from 'react';
import { compact, niceMax, useWidth } from './useWidth';

export interface Bar {
  label: string;
  /** Stacked values, in the order of `colors`. */
  values: number[];
  /** Highlight (e.g. today). */
  current?: boolean;
}

interface BarChartProps {
  bars: Bar[];
  colors: string[];
  names: string[];
  height?: number;
  format?: (n: number) => string;
  /** Show every n-th label under the bars. */
  labelEvery?: number;
}

/** Stacked bars with rounded tops and a readout on hover or tap. */
export function BarChart({ bars, colors, names, height = 150, format = compact, labelEvery = 1 }: BarChartProps) {
  const translateUi = useUi();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const clip = useId();
  const totals = bars.map((b) => b.values.reduce((a, v) => a + v, 0));
  const top = niceMax(Math.max(0, ...totals));
  const left = 30;
  const chartH = height - 22;
  const slot = bars.length ? (width - left) / bars.length : 0;
  const barW = Math.max(3, Math.min(22, slot * 0.62));
  const y = (v: number) => (v / top) * (chartH - 8);
  const hovered = hover === null ? null : bars[hover];

  return (
    <div ref={ref} className="relative select-none" style={{ height }} onPointerLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} className="block overflow-visible" role="img" aria-label={translateUi('{0} per period', [names.join(', ')])}>
          {[0, top / 2, top].map((t) => (
            <g key={t}>
              <line x1={left} x2={width} y1={chartH - y(t)} y2={chartH - y(t)} stroke="var(--line)" strokeDasharray={t ? '3 4' : undefined} />
              <text x={left - 6} y={chartH - y(t) + 4} textAnchor="end" className="fill-ink-faint text-[10.5px] font-semibold tabular-nums">
                {format(t)}
              </text>
            </g>
          ))}
          {bars.map((b, i) => {
            const cx = left + slot * i + slot / 2;
            const total = totals[i];
            const barH = total ? Math.max(2, y(total)) : 0;
            const r = Math.min(5, barW / 2, barH / 2);
            let acc = 0;
            return (
              <g key={i} onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)}>
                <rect x={left + slot * i} y={0} width={slot} height={chartH} fill="transparent" />
                {/* One rounded shape per bar; the stacked parts are cut from it. */}
                <clipPath id={`${clip}-${i}`}>
                  <path d={`M${cx - barW / 2},${chartH}V${chartH - barH + r}a${r},${r} 0 0 1 ${r},-${r}H${cx + barW / 2 - r}a${r},${r} 0 0 1 ${r},${r}V${chartH}Z`} />
                </clipPath>
                <g clipPath={`url(#${clip}-${i})`} opacity={hover === null || hover === i ? 1 : 0.55}>
                  {b.values.map((v, k) => {
                    if (!v || !total) return null;
                    const hgt = (v / total) * barH;
                    const yTop = chartH - acc - hgt;
                    acc += hgt;
                    return <rect key={k} x={cx - barW / 2} y={yTop} width={barW} height={hgt} fill={colors[k]} />;
                  })}
                </g>
                {b.current && <circle cx={cx} cy={chartH + 6} r={2.5} fill="var(--accent)" />}
                {i % labelEvery === 0 && (
                  <text x={cx} y={height - 2} textAnchor="middle" className="fill-ink-faint text-[10px] font-semibold">
                    {b.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {hovered && (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-xl bg-inverse px-3 py-2 text-[12.5px] text-on-inverse shadow-elev-2"
          style={{ left: Math.min(Math.max(0, left + slot * hover! - 50), Math.max(0, width - 150)), transform: 'translateY(-100%)' }}
        >
          <p className="font-bold">{hovered.label}</p>
          {hovered.values.map((v, k) =>
            names.length > 1 && !v ? null : (
              <p key={k} className="flex items-center gap-1.5 whitespace-nowrap">
                {names.length > 1 && <span className="size-2 rounded-full" style={{ background: colors[k] }} />}
                {names[k]}: {format(v)}
              </p>
            ),
          )}
        </div>
      )}
    </div>
  );
}
