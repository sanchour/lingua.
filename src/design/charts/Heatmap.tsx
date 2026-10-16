import { useMemo, useState } from 'react';
import { localDateKey } from '@/lib/format';
import { useWidth } from './useWidth';

const DAY = 86_400_000;
const GAP = 3;

/** Sage tints by how much was done; level 0 is an empty cell. */
const LEVELS = ['var(--sunken)', 'color-mix(in oklab, var(--sage) 30%, var(--sunken))', 'color-mix(in oklab, var(--sage) 55%, var(--sunken))', 'color-mix(in oklab, var(--sage) 78%, var(--sunken))', 'var(--sage)'];

/**
 * A calendar of the last weeks, one cell per day (Monday on top), like a garden filling in.
 * `thresholds` are the values where levels 1–4 start (e.g. minutes: 1, 10, 20, 40).
 */
export function Heatmap({ values, thresholds = [1, 10, 20, 40], format }: { values: Map<string, number>; thresholds?: number[]; format: (v: number) => string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<{ date: string; value: number; x: number; y: number } | null>(null);
  const cell = width < 520 ? 12 : 13;
  const weeks = Math.max(8, Math.min(53, Math.floor((width + GAP) / (cell + GAP))));
  const today = localDateKey();

  const columns = useMemo(() => {
    const now = new Date();
    const weekday = (now.getDay() + 6) % 7; // Monday = 0
    const start = Date.now() - (weekday + (weeks - 1) * 7) * DAY;
    return Array.from({ length: weeks }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => {
        const ms = start + (w * 7 + d) * DAY;
        return ms > Date.now() + DAY / 2 ? null : localDateKey(ms);
      }),
    );
  }, [weeks]);

  const level = (v: number) => (v <= 0 ? 0 : thresholds.filter((t) => v >= t).length);
  let lastLabel = -10;
  const months = columns.map((col, i) => {
    const first = col[0];
    if (!first) return null;
    const d = new Date(`${first}T12:00:00`);
    const starts = d.getDate() <= 7 || i === 0;
    if (!starts || i - lastLabel < 3) return null;
    // The first column only gets a label when its month continues for a while.
    if (i === 0 && d.getDate() > 14) return null;
    lastLabel = i;
    return d.toLocaleDateString(undefined, { month: 'short' });
  });

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg width={weeks * (cell + GAP)} height={7 * (cell + GAP) + 18} role="img" aria-label="Activity calendar" onPointerLeave={() => setHover(null)}>
          {months.map((m, i) =>
            m ? (
              <text key={i} x={i * (cell + GAP)} y={10} className="fill-ink-faint text-[10px] font-semibold">
                {m}
              </text>
            ) : null,
          )}
          {columns.map((col, w) =>
            col.map((date, d) => {
              if (!date) return null;
              const v = values.get(date) ?? 0;
              const x = w * (cell + GAP);
              const y = 16 + d * (cell + GAP);
              return (
                <rect
                  key={date}
                  x={x}
                  y={y}
                  width={cell}
                  height={cell}
                  rx={3}
                  fill={LEVELS[level(v)]}
                  stroke={date === today ? 'var(--accent)' : 'none'}
                  strokeWidth={date === today ? 1.5 : 0}
                  onPointerEnter={() => setHover({ date, value: v, x, y })}
                  onPointerDown={() => setHover({ date, value: v, x, y })}
                />
              );
            }),
          )}
        </svg>
      )}
      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-xl bg-inverse px-3 py-2 text-[12.5px] whitespace-nowrap text-on-inverse shadow-elev-2"
          style={{ left: Math.min(Math.max(0, hover.x - 60), Math.max(0, width - 160)), top: hover.y - 8, transform: 'translateY(-100%)' }}
        >
          <p className="font-bold">{new Date(`${hover.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
          <p>{hover.value ? format(hover.value) : 'Nothing logged'}</p>
        </div>
      )}
      <div className="mt-2 flex items-center justify-end gap-1.5 text-[11px] font-semibold text-ink-faint">
        Less
        {LEVELS.map((c) => (
          <span key={c} className="size-2.5 rounded-[3px]" style={{ background: c }} />
        ))}
        More
      </div>
    </div>
  );
}
