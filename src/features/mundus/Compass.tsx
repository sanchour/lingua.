import { useUi } from '@/design/i18n/UiText';
import { useEffect, useState } from 'react';
import { BookOpen, Clapperboard, Headphones, Layers, MessagesSquare, PenLine } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { LANE_NAME, LANES } from '@/core/mundus/guide';
import type { Lane, Week } from '@/core/mundus/guide';

/** Mundus's own colour: deep sea teal, like a chart's ink. */
export const MUNDUS = '#2f7f86';
export const LANE_HUE: Record<Lane, string> = { read: '#6b8e78', listen: '#5f87a8', watch: '#c86d51', words: '#b38a3e', write: '#8a7fb0', speak: '#b0607a' };
export const LANE_ICON: Record<Lane, LucideIcon> = { read: BookOpen, listen: Headphones, watch: Clapperboard, words: Layers, write: PenLine, speak: MessagesSquare };

const C = 110;
const R0 = 30;
const R1 = 76;
const angleOf = (i: number) => -90 + i * 72;
const at = (deg: number, r: number) => [C + r * Math.cos((deg * Math.PI) / 180), C + r * Math.sin((deg * Math.PI) / 180)] as const;

/**
 * The week as a compass: one spoke per lane, as long as the time spent on it, and a needle pointing
 * where Mundus suggests going next. Only the needle moves (a transform), once, on arrival.
 */
export function Compass({ week, lane, size = 220 }: { week: Week; lane: Lane; size?: number }) {
  const translateUi = useUi();
  const total = LANES.reduce((n, l) => n + week[l], 0);
  const most = Math.max(1, ...LANES.map((l) => week[l]));
  const target = angleOf(LANES.indexOf(lane)) + 90;
  const [turn, setTurn] = useState(target - 140);
  useEffect(() => {
    const id = requestAnimationFrame(() => setTurn(target));
    return () => cancelAnimationFrame(id);
  }, [target]);

  const label = `This week: ${LANES.map((l) => `${LANE_NAME[l]} ${week[l]} minutes`).join(', ')}. Mundus points to ${LANE_NAME[lane]}.`;
  return (
    <svg viewBox="0 0 220 220" width={size} height={size} role="img" aria-label={label} className="shrink-0 overflow-visible">
      <circle cx={C} cy={C} r={R1 + 10} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeDasharray="2 5" />
      {LANES.map((l, i) => {
        const deg = angleOf(i);
        const share = week[l] ? Math.max(0.08, week[l] / most) : 0;
        const [x0, y0] = at(deg, R0);
        const [x1, y1] = at(deg, R1);
        const [x2, y2] = at(deg, R0 + (R1 - R0) * share);
        const [lx, ly] = at(deg, R1 + 24);
        const on = l === lane;
        return (
          <g key={l}>
            <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={LANE_HUE[l]} strokeOpacity={0.16} strokeWidth={13} strokeLinecap="round" />
            {share > 0 && <line x1={x0} y1={y0} x2={x2} y2={y2} stroke={LANE_HUE[l]} strokeWidth={13} strokeLinecap="round" />}
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize={11.5} fontWeight={on ? 800 : 600} fill={on ? LANE_HUE[l] : 'currentColor'} fillOpacity={on ? 1 : 0.6}>
              {LANE_NAME[l]}
            </text>
          </g>
        );
      })}
      {/* The needle turns to the lane (a CSS transform, so it stays on the compositor). */}
      <g style={{ transform: `rotate(${turn}deg)`, transformBox: 'view-box', transformOrigin: `${C}px ${C}px`, transition: 'transform 1.1s cubic-bezier(.2,.9,.25,1.08)' }}>
        <path d={`M ${C} ${C - R1 - 6} L ${C + 6} ${C - R0 + 4} L ${C - 6} ${C - R0 + 4} Z`} fill="currentColor" fillOpacity={0.82} />
      </g>
      <circle cx={C} cy={C} r={R0 - 3} className="fill-surface" stroke="currentColor" strokeOpacity={0.15} />
      <text x={C} y={C - 3} textAnchor="middle" fontSize={20} fontWeight={700} fill="currentColor" className="font-serif tabular-nums">
        {Math.round(total)}
      </text>
      <text x={C} y={C + 12} textAnchor="middle" fontSize={9} fontWeight={700} fill="currentColor" fillOpacity={0.55} letterSpacing="0.08em">{translateUi('MIN')}</text>
    </svg>
  );
}
