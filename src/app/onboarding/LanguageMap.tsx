// The world with a dot where each language is spoken (Lingua 4.0-1): the picker's map. It draws the
// same countries as Radio's map and uses its camera arithmetic; the dots are the countries in a
// language's `flags`. Tapping a dot or a country says which place was meant; the language chosen
// has its countries tinted and the map flies to them.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Globe2, Minus, Plus } from 'lucide-react';
import { getLanguage } from '@/core/lang/languages';
import type { LanguageInfo } from '@/core/lang/languages';
import { between, boxAround, clampCamera, decodeCountries, fitBox, latToY, lonToX, maxZoom, minZoom, WORLD_BOTTOM, WORLD_TOP } from '@/features/sonus/radio/sky';
import type { Camera } from '@/features/sonus/radio/sky';
import { WORLD_MAP } from '@/features/sonus/radio/worldMap';

const COUNTRIES = decodeCountries(WORLD_MAP);
const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

let paths: Map<string, Path2D> | null = null;
let land: Path2D | null = null;
function pathsOf(): Map<string, Path2D> {
  if (paths) return paths;
  paths = new Map();
  land = new Path2D();
  for (const c of COUNTRIES) {
    const p = new Path2D();
    for (const ring of c.rings) {
      ring.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
      p.closePath();
    }
    paths.set(c.code, p);
    land.addPath(p);
  }
  return paths;
}

/** The map countries a language is spoken in: its flags that are on the map. */
export const placesOf = (lang: Pick<LanguageInfo, 'flags'>): string[] => lang.flags.map((f) => f.toUpperCase()).filter((c) => BY_CODE.has(c));

/** A country's name in English, from the browser. */
const names = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;
export const placeName = (code: string): string => {
  try {
    return names?.of(code) ?? code;
  } catch {
    return code;
  }
};

const FONT = "'Plus Jakarta Sans Variable', 'Inter Variable', system-ui, sans-serif";

interface Dot {
  code: string;
  x: number;
  y: number;
  /** The languages spoken here that can be picked from the list. */
  count: number;
  /** The best tier among them (1 is best). */
  best: number;
}

interface LanguageMapProps {
  languages: LanguageInfo[];
  /** The language chosen: its countries are tinted and the map flies to them. */
  selected: string | null;
  /** The country tapped, whose languages the list shows first. */
  place: string | null;
  onPlace: (code: string | null) => void;
}

export function LanguageMap({ languages, selected, place, onPlace }: LanguageMapProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const dots = useMemo<Dot[]>(() => {
    const map = new Map<string, Dot>();
    for (const l of languages) {
      for (const code of placesOf(l)) {
        const shape = BY_CODE.get(code)!;
        const tier = l.tier === 'x' ? 5 : l.tier;
        const dot = map.get(code) ?? { code, x: lonToX(shape.label.lon), y: latToY(shape.label.lat), count: 0, best: 9 };
        dot.count++;
        dot.best = Math.min(dot.best, tier);
        map.set(code, dot);
      }
    }
    return [...map.values()];
  }, [languages]);

  // Everything the drawing needs lives in refs, so gestures never wait for React.
  const cam = useRef<Camera | null>(null);
  const anim = useRef<{ from: Camera; to: Camera; start: number; ms: number } | null>(null);
  const frame = useRef(0);
  const hover = useRef<string | null>(null);
  const palette = useRef<Record<string, string> | null>(null);
  const chosen = useMemo(() => {
    const info = selected ? getLanguage(selected) : undefined;
    return info ? placesOf(info) : [];
  }, [selected]);
  const state = useRef({ dots, place, chosen });
  state.current = { dots, place, chosen };

  const home = (w: number, h: number): Camera => clampCamera({ x: 0.5, y: (WORLD_TOP + WORLD_BOTTOM) / 2, z: minZoom(w, h) }, w, h);

  function draw(now: number) {
    frame.current = 0;
    const canvas = canvasRef.current;
    const g = canvas?.getContext('2d');
    const { w, h } = sizeRef.current;
    if (!canvas || !g || !w || !h) return;
    let c = cam.current ?? home(w, h);
    let again = false;
    if (anim.current) {
      const t = Math.min(1, (now - anim.current.start) / anim.current.ms);
      c = between(anim.current.from, anim.current.to, t);
      if (t >= 1) anim.current = null;
      else again = true;
    }
    cam.current = c;

    if (!palette.current) {
      const css = getComputedStyle(document.documentElement);
      const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
      palette.current = { water: v('--sunken', '#e8dfcf'), land: v('--raised', '#fffbf4'), border: v('--line-strong', '#cbbfae'), accent: v('--accent', '#c86d51'), onAccent: v('--on-accent', '#ffffff'), ink: v('--ink', '#2b2420'), sage: v('--sage', '#6f8f72') };
    }
    const pal = palette.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const all = pathsOf();
    const { dots, place, chosen } = state.current;
    const sx = (x: number) => (x - c.x) * c.z + w / 2;
    const sy = (y: number) => (y - c.y) * c.z + h / 2;

    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = pal.water;
    g.fillRect(0, 0, w, h);
    g.setTransform(dpr * c.z, 0, 0, dpr * c.z, dpr * (w / 2 - c.x * c.z), dpr * (h / 2 - c.y * c.z));
    g.fillStyle = pal.land;
    g.fill(land!);
    for (const [codes, alpha] of [
      [chosen, 0.26],
      [place ? [place] : [], 0.16],
    ] as const) {
      g.fillStyle = pal.accent;
      g.globalAlpha = alpha;
      for (const code of codes) {
        const p = all.get(code);
        if (p) g.fill(p);
      }
    }
    g.globalAlpha = 1;
    g.strokeStyle = pal.border;
    g.lineWidth = 0.8 / c.z;
    g.stroke(land!);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const labels: Array<{ text: string; x: number; y: number }> = [];
    for (const d of dots) {
      const x = sx(d.x);
      const y = sy(d.y);
      if (x < -20 || y < -20 || x > w + 20 || y > h + 20) continue;
      const on = chosen.includes(d.code) || d.code === place;
      const r = d.count > 1 ? 9 : 6;
      g.globalAlpha = 1;
      g.fillStyle = d.best <= 1 ? pal.accent : d.best <= 2 ? pal.accent : pal.sage;
      g.globalAlpha = d.best <= 2 ? 1 : 0.75;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      if (on || hover.current === d.code) {
        g.globalAlpha = 0.5;
        g.strokeStyle = pal.accent;
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(x, y, r + 4, 0, Math.PI * 2);
        g.stroke();
        labels.push({ text: placeName(d.code), x, y: y + r + 15 });
      }
      g.globalAlpha = 1;
      if (d.count > 1) {
        g.fillStyle = pal.onAccent;
        g.font = `700 10.5px ${FONT}`;
        g.fillText(String(d.count), x, y + 0.5);
      }
    }
    g.font = `650 12px ${FONT}`;
    g.lineWidth = 3;
    for (const l of labels) {
      g.strokeStyle = pal.water;
      g.strokeText(l.text, l.x, l.y);
      g.fillStyle = pal.ink;
      g.fillText(l.text, l.x, l.y);
    }
    if (again) schedule();
  }

  const drawRef = useRef(draw);
  drawRef.current = draw;
  function schedule() {
    if (!frame.current) frame.current = requestAnimationFrame((t) => drawRef.current(t));
  }
  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    },
    [],
  );

  const flyTo = (to: Camera, ms = 650) => {
    const { w, h } = sizeRef.current;
    anim.current = { from: cam.current ?? home(w, h), to: clampCamera(to, w, h), start: performance.now(), ms };
    schedule();
  };

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setSize({ w: Math.round(entry.contentRect.width), h: Math.round(entry.contentRect.height) }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size.w || !size.h) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
    cam.current = cam.current ? clampCamera(cam.current, size.w, size.h) : null;
    palette.current = null;
    schedule();
  }, [size]);
  useEffect(() => {
    palette.current = null;
    schedule();
  }, [dots, place, chosen]);
  // A new theme changes the colours.
  useEffect(() => {
    const observer = new MutationObserver(() => {
      palette.current = null;
      schedule();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Fly to the language chosen, or back out when nothing is.
  useEffect(() => {
    const { w, h } = sizeRef.current;
    if (!w || !h) return;
    if (!chosen.length) return flyTo(home(w, h));
    const points = chosen.map((code) => BY_CODE.get(code)!.label);
    const box = boxAround(points, 14);
    if (box) flyTo(fitBox(box, w, h, 0.3));
  }, [selected, size.w > 0]);

  // Gestures: drag to move, two fingers or ctrl and the wheel to zoom.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: boolean; pinch: number; startX: number; startY: number }>({ moved: false, pinch: 0, startX: 0, startY: 0 });
  const dotAt = (px: number, py: number): Dot | null => {
    const { w, h } = sizeRef.current;
    const c = cam.current ?? home(w, h);
    let best: Dot | null = null;
    let near = 22;
    for (const d of state.current.dots) {
      const dist = Math.hypot((d.x - c.x) * c.z + w / 2 - px, (d.y - c.y) * c.z + h / 2 - py);
      if (dist < near) {
        near = dist;
        best = d;
      }
    }
    return best;
  };
  const countryAt = (px: number, py: number): string | null => {
    const g = canvasRef.current?.getContext('2d');
    const { w, h } = sizeRef.current;
    const c = cam.current ?? home(w, h);
    if (!g) return null;
    const wx = (px - w / 2) / c.z + c.x;
    const wy = (py - h / 2) / c.z + c.y;
    for (const [code, p] of pathsOf()) if (g.isPointInPath(p, wx, wy)) return code;
    return null;
  };
  const local = (e: { clientX: number; clientY: number }) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const zoomAt = (factor: number, px: number, py: number) => {
    const { w, h } = sizeRef.current;
    const c = anim.current?.to ?? cam.current ?? home(w, h);
    const z = Math.max(minZoom(w, h), Math.min(maxZoom(w) / 10, c.z * factor));
    const wx = (px - w / 2) / c.z + c.x;
    const wy = (py - h / 2) / c.z + c.y;
    flyTo({ x: wx - (px - w / 2) / z, y: wy - (py - h / 2) / z, z }, 160);
  };

  return (
    <div ref={boxRef} className="relative h-full w-full touch-none overflow-hidden rounded-3xl border border-line bg-sunken select-none">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="World map with a dot where each language is spoken. The list beside it has the same languages."
        style={{ width: size.w, height: size.h }}
        className="block cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture?.(e.pointerId);
          const p = local(e);
          pointers.current.set(e.pointerId, p);
          gesture.current = { moved: false, pinch: pointers.current.size === 2 ? 1 : 0, startX: p.x, startY: p.y };
          anim.current = null;
        }}
        onPointerMove={(e) => {
          const p = local(e);
          const last = pointers.current.get(e.pointerId);
          if (!last) {
            const d = e.pointerType === 'mouse' ? dotAt(p.x, p.y) : null;
            if ((d?.code ?? null) !== hover.current) {
              hover.current = d?.code ?? null;
              schedule();
            }
            return;
          }
          const { w, h } = sizeRef.current;
          const c = cam.current ?? home(w, h);
          if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            const before = Math.hypot(a.x - b.x, a.y - b.y);
            pointers.current.set(e.pointerId, p);
            const [a2, b2] = [...pointers.current.values()];
            const after = Math.hypot(a2.x - b2.x, a2.y - b2.y);
            gesture.current.moved = true;
            if (before > 0) {
              const z = Math.max(minZoom(w, h), Math.min(maxZoom(w) / 10, c.z * (after / before)));
              cam.current = clampCamera({ ...c, z }, w, h);
              schedule();
            }
            return;
          }
          if (Math.hypot(p.x - gesture.current.startX, p.y - gesture.current.startY) > 5) gesture.current.moved = true;
          if (gesture.current.moved) {
            cam.current = clampCamera({ x: c.x - (p.x - last.x) / c.z, y: c.y - (p.y - last.y) / c.z, z: c.z }, w, h);
            schedule();
          }
          pointers.current.set(e.pointerId, p);
        }}
        onPointerUp={(e) => {
          const p = local(e);
          const wasTap = !gesture.current.moved && pointers.current.size === 1;
          pointers.current.delete(e.pointerId);
          if (!wasTap) return;
          const d = dotAt(p.x, p.y);
          const code = d?.code ?? countryAt(p.x, p.y);
          onPlace(code && code !== place ? code : null);
        }}
        onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
        onPointerLeave={() => {
          if (hover.current) {
            hover.current = null;
            schedule();
          }
        }}
        onWheel={(e) => {
          if (!e.ctrlKey && !e.metaKey) return;
          const p = local(e);
          zoomAt(e.deltaY < 0 ? 1.4 : 1 / 1.4, p.x, p.y);
        }}
      />
      <div className="absolute right-2 bottom-2 flex flex-col gap-1.5">
        {(
          [
            ['Zoom in', Plus, () => zoomAt(1.8, size.w / 2, size.h / 2)],
            ['Zoom out', Minus, () => zoomAt(1 / 1.8, size.w / 2, size.h / 2)],
            ['Whole world', Globe2, () => flyTo(home(size.w, size.h))],
          ] as const
        ).map(([label, Icon, run]) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            title={label}
            onClick={run}
            className="grid size-9 place-items-center rounded-xl border border-line bg-raised/95 text-ink-soft shadow-elev-1 backdrop-blur transition-colors hover:text-ink active:scale-95 pointer-coarse:size-10"
          >
            <Icon size={16} aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}
