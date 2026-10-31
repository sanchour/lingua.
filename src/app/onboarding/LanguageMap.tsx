import { UiText, useUi } from '@/design/i18n/UiText';
// The picker's map (Lingua 5.1-2b): the world drawn quietly, without dots. Hovering a country lifts
// it and shows a small card with Lingua's languages there; clicking one that has any filters the
// overview to them. A language hovered or chosen in the
// overview tints its countries: solid where it is official, lighter where regional, a fine hatch
// for minority and historical places. It draws Radio's countries with Radio's camera arithmetic.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Globe2, Minus, Plus } from 'lucide-react';
import { getLanguage } from '@/core/lang/languages';
import { languagesIn, placesOf, STATUS_NAME } from '@/data/territories';
import type { PlaceStatus } from '@/data/territories';
import { LanguageFlag } from '@/design/flags';
import { between, boxAround, clampCamera, decodeCountries, fitBox, latToY, lonToX, maxZoom, minZoom } from '@/features/sonus/radio/sky';
import type { Camera } from '@/features/sonus/radio/sky';
import { WORLD_MAP } from '@/features/sonus/radio/worldMap';

const COUNTRIES = decodeCountries(WORLD_MAP);
const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));
/** The countries a language of Lingua's is spoken in: the only ones a click filters to. */
const LIVE = new Set(COUNTRIES.filter((c) => languagesIn(c.code).length).map((c) => c.code));

let paths: Map<string, Path2D> | null = null;
let land: Path2D | null = null;
let quiet: Path2D | null = null;
/** Each country's bounds in world units, so the pointer only tests the few it could be in. */
const bounds = new Map<string, [number, number, number, number]>();
function pathsOf(): Map<string, Path2D> {
  if (paths) return paths;
  paths = new Map();
  land = new Path2D();
  quiet = new Path2D();
  for (const c of COUNTRIES) {
    const p = new Path2D();
    const b: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const ring of c.rings) {
      ring.forEach(([x, y], i) => {
        if (i) p.lineTo(x, y);
        else p.moveTo(x, y);
        b[0] = Math.min(b[0], x);
        b[1] = Math.min(b[1], y);
        b[2] = Math.max(b[2], x);
        b[3] = Math.max(b[3], y);
      });
      p.closePath();
    }
    bounds.set(c.code, b);
    paths.set(c.code, p);
    land.addPath(p);
    if (!LIVE.has(c.code)) quiet.addPath(p);
  }
  return paths;
}

/** A country's name in English, from the browser. */
const names = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;
export const placeName = (code: string): string => {
  try {
    return names?.of(code) ?? code;
  } catch {
    return code;
  }
};

/** The map opens on the inhabited world, 72° north to 48° south, so a wide box is filled rather than framed in sea. */
const HOME_TOP = latToY(72);
const HOME_BOTTOM = latToY(-48);

/** How strongly each status tints a country (minority and historical are hatched instead). */
const TINT: Record<Exclude<PlaceStatus, 'widely'>, number> = { official: 0.5, regional: 0.28, minority: 0, historical: 0 };
/** The smallest box a country is flown to, in world units (about 5° wide), so Andorra doesn't fill the map. */
const SMALLEST = 0.014;

interface LanguageMapProps {
  /** The language hovered or chosen in the overview: its countries are tinted. */
  highlight: string | null;
  /** The language chosen: the map flies to where it is official or regional. */
  selected: string | null;
  /** The country clicked, whose languages the overview shows. */
  place: string | null;
  onPlace: (code: string | null) => void;
  /** Pixels on the right covered by a panel: flights centre on the part still showing. */
  inset?: number;
}

export function LanguageMap({ highlight, selected, place, onPlace, inset = 0 }: LanguageMapProps) {
  const translateUi = useUi();
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const sizeRef = useRef(size);
  sizeRef.current = size;
  /** The country under the pointer; its card follows the pointer by transform, without re-rendering. */
  const [card, setCard] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const cardAt = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // Everything the drawing needs lives in refs, so gestures never wait for React.
  const cam = useRef<Camera | null>(null);
  const anim = useRef<{ from: Camera; to: Camera; start: number; ms: number } | null>(null);
  const frame = useRef(0);
  const hover = useRef<string | null>(null);
  const palette = useRef<{ water: string; land: string; quiet: string; border: string; accent: string; hatch: CanvasPattern | null } | null>(null);
  // Tinted only where the language has a standing (official, regional, minority, historical); where
  // it is merely widely spoken it shows on the country's card, not in colour.
  const tinted = useMemo(
    () => (highlight ? placesOf(highlight).flatMap((p) => (p.status !== 'widely' && BY_CODE.has(p.country) ? [{ country: p.country, status: p.status }] : [])) : []),
    [highlight],
  );
  const state = useRef({ tinted, place });
  state.current = { tinted, place };

  const home = (w: number, h: number): Camera => clampCamera({ x: 0.5, y: (HOME_TOP + HOME_BOTTOM) / 2, z: Math.max(minZoom(w, h), Math.min(w, h / (HOME_BOTTOM - HOME_TOP))) }, w, h);

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
      const accent = v('--accent', '#c86d51');
      // A fine diagonal hatch in the accent, for minority and historical places.
      const tile = document.createElement('canvas');
      tile.width = tile.height = 8;
      const t = tile.getContext('2d');
      if (t) {
        t.strokeStyle = accent;
        t.globalAlpha = 0.75;
        t.lineWidth = 1.4;
        t.beginPath();
        t.moveTo(-2, 10);
        t.lineTo(10, -2);
        t.stroke();
      }
      palette.current = { water: v('--sunken', '#e8dfcf'), land: v('--raised', '#fffbf4'), quiet: v('--surface', '#f3ece1'), border: v('--line-strong', '#cbbfae'), accent, hatch: t ? g.createPattern(tile, 'repeat') : null };
    }
    const pal = palette.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const all = pathsOf();
    const { tinted, place } = state.current;

    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = pal.water;
    g.fillRect(0, 0, w, h);
    g.setTransform(dpr * c.z, 0, 0, dpr * c.z, dpr * (w / 2 - c.x * c.z), dpr * (h / 2 - c.y * c.z));
    g.fillStyle = pal.land;
    g.fill(land!);
    // Countries without a language of Lingua's stay flat, a shade back.
    g.fillStyle = pal.quiet;
    g.fill(quiet!);
    for (const p of tinted) {
      const path = all.get(p.country);
      if (!path) continue;
      if (TINT[p.status]) {
        g.globalAlpha = TINT[p.status];
        g.fillStyle = pal.accent;
        g.fill(path);
      } else if (pal.hatch) {
        g.globalAlpha = 1;
        pal.hatch.setTransform(new DOMMatrix().scale(1 / c.z));
        g.fillStyle = pal.hatch;
        g.fill(path);
      }
    }
    g.globalAlpha = 1;
    g.strokeStyle = pal.border;
    g.lineWidth = 0.7 / c.z;
    g.stroke(land!);
    // The country pointed at is lifted; the one clicked keeps an outline.
    for (const [code, alpha] of [
      [hover.current, 0.12],
      [place, 0.08],
    ] as const) {
      const path = code ? all.get(code) : undefined;
      if (!path) continue;
      g.globalAlpha = alpha;
      g.fillStyle = pal.accent;
      g.fill(path);
      g.globalAlpha = 0.9;
      g.strokeStyle = pal.accent;
      g.lineWidth = 1.4 / c.z;
      g.stroke(path);
    }
    g.globalAlpha = 1;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
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
  useEffect(() => schedule(), [tinted, place]);
  // A new light or palette changes the colours.
  useEffect(() => {
    const observer = new MutationObserver(() => {
      palette.current = null;
      schedule();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'data-palette'] });
    return () => observer.disconnect();
  }, []);

  // What the map last centred on: the country clicked, or the language chosen (whichever came last).
  const focus = useRef<'place' | 'language'>('language');
  useEffect(() => {
    if (place) focus.current = 'place';
  }, [place]);
  useEffect(() => {
    focus.current = 'language';
  }, [selected]);
  // Centre on it in the part of the map no panel covers: the country clicked, else where the chosen
  // language is official or regional, else the whole world; again when the window changes size.
  useEffect(() => {
    const { w, h } = sizeRef.current;
    if (!w || !h) return;
    const fit = (box: { x0: number; y0: number; x1: number; y1: number }, padding: number) => {
      const c = fitBox(box, w - inset, h, padding);
      flyTo({ ...c, x: c.x + inset / 2 / c.z });
    };
    const country = place ? BY_CODE.get(place) : undefined;
    if (focus.current === 'place' && country) {
      const { x0, y0, x1, y1 } = country.main;
      const [cx, cy] = [(x0 + x1) / 2, (y0 + y1) / 2];
      const [hw, hh] = [Math.max(SMALLEST, x1 - x0) / 2, Math.max(SMALLEST, y1 - y0) / 2];
      return fit({ x0: cx - hw, y0: cy - hh, x1: cx + hw, y1: cy + hh }, 0.4);
    }
    const where = selected ? placesOf(selected).filter((p) => (p.status === 'official' || p.status === 'regional' || p.status === 'historical') && BY_CODE.has(p.country)) : [];
    if (!where.length) return flyTo(home(w, h));
    const box = boxAround(
      where.slice(0, 12).map((p) => BY_CODE.get(p.country)!.label),
      14,
    );
    if (box) fit(box, 0.3);
  }, [selected, place, size.w, size.h, inset]);

  // Gestures: drag to move, two fingers or ctrl and the wheel to zoom.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: boolean; startX: number; startY: number }>({ moved: false, startX: 0, startY: 0 });
  /**
   * The country under the pointer, one with a language of Lingua's first; tiny ones (Andorra, Malta)
   * answer from a little way off.
   */
  const countryAt = (px: number, py: number): string | null => {
    const g = canvasRef.current?.getContext('2d');
    const { w, h } = sizeRef.current;
    const c = cam.current ?? home(w, h);
    if (!g) return null;
    const wx = (px - w / 2) / c.z + c.x;
    const wy = (py - h / 2) / c.z + c.y;
    let inside: string | null = null;
    // The paths are in world units: test them untransformed (the drawing leaves the pixel-ratio scale set).
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    for (const [code, p] of pathsOf()) {
      const b = bounds.get(code)!;
      if (wx < b[0] || wx > b[2] || wy < b[1] || wy > b[3] || !g.isPointInPath(p, wx, wy)) continue;
      inside = code;
      if (LIVE.has(code)) break;
    }
    g.restore();
    if (inside && LIVE.has(inside)) return inside;
    let best: string | null = null;
    let near = 10;
    for (const code of LIVE) {
      const { lon, lat } = BY_CODE.get(code)!.label;
      const d = Math.hypot((lonToX(lon) - c.x) * c.z + w / 2 - px, (latToY(lat) - c.y) * c.z + h / 2 - py);
      if (d < near && code !== inside) {
        near = d;
        best = code;
      }
    }
    return best ?? inside;
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
  /** Moves the card beside the pointer, kept inside the map. */
  const placeCard = () => {
    const el = cardRef.current;
    if (!el) return;
    const { w, h } = sizeRef.current;
    const at = cardAt.current;
    el.style.transform = `translate3d(${Math.max(8, Math.min(at.x + 14, w - at.w - 8))}px, ${Math.max(8, Math.min(at.y + 14, h - at.h - 8))}px, 0)`;
  };
  const setHover = (code: string | null, x = 0, y = 0) => {
    cardAt.current.x = x;
    cardAt.current.y = y;
    if (code === hover.current) return placeCard();
    hover.current = code;
    schedule();
    setCard(code);
  };
  // A new card is measured once, before it paints; moving it after that reads no layout.
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    cardAt.current.w = el.offsetWidth;
    cardAt.current.h = el.offsetHeight;
    placeCard();
  }, [card]);

  const spoken = card ? languagesIn(card).slice(0, 5) : [];

  return (
    <div ref={boxRef} className="relative h-full w-full touch-none overflow-hidden rounded-3xl border border-line bg-sunken select-none">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={translateUi('World map: the countries where Lingua’s languages are spoken. The overview below has the same languages.')}
        style={{ width: size.w, height: size.h }}
        className={card && LIVE.has(card) ? 'block cursor-pointer' : 'block cursor-grab active:cursor-grabbing'}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture?.(e.pointerId);
          const p = local(e);
          pointers.current.set(e.pointerId, p);
          gesture.current = { moved: false, startX: p.x, startY: p.y };
          anim.current = null;
        }}
        onPointerMove={(e) => {
          const p = local(e);
          const last = pointers.current.get(e.pointerId);
          if (!last) {
            if (e.pointerType === 'mouse') setHover(countryAt(p.x, p.y), p.x, p.y);
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
            setHover(null);
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
          const code = countryAt(p.x, p.y);
          if (!code || !LIVE.has(code)) return;
          // The map is about to fly: the card would point at the wrong country.
          setHover(null);
          onPlace(code !== place ? code : null);
        }}
        onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
        onPointerLeave={() => setHover(null)}
        onWheel={(e) => {
          if (!e.ctrlKey && !e.metaKey) return;
          const p = local(e);
          zoomAt(e.deltaY < 0 ? 1.4 : 1 / 1.4, p.x, p.y);
        }}
      />
      {card && (
        <div ref={cardRef} className="pointer-events-none absolute top-0 left-0 z-10 w-56 rounded-2xl border border-line bg-raised p-3 shadow-elev-2 will-change-transform">
          <p className="mb-1.5 text-[13px] font-bold">{placeName(card)}</p>
          {!spoken.length && <p className="text-[12.5px] text-ink-faint"><UiText source={'None of Lingua’s languages yet.'} /></p>}
          <ul className="space-y-1">
            {spoken.map((l) => (
              <li key={l.lang} className="flex items-center gap-2 text-[13px]">
                <LanguageFlag lang={l.lang} width={18} />
                <span className="min-w-0 flex-1 truncate">{getLanguage(l.lang)?.name}</span>
                <span className="shrink-0 text-[11px] text-ink-faint"><UiText source={STATUS_NAME[l.status]} /></span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="absolute bottom-3 left-3 flex flex-col gap-1.5">
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
            aria-label={translateUi(label)}
            title={label}
            onClick={run}
            className="grid size-9 place-items-center rounded-xl border border-line bg-raised/95 text-ink-soft shadow-elev-1 backdrop-blur transition-colors hover:text-ink active:scale-95"
          >
            <Icon size={16} aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}
