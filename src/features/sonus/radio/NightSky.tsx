import { useEffect, useMemo, useRef, useState } from 'react';
import { Globe2, LocateFixed } from 'lucide-react';
import type { Place } from '@/services/radio/stations';
import { decodeCells, fitView, projector, WORLD } from './sky';
import { BRIGHT_CELLS, DIM_CELLS } from './worldDots';

const DIM = decodeCells(DIM_CELLS);
const BRIGHT = decodeCells(BRIGHT_CELLS);
const STAR = '#ffd88a';

const radius = (p: Place) => 2.2 + Math.min(5, Math.log2(p.stations.length + 1) * 1.2);

interface NightSkyProps {
  places: Place[];
  selected?: string | null;
  /** The place of the station playing now, which pulses. */
  playing?: string | null;
  onSelect: (place: Place | null) => void;
  caption: string;
}

/**
 * A minimal "night sky": the world drawn faintly by where radio stations are, the language's
 * stations bright on top, fitted to where they are. Tap a light for its stations.
 */
export function NightSky({ places, selected, playing, onSelect, caption }: NightSkyProps) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [world, setWorld] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setSize({ w: Math.round(entry.contentRect.width), h: Math.round(entry.contentRect.height) }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const view = useMemo(() => (world || !size.h ? WORLD : fitView(places.flatMap((p) => p.stations.map(() => p)), size.w / size.h)), [world, places, size.w, size.h]);
  const at = useMemo(() => (size.w && size.h ? projector(view, size.w, size.h) : null), [view, size.w, size.h]);

  useEffect(() => {
    const c = canvas.current;
    const g = c?.getContext('2d');
    if (!c || !g || !at) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = size.w * dpr;
    c.height = size.h * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, size.w, size.h);
    // The world's dots grow a little as the view comes closer.
    const cellPx = Math.abs(at(0, 0.5)[0] - at(0, 0)[0]);
    const r = Math.max(1, Math.min(2.6, cellPx * 0.32));
    const dots = (cells: Array<[number, number]>, colour: string, rr: number) => {
      g.fillStyle = colour;
      g.beginPath();
      for (const [lat, lon] of cells) {
        const [x, y] = at(lat, lon);
        if (x < -4 || y < -4 || x > size.w + 4 || y > size.h + 4) continue;
        g.moveTo(x + rr, y);
        g.arc(x, y, rr, 0, Math.PI * 2);
      }
      g.fill();
    };
    dots(DIM, 'rgba(196, 210, 255, 0.34)', r);
    dots(BRIGHT, 'rgba(206, 218, 255, 0.6)', r * 1.25);
    g.shadowColor = 'rgba(255, 190, 90, 0.85)';
    g.shadowBlur = 10;
    g.fillStyle = STAR;
    for (const p of places) {
      const [x, y] = at(p.lat, p.lon);
      g.beginPath();
      g.arc(x, y, radius(p), 0, Math.PI * 2);
      g.fill();
    }
    g.shadowBlur = 0;
    const chosen = places.find((p) => p.key === selected);
    if (chosen) {
      const [x, y] = at(chosen.lat, chosen.lon);
      g.strokeStyle = '#ffffff';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(x, y, radius(chosen) + 5, 0, Math.PI * 2);
      g.stroke();
    }
  }, [at, places, selected, size.w, size.h]);

  const pick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!at) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let best: Place | null = null;
    let bestGap = Infinity;
    for (const p of places) {
      const [px, py] = at(p.lat, p.lon);
      const gap = Math.hypot(px - x, py - y) - radius(p);
      if (gap < bestGap) {
        bestGap = gap;
        best = p;
      }
    }
    onSelect(bestGap <= 14 ? best : null);
  };

  const pulse = at && playing ? places.find((p) => p.key === playing) : undefined;
  const [px, py] = pulse && at ? at(pulse.lat, pulse.lon) : [0, 0];

  return (
    <div ref={box} className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-[radial-gradient(ellipse_at_50%_35%,#1b2442,#0a0e1c_72%)] shadow-elev-1 sm:aspect-[2/1]">
      <canvas ref={canvas} onClick={pick} role="img" aria-label={`Map: ${caption}`} className="absolute inset-0 size-full cursor-pointer" />
      {pulse && <span className="pointer-events-none absolute size-7 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border-2" style={{ left: px, top: py, borderColor: STAR }} aria-hidden />}
      <p className="pointer-events-none absolute bottom-3 left-4 text-[12.5px] font-semibold text-white/60">{caption}</p>
      <button
        type="button"
        onClick={() => setWorld(!world)}
        className="absolute top-3 right-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 text-[13px] font-semibold text-white/85 backdrop-blur hover:bg-white/20"
      >
        {world ? <LocateFixed size={15} aria-hidden /> : <Globe2 size={15} aria-hidden />}
        {world ? 'Closer' : 'World'}
      </button>
    </div>
  );
}
