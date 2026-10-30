import { UiText } from '@/design/i18n/UiText';
/** A quiet progress ring (Apple Books' reading goal): fills as today's minutes add up. */
export function GoalRing({ value, goal, size = 132 }: { value: number; goal: number; size?: number }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const fraction = Math.min(1, goal ? value / goal : 0);
  const done = fraction >= 1;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--sunken)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          opacity={fraction > 0 ? 1 : 0}
          stroke={done ? 'var(--sage)' : 'var(--accent)'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - fraction)}
          style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.2, 0, 0, 1), stroke 300ms ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <span className="block font-serif text-[30px] leading-none font-semibold tabular-nums">{Math.floor(value)}</span>
        <span className="mt-1 block text-[11.5px] font-semibold text-ink-faint"><UiText source={'of {0} min'} values={[goal]} /></span>
      </div>
    </div>
  );
}
