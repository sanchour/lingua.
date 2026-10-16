import { useId } from 'react';
import type { CSSProperties } from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}

export function Slider({ label, value, min, max, step = 1, onChange, format = String }: SliderProps) {
  const id = useId();
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div className="py-2">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[15px] font-semibold">
          {label}
        </label>
        <span className="text-sm text-ink-soft tabular-nums">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        className="lingua-range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ '--fill': `${fill}%` } as CSSProperties}
      />
    </div>
  );
}
