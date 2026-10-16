import type { ReactNode } from 'react';

/** A small progress ring (0–1) with content in the middle. Used for grades, goals and coverage. */
export function Ring({
  value,
  size = 56,
  stroke = 6,
  color = 'var(--sage)',
  label,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const fraction = Math.max(0, Math.min(1, value));
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} role={label ? 'img' : undefined} aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--sunken)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - fraction)}
          style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.2, 0, 0, 1)' }}
        />
      </svg>
      {children !== undefined && <div className="absolute inset-0 grid place-items-center text-center">{children}</div>}
    </div>
  );
}

/** Grade colours: sage when good, amber/terracotta while growing. */
export const gradeColor = (score: number) => (score >= 80 ? 'var(--sage)' : score >= 55 ? 'var(--learning-line)' : 'var(--accent)');
