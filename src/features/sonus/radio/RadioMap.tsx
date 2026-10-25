import { useEffect, useMemo, useRef, useState } from 'react';
import { Globe2, LocateFixed, Minus, Plus, Radio } from 'lucide-react';
import type { RadioStation } from '@/data/types';
import type { Place } from '@/services/radio/stations';
import { between, boxAround, clampCamera, decodeCountries, fitBox, latToY, lonToX, maxZoom, minZoom, WORLD_BOTTOM, WORLD_TOP } from './sky';
import type { Box, Camera } from './sky';
import { WORLD_MAP } from './worldMap';

const COUNTRIES = decodeCountries(WORLD_MAP);
const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

/** One Path2D per country, and all of them as one, made the first time the map is drawn (Path2D is browser-only). */
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

interface Palette {
  water: string;
  land: string;
  border: string;
  accent: string;
  onAccent: string;
  ink: string;
  faint: string;
}

function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return { water: v('--sunken', '#e8dfcf'), land: v('--raised', '#fffbf4'), border: v('--line-strong', '#cbbfae'), accent: v('--accent', '#c86d51'), onAccent: v('--on-accent', '#ffffff'), ink: v('--ink', '#2b2420'), faint: v('--ink-faint', '#776c63') };
}

const FONT = "'Plus Jakarta Sans Variable', 'Inter Variable', system-ui, sans-serif";

export interface MapCountry {
  code: string;
  name: string;
  count: number;
}

interface Node extends MapCountry {
  x: number;
  y: number;
  r: number;
}

interface RadioMapProps {
  stations: RadioStation[];
  places: Place[];
  countries: MapCountry[];
  /** The country chosen (on the map or in the chips): the map flies to it. */
  country: string | null;
  place: string | null;
  /** The station playing now, which sends out a pulse. */
  playing?: { lat: number; lon: number } | null;
  onCountry: (code: string | null) => void;
  onPlace: (place: Place | null) => void;
  caption: string;
}

const nodeRadius = (count: number) => 7.5 + Math.min(8, Math.log2(count) * 1.5);

/** Nodes that would overlap on screen, as one: the largest country's place, everyone's stations. */
interface Cluster {
  x: number;
  y: number;
  r: number;
  count: number;
  members: Node[];
}

function clusterNodes(nodes: Node[], at: (n: Node) => [number, number]): Cluster[] {
  const clusters: Cluster[] = [];
  for (const n of nodes) {
    const [x, y] = at(n);
    const r = nodeRadius(n.count);
    const near = clusters.find((c) => Math.hypot(c.x - x, c.y - y) < c.r + r + 3);
    if (near) {
      near.count += n.count;
      near.members.push(n);
      near.r = nodeRadius(near.count);
    } else clusters.push({ x, y, r, count: n.count, members: [n] });
  }
  return clusters;
}
const placeRadius = (p: Place) => 3 + Math.min(5, Math.log2(p.stations.length + 1) * 1.3);

/** The box a country is shown in: its mainland, and its stations near it (not far islands). */
function countryBox(code: string, stations: RadioStation[]): Box | null {
  const country = BY_CODE.get(code);
  const own = stations.filter((s) => s.countryCode === code && s.lat !== undefined && s.lon !== undefined);
  if (!country) return boxAround(own.map((s) => ({ lat: s.lat!, lon: s.lon! })), 4);
  const m = country.main;
  const box = { ...m };
  const growX = (m.x1 - m.x0) * 0.5;
  const growY = (m.y1 - m.y0) * 0.5;
  for (const s of own) {
    const x = lonToX(s.lon!);
    const y = latToY(s.lat!);
    if (x < m.x0 - growX || x > m.x1 + growX || y < m.y0 - growY || y > m.y1 + growY) continue;
    box.x0 = Math.min(box.x0, x);
    box.x1 = Math.max(box.x1, x);
    box.y0 = Math.min(box.y0, y);
    box.y1 = Math.max(box.y1, y);
  }
  return box;
}

/**
 * Sonus › Radio's map: the world's countries in the app's own colours, the countries where the
 * language is on air tinted, each with a node sending out rings; closer in, the places with
 * stations. Drag, pinch, scroll or double-tap to move and zoom. Drawn on one canvas, once per frame
 * and only when something changes.
 */
export function RadioMap({ stations, places, countries, country, place, playing, onCountry, onPlace, caption }: RadioMapProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pingRef = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const sizeRef = useRef(size);
  sizeRef.current = size;

  // One node per country: where its stations are (their middle), or the country's own label point.
  const nodes = useMemo<Node[]>(
    () =>
      countries
        .map((c) => {
        const shape = BY_CODE.get(c.code);
        const own = stations.filter((s) => s.countryCode === c.code && s.lat !== undefined && s.lon !== undefined);
        let x = shape ? lonToX(shape.label.lon) : 0.5;
        let y = shape ? latToY(shape.label.lat) : 0.5;
        if (own.length) {
          const xs = own.map((s) => lonToX(s.lon!)).sort((a, b) => a - b);
          const ys = own.map((s) => latToY(s.lat!)).sort((a, b) => a - b);
          const mx = xs[xs.length >> 1];
          const my = ys[ys.length >> 1];
          const m = shape?.main;
          if (!m || (mx >= m.x0 && mx <= m.x1 && my >= m.y0 && my <= m.y1)) [x, y] = [mx, my];
        }
        return { ...c, x, y, r: nodeRadius(c.count) };
      })
      .sort((a, b) => b.count - a.count),
    [countries, stations],
  );

  // The view that shows where the language is on air.
  const home = useMemo(() => {
    const points = [...stations.filter((s) => s.lat !== undefined && s.lon !== undefined).map((s) => ({ lat: s.lat!, lon: s.lon! }))];
    for (const c of countries) {
      const shape = BY_CODE.get(c.code);
      if (shape) for (let i = 0; i < Math.min(c.count, 20); i++) points.push(shape.label);
    }
    return boxAround(points, 12);
  }, [stations, countries]);

  // Everything the drawing needs, kept in refs so gestures never wait for React.
  const cam = useRef<Camera | null>(null);
  const anim = useRef<{ from: Camera; to: Camera; start: number; ms: number } | null>(null);
  const drift = useRef<{ vx: number; vy: number; at: number } | null>(null);
  const hover = useRef<string | null>(null);
  /** The nodes as last drawn, for taps. */
  const drawn = useRef<Cluster[]>([]);
  const palette = useRef<Palette | null>(null);
  const frame = useRef(0);
  const state = useRef({ nodes, places, country, place, playing, onAir: new Set<string>() });
  state.current = { nodes, places, country, place, playing, onAir: new Set(countries.map((c) => c.code)) };

  const air = useMemo(() => {
    if (typeof Path2D === 'undefined') return null;
    const all = pathsOf();
    const p = new Path2D();
    for (const c of countries) {
      const shape = all.get(c.code);
      if (shape) p.addPath(shape);
    }
    return p;
  }, [countries]);
  const airRef = useRef(air);
  airRef.current = air;

  const fitHome = (w: number, h: number): Camera => (home ? fitBox(home, w, h) : clampCamera({ x: 0.5, y: (WORLD_TOP + WORLD_BOTTOM) / 2, z: minZoom(w, h) }, w, h));

  function draw(now: number) {
    frame.current = 0;
    const canvas = canvasRef.current;
    const g = canvas?.getContext('2d');
    const { w, h } = sizeRef.current;
    if (!canvas || !g || !w || !h) return;
    let c = cam.current ?? fitHome(w, h);
    let again = false;
    if (anim.current) {
      const t = Math.min(1, (now - anim.current.start) / anim.current.ms);
      c = between(anim.current.from, anim.current.to, t);
      if (t >= 1) anim.current = null;
      else again = true;
    } else if (drift.current) {
      const d = drift.current;
      const dt = Math.min(48, now - d.at);
      c = clampCamera({ x: c.x - (d.vx * dt) / c.z, y: c.y - (d.vy * dt) / c.z, z: c.z }, w, h);
      const decay = 0.9 ** (dt / 16);
      d.vx *= decay;
      d.vy *= decay;
      d.at = now;
      if (Math.hypot(d.vx, d.vy) < 0.02) drift.current = null;
      else again = true;
    }
    cam.current = c;

    const pal = (palette.current ??= readPalette());
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const all = pathsOf();
    const { nodes, places, country, place, playing } = state.current;
    const sx = (x: number) => (x - c.x) * c.z + w / 2;
    const sy = (y: number) => (y - c.y) * c.z + h / 2;

    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = pal.water;
    g.fillRect(0, 0, w, h);

    // A faint grid of meridians and parallels, like a navigator's chart.
    g.strokeStyle = pal.faint;
    g.globalAlpha = 0.14;
    g.lineWidth = 1;
    g.beginPath();
    const step = c.z > w * 24 ? 5 : c.z > w * 6 ? 10 : 30;
    for (let lon = -180; lon <= 180; lon += step) {
      const x = sx(lonToX(lon));
      if (x < 0 || x > w) continue;
      g.moveTo(x, 0);
      g.lineTo(x, h);
    }
    for (let lat = -60; lat <= 80; lat += step) {
      const y = sy(latToY(lat));
      if (y < 0 || y > h) continue;
      g.moveTo(0, y);
      g.lineTo(w, y);
    }
    g.stroke();
    g.globalAlpha = 1;

    // The countries, in world units.
    g.setTransform(dpr * c.z, 0, 0, dpr * c.z, dpr * (w / 2 - c.x * c.z), dpr * (h / 2 - c.y * c.z));
    g.fillStyle = pal.land;
    g.fill(land!);
    if (airRef.current) {
      g.fillStyle = pal.accent;
      g.globalAlpha = 0.2;
      g.fill(airRef.current);
    }
    for (const [code, alpha] of [
      [hover.current, 0.14],
      [country, 0.22],
    ] as const) {
      const p = code ? all.get(code) : undefined;
      if (!p) continue;
      g.fillStyle = pal.accent;
      g.globalAlpha = alpha;
      g.fill(p);
    }
    g.globalAlpha = 1;
    g.strokeStyle = pal.border;
    g.lineWidth = 0.8 / c.z;
    g.stroke(land!);
    if (country && all.get(country)) {
      g.strokeStyle = pal.accent;
      g.lineWidth = 1.6 / c.z;
      g.stroke(all.get(country)!);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Closer in, the places take over from the countries' nodes.
    const closeness = Math.max(0, Math.min(1, (Math.log2(c.z / minZoom(w, h)) - 2.4) / 1.3));
    const clusters = closeness < 1 ? clusterNodes(nodes, (n) => [sx(n.x), sy(n.y)]) : [];
    drawn.current = clusters;
    if (closeness < 1) {
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const labels: Array<{ name: string; x: number; y: number; first: boolean }> = [];
      for (const k of clusters) {
        const { x, y, r } = k;
        if (x < -40 || y < -40 || x > w + 40 || y > h + 40) continue;
        const chosen = k.members.some((m) => m.code === country);
        // The signal: two thin rings around the node.
        g.strokeStyle = pal.accent;
        g.lineWidth = 1.1;
        for (const [gap, a] of [
          [4, chosen ? 0.6 : 0.36],
          [8, chosen ? 0.3 : 0.14],
        ] as const) {
          g.globalAlpha = a * (1 - closeness);
          g.beginPath();
          g.arc(x, y, r + gap, 0, Math.PI * 2);
          g.stroke();
        }
        g.globalAlpha = 1 - closeness;
        g.fillStyle = pal.accent;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
        if (k.members.length > 1) {
          // Several countries here: a thin white ring says "more inside".
          g.strokeStyle = pal.onAccent;
          g.globalAlpha = 0.7 * (1 - closeness);
          g.lineWidth = 1.2;
          g.beginPath();
          g.arc(x, y, r - 2.5, 0, Math.PI * 2);
          g.stroke();
          g.globalAlpha = 1 - closeness;
        }
        g.fillStyle = pal.onAccent;
        g.font = `700 ${r > 13 ? 12 : 11}px ${FONT}`;
        g.fillText(String(k.count), x, y + 0.5);
        const one = k.members.length === 1 ? k.members[0] : null;
        const hovered = k.members.some((m) => m.code === hover.current);
        const name = one ? one.name : hovered ? `${k.members[0].name} +${k.members.length - 1}` : null;
        if (name && (chosen || hovered || c.z > minZoom(w, h) * 2.2)) labels.push({ name, x, y: y + r + 16, first: chosen || hovered });
      }
      // Names last, over the nodes; the chosen or hovered one first, then the largest, and none on top of another.
      g.globalAlpha = 1 - closeness;
      g.font = `650 12px ${FONT}`;
      g.lineWidth = 3;
      const taken = clusters.map((k): [number, number, number, number] => [k.x - k.r, k.y - k.r, k.x + k.r, k.y + k.r]);
      for (const l of [...labels.filter((l) => l.first), ...labels.filter((l) => !l.first)]) {
        const half = g.measureText(l.name).width / 2 + 3;
        const box: [number, number, number, number] = [l.x - half, l.y - 8, l.x + half, l.y + 8];
        if (box[0] < 4 || box[2] > w - 4 || taken.some((t) => box[0] < t[2] && box[2] > t[0] && box[1] < t[3] && box[3] > t[1])) continue;
        taken.push(box);
        g.strokeStyle = pal.water;
        g.strokeText(l.name, l.x, l.y);
        g.fillStyle = pal.ink;
        g.fillText(l.name, l.x, l.y);
      }
      g.globalAlpha = 1;
    }
    if (closeness > 0) {
      g.globalAlpha = closeness;
      g.fillStyle = pal.accent;
      g.shadowColor = pal.accent;
      g.shadowBlur = 8;
      for (const p of places) {
        const x = sx(lonToX(p.lon));
        const y = sy(latToY(p.lat));
        if (x < -10 || y < -10 || x > w + 10 || y > h + 10) continue;
        g.beginPath();
        g.arc(x, y, placeRadius(p), 0, Math.PI * 2);
        g.fill();
      }
      g.shadowBlur = 0;
      const chosen = places.find((p) => p.key === place);
      if (chosen) {
        const x = sx(lonToX(chosen.lon));
        const y = sy(latToY(chosen.lat));
        g.strokeStyle = pal.ink;
        g.lineWidth = 2;
        g.beginPath();
        g.arc(x, y, placeRadius(chosen) + 5, 0, Math.PI * 2);
        g.stroke();
        g.font = `650 12.5px ${FONT}`;
        g.textAlign = 'center';
        g.lineWidth = 3;
        g.strokeStyle = pal.water;
        g.strokeText(chosen.label, x, y - placeRadius(chosen) - 14);
        g.fillStyle = pal.ink;
        g.fillText(chosen.label, x, y - placeRadius(chosen) - 14);
      }
      g.globalAlpha = 1;
    }

    // The station on air pulses where it is (a CSS animation, so the canvas stays still).
    const ping = pingRef.current;
    if (ping) {
      if (playing) {
        ping.style.display = 'block';
        ping.style.transform = `translate(${sx(lonToX(playing.lon)) - 14}px, ${sy(latToY(playing.lat)) - 14}px)`;
      } else ping.style.display = 'none';
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
    const from = cam.current ?? fitHome(w, h);
    drift.current = null;
    anim.current = { from, to: clampCamera(to, w, h), start: performance.now(), ms };
    schedule();
  };

  // Size, theme and anything shown change → draw again.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setSize({ w: Math.round(entry.contentRect.width), h: Math.round(entry.contentRect.height) }));
    observer.observe(el);
    const theme = new MutationObserver(() => {
      palette.current = null;
      schedule();
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-palette', 'style', 'class'] });
    return () => {
      observer.disconnect();
      theme.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size.w) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
    cam.current = cam.current ? clampCamera(cam.current, size.w, size.h) : fitHome(size.w, size.h);
    schedule();
  }, [size.w, size.h]);

  // A new language: start from where it's on air.
  const homeKey = home ? `${home.x0}:${home.y0}:${home.x1}:${home.y1}` : '';
  const firstHome = useRef(true);
  useEffect(() => {
    if (firstHome.current) {
      firstHome.current = false;
      return;
    }
    const { w, h } = sizeRef.current;
    if (w) flyTo(fitHome(w, h), 500);
  }, [homeKey]);

  // A country chosen anywhere: fly to it.
  useEffect(() => {
    const { w, h } = sizeRef.current;
    if (!country || !w) return;
    const box = countryBox(country, stations);
    if (box) flyTo(fitBox(box, w, h, 0.22));
  }, [country]);

  useEffect(() => schedule(), [nodes, places, country, place, playing, air]);

  // ── Gestures ──────────────────────────────────────────────────────────────
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ start: number; moved: number; last: { x: number; y: number; t: number }; v: { x: number; y: number }; pinch?: { d0: number; z0: number; wx: number; wy: number } } | null>(null);
  const lastTap = useRef<{ x: number; y: number; t: number } | null>(null);

  const local = (e: { clientX: number; clientY: number }) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const toWorld = (px: number, py: number, c: Camera) => {
    const { w, h } = sizeRef.current;
    return { wx: c.x + (px - w / 2) / c.z, wy: c.y + (py - h / 2) / c.z };
  };
  const zoomed = (c: Camera, px: number, py: number, factor: number): Camera => {
    const { w, h } = sizeRef.current;
    const { wx, wy } = toWorld(px, py, c);
    const z = Math.max(minZoom(w, h), Math.min(maxZoom(w), c.z * factor));
    return clampCamera({ x: wx - (px - w / 2) / z, y: wy - (py - h / 2) / z, z }, w, h);
  };

  /** What's under a point: a place (close in), a country's node, or a country with stations. */
  const hitAt = (px: number, py: number): { place?: Place; country?: string; cluster?: Node[] } | null => {
    const c = cam.current;
    const { w, h } = sizeRef.current;
    if (!c) return null;
    const { places, onAir } = state.current;
    const closeness = Math.max(0, Math.min(1, (Math.log2(c.z / minZoom(w, h)) - 2.4) / 1.3));
    const sx = (x: number) => (x - c.x) * c.z + w / 2;
    const sy = (y: number) => (y - c.y) * c.z + h / 2;
    if (closeness > 0.4) {
      let best: Place | null = null;
      let gap = 16;
      for (const p of places) {
        const d = Math.hypot(sx(lonToX(p.lon)) - px, sy(latToY(p.lat)) - py) - placeRadius(p);
        if (d < gap) [best, gap] = [p, d];
      }
      if (best) return { place: best };
    }
    if (closeness < 0.7) {
      for (const k of drawn.current) {
        if (Math.hypot(k.x - px, k.y - py) > k.r + 8) continue;
        return k.members.length === 1 ? { country: k.members[0].code } : { cluster: k.members };
      }
    }
    const g = canvasRef.current?.getContext('2d');
    if (!g) return null;
    const { wx, wy } = toWorld(px, py, c);
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    let found: string | undefined;
    for (const [code, p] of pathsOf()) {
      if (onAir.has(code) && g.isPointInPath(p, wx, wy)) {
        found = code;
        break;
      }
    }
    g.restore();
    return found ? { country: found } : null;
  };

  const choose = (hit: { place?: Place; country?: string; cluster?: Node[] } | null) => {
    if (hit?.cluster) {
      // Fly in until the countries come apart.
      const { w, h } = sizeRef.current;
      const boxes = hit.cluster.map((n) => countryBox(n.code, stations)).filter((b): b is Box => Boolean(b));
      if (boxes.length) flyTo(fitBox({ x0: Math.min(...boxes.map((b) => b.x0)), y0: Math.min(...boxes.map((b) => b.y0)), x1: Math.max(...boxes.map((b) => b.x1)), y1: Math.max(...boxes.map((b) => b.y1)) }, w, h, 0.12));
      return true;
    }
    if (hit?.place) {
      onPlace(hit.place);
      return true;
    }
    if (hit?.country) {
      onPlace(null);
      onCountry(hit.country);
      return true;
    }
    return false;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    // A touch stops a flight or a glide where it is.
    anim.current = null;
    drift.current = null;
    if (pointers.current.size === 1) gesture.current = { start: performance.now(), moved: 0, last: { ...p, t: performance.now() }, v: { x: 0, y: 0 } };
    else if (pointers.current.size === 2 && gesture.current && cam.current) {
      const [a, b] = [...pointers.current.values()];
      const mid = toWorld((a.x + b.x) / 2, (a.y + b.y) / 2, cam.current);
      gesture.current.pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: cam.current.z, ...mid };
      gesture.current.moved += 100;
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = local(e);
    if (!pointers.current.has(e.pointerId)) {
      // A mouse over the map: show what can be clicked.
      if (e.pointerType !== 'mouse') return;
      const hit = hitAt(p.x, p.y);
      e.currentTarget.style.cursor = hit ? 'pointer' : 'grab';
      const code = hit?.country ?? hit?.cluster?.[0].code ?? null;
      if (code !== hover.current) {
        hover.current = code;
        schedule();
      }
      return;
    }
    const before = pointers.current.get(e.pointerId)!;
    pointers.current.set(e.pointerId, p);
    const c = cam.current;
    const gst = gesture.current;
    const { w, h } = sizeRef.current;
    if (!c || !gst) return;
    if (pointers.current.size >= 2 && gst.pinch) {
      const [a, b] = [...pointers.current.values()];
      const z = Math.max(minZoom(w, h), Math.min(maxZoom(w), (gst.pinch.z0 * Math.hypot(a.x - b.x, a.y - b.y)) / gst.pinch.d0));
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      cam.current = clampCamera({ x: gst.pinch.wx - (mx - w / 2) / z, y: gst.pinch.wy - (my - h / 2) / z, z }, w, h);
    } else {
      const dx = p.x - before.x;
      const dy = p.y - before.y;
      gst.moved += Math.abs(dx) + Math.abs(dy);
      cam.current = clampCamera({ x: c.x - dx / c.z, y: c.y - dy / c.z, z: c.z }, w, h);
      const now = performance.now();
      const dt = Math.max(1, now - gst.last.t);
      gst.v = { x: 0.8 * ((p.x - gst.last.x) / dt) + 0.2 * gst.v.x, y: 0.8 * ((p.y - gst.last.y) / dt) + 0.2 * gst.v.y };
      gst.last = { ...p, t: now };
      if (e.pointerType === 'mouse') e.currentTarget.style.cursor = 'grabbing';
    }
    schedule();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = local(e);
    pointers.current.delete(e.pointerId);
    const gst = gesture.current;
    if (pointers.current.size > 0) {
      // One finger of a pinch lifted: carry on panning with the other, from where it is.
      if (gst) {
        gst.pinch = undefined;
        const [rest] = [...pointers.current.values()];
        gst.last = { ...rest, t: performance.now() };
        gst.v = { x: 0, y: 0 };
      }
      return;
    }
    gesture.current = null;
    if (e.pointerType === 'mouse') e.currentTarget.style.cursor = 'grab';
    if (!gst) return;
    const now = performance.now();
    if (gst.moved < 8 && now - gst.start < 400) {
      if (choose(hitAt(p.x, p.y))) return;
      // A double tap on the map zooms in there (a mouse has its own double click).
      const last = lastTap.current;
      if (e.pointerType !== 'mouse' && last && now - last.t < 320 && Math.hypot(last.x - p.x, last.y - p.y) < 32) {
        lastTap.current = null;
        if (cam.current) flyTo(zoomed(cam.current, p.x, p.y, 2), 320);
      } else lastTap.current = { ...p, t: now };
      onPlace(null);
      return;
    }
    // Let a quick drag glide on.
    if (now - gst.last.t < 80 && Math.hypot(gst.v.x, gst.v.y) > 0.08) {
      drift.current = { vx: gst.v.x, vy: gst.v.y, at: now };
      schedule();
    }
  };

  // The wheel zooms around the pointer, eased over a few frames.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const c = anim.current?.to ?? cam.current;
      if (!c) return;
      const p = local(e);
      const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : e.ctrlKey ? 0.01 : 0.0025));
      flyTo(zoomed(c, p.x, p.y, factor), 140);
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  const zoomBy = (factor: number) => {
    const { w, h } = sizeRef.current;
    const c = anim.current?.to ?? cam.current;
    if (c) flyTo(zoomed(c, w / 2, h / 2, factor), 360);
  };
  const world = () => {
    const { w, h } = sizeRef.current;
    flyTo({ x: 0.5, y: (WORLD_TOP + WORLD_BOTTOM) / 2, z: minZoom(w, h) });
  };

  const button = 'grid size-9 place-items-center rounded-full border border-line/70 bg-raised/90 text-ink-soft shadow-elev-1 backdrop-blur hover:text-ink active:scale-95';
  return (
    <div ref={boxRef} className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-line/70 bg-sunken">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Map: ${caption}`}
        className="absolute inset-0 size-full cursor-grab touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => {
          if (hover.current) {
            hover.current = null;
            schedule();
          }
        }}
        onDoubleClick={(e) => {
          const p = local(e);
          if (cam.current && !hitAt(p.x, p.y)) flyTo(zoomed(cam.current, p.x, p.y, 2), 320);
        }}
      />
      <span ref={pingRef} className="pointer-events-none absolute top-0 left-0 hidden size-7" aria-hidden>
        <span className="block size-full animate-ping rounded-full border-2 border-accent" />
      </span>
      <p className="pointer-events-none absolute bottom-3 left-3 inline-flex max-w-[calc(100%-5rem)] items-center gap-1.5 rounded-full bg-raised/85 px-3 py-1.5 text-[12px] font-semibold text-ink-soft tabular-nums shadow-elev-1 backdrop-blur">
        <Radio size={13} className="shrink-0 text-accent" aria-hidden />
        <span className="truncate">{caption}</span>
      </p>
      <div className="absolute top-3 right-3 flex flex-col gap-1.5">
        <button type="button" aria-label="Zoom in" onClick={() => zoomBy(2)} className={button}>
          <Plus size={17} aria-hidden />
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomBy(0.5)} className={button}>
          <Minus size={17} aria-hidden />
        </button>
      </div>
      <div className="absolute right-3 bottom-3 flex gap-1.5">
        <button type="button" aria-label="Where it's on air" title="Where it's on air" onClick={() => flyTo(fitHome(size.w, size.h))} className={button}>
          <LocateFixed size={16} aria-hidden />
        </button>
        <button type="button" aria-label="The whole world" title="The whole world" onClick={world} className={button}>
          <Globe2 size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}

