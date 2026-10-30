import { useUi } from '@/design/i18n/UiText';
// The radio's tuner (Lingua 5.2-2): a dial like an old radio's, the countries along it as marks
// with their flags and station counts, a fine needle in the middle. Drag it, turn the wheel or use
// the arrow keys: it snaps to each country, and the map and the list follow. Transforms only.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Globe2 } from 'lucide-react';
import { Flag, hasFlag } from '@/design/flags';
import { cx } from '@/lib/cx';
import { dialMarks, nearestMark } from '@/services/radio/kinds';

interface TunerProps {
  countries: Array<{ code: string; name: string; count: number }>;
  value: string | null;
  onTune: (code: string | null) => void;
}

export function Tuner({ countries, value, onTune }: TunerProps) {
  const translateUi = useUi();
  const marks = useMemo(() => dialMarks(countries), [countries]);
  const boxRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const at = Math.max(0, marks.findIndex((m) => m.code === value));
  const drag = useRef<{ x: number; from: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const wheelAt = useRef(0);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const ro = new ResizeObserver(() => setWidth(box.clientWidth));
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  // The wheel turns the dial a country a notch (not passive, so the page doesn't scroll as well).
  const turn = useRef<(d: number) => void>(() => undefined);
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = performance.now();
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(d) < 4 || now - wheelAt.current < 140) return;
      wheelAt.current = now;
      turn.current(d);
    };
    box.addEventListener('wheel', onWheel, { passive: false });
    return () => box.removeEventListener('wheel', onWheel);
  }, []);

  const offsetFor = (i: number) => width / 2 - (marks[i]?.centre ?? 0);
  const place = (x: number) => {
    if (stripRef.current) stripRef.current.style.transform = `translate3d(${x}px,0,0)`;
  };
  // At rest the chosen mark sits under the needle.
  useEffect(() => {
    if (!drag.current) place(offsetFor(at));
  });

  const tuneTo = (i: number) => {
    const j = Math.min(marks.length - 1, Math.max(0, i));
    place(offsetFor(j));
    if (marks[j].code !== value) onTune(marks[j].code);
  };
  turn.current = (d) => tuneTo(at + Math.sign(d));

  return (
    <div
      ref={boxRef}
      role="slider"
      tabIndex={0}
      aria-label={translateUi('Tune to a country')}
      aria-valuemin={0}
      aria-valuemax={marks.length - 1}
      aria-valuenow={at}
      aria-valuetext={marks[at] ? `${marks[at].name}, ${marks[at].count} stations` : undefined}
      className="relative h-[104px] cursor-grab touch-none overflow-hidden rounded-2xl border border-line/70 bg-raised shadow-elev-1 select-none focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          tuneTo(at + (e.key === 'ArrowRight' ? 1 : -1));
        } else if (e.key === 'Home') tuneTo(0);
      }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, from: offsetFor(at), moved: false };
        setDragging(true);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        if (Math.abs(e.clientX - d.x) > 3) d.moved = true;
        place(d.from + e.clientX - d.x);
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        drag.current = null;
        setDragging(false);
        if (!d) return;
        if (!d.moved) {
          // A click on a mark tunes straight to it.
          const x = e.clientX - (boxRef.current?.getBoundingClientRect().left ?? 0) - d.from;
          return tuneTo(nearestMark(marks, x));
        }
        tuneTo(nearestMark(marks, width / 2 - (d.from + e.clientX - d.x)));
      }}
      onPointerCancel={() => {
        drag.current = null;
        setDragging(false);
        place(offsetFor(at));
      }}
    >
      {/* The scale's fine ticks, under the marks. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[74px] h-3 opacity-60 [background:repeating-linear-gradient(90deg,var(--line-strong)_0_1px,transparent_1px_8px)]" />
      <div ref={stripRef} className={cx('absolute inset-y-0 left-0 flex will-change-transform', !dragging && 'transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]')}>
        {marks.map((m, i) => (
          <div key={m.code ?? 'all'} style={{ width: m.width }} className={cx('flex flex-col items-center pt-3 transition-opacity duration-200', i === at ? 'opacity-100' : 'opacity-55')}>
            {m.code && hasFlag(m.code.toLowerCase()) ? <Flag code={m.code.toLowerCase()} width={26} /> : m.code ? <span className="grid h-[17px] w-[26px] place-items-center rounded bg-sunken text-[9px] font-bold text-ink-faint">{m.code}</span> : <Globe2 size={18} className="text-ink-soft" aria-hidden />}
            <span className={cx('mt-1 max-w-full truncate px-1 text-[12px] leading-tight', i === at ? 'font-bold text-ink' : 'font-semibold text-ink-soft')}>{m.name}</span>
            <span className="text-[11px] text-ink-faint tabular-nums">{m.count}</span>
            <span className={cx('mt-auto mb-2 w-px rounded-full', i === at ? 'h-4 bg-ink' : 'h-2.5 bg-line-strong')} />
          </div>
        ))}
      </div>
      {/* The needle. */}
      <div aria-hidden className="pointer-events-none absolute top-[68px] bottom-1.5 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-accent shadow-[0_0_6px_var(--accent)]" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-raised to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-raised to-transparent" />
    </div>
  );
}
