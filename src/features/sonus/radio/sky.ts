// The radio map's arithmetic: the countries' outlines, Web Mercator, and a camera that pans, zooms
// and fits. World units: x and y from 0 to 1 across the whole Mercator square.

/** Google polyline (0.01° steps) back to [lon, lat] points. */
export function decodePolyline(line: string): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  let i = 0;
  let x = 0;
  let y = 0;
  const next = () => {
    let shift = 0;
    let result = 0;
    let b: number;
    do {
      b = line.charCodeAt(i++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (i < line.length) {
    x += next();
    y += next();
    points.push([x / 100, y / 100]);
  }
  return points;
}

const MAX_LAT = 85;

export const lonToX = (lon: number) => (lon + 180) / 360;
export function latToY(lat: number): number {
  const phi = (Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) * Math.PI) / 180;
  return 0.5 - Math.log(Math.tan(Math.PI / 4 + phi / 2)) / (2 * Math.PI);
}
export const xToLon = (x: number) => x * 360 - 180;
export const yToLat = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI;

/** The part of the world worth showing whole: from the Arctic islands to Patagonia. */
export const WORLD_TOP = latToY(80);
export const WORLD_BOTTOM = latToY(-57);

/** Where the map looks: the centre in world units, and how many pixels the world is wide. */
export interface Camera {
  x: number;
  y: number;
  z: number;
}

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** The smallest zoom: the whole world in view. */
export const minZoom = (w: number, h: number) => Math.min(w, h / (WORLD_BOTTOM - WORLD_TOP));
/** Close enough to tell a city's stations apart. */
export const maxZoom = (w: number) => w * 400;

/** Keeps the camera on the world and between the smallest and largest zoom. */
export function clampCamera(c: Camera, w: number, h: number): Camera {
  const z = Math.max(minZoom(w, h), Math.min(maxZoom(w), c.z));
  const halfW = w / 2 / z;
  const halfH = h / 2 / z;
  // When the world is narrower than the view it stays centred; otherwise its edges can't come in.
  const x = halfW >= 0.5 ? 0.5 : Math.max(halfW, Math.min(1 - halfW, c.x));
  const span = WORLD_BOTTOM - WORLD_TOP;
  const y = halfH * 2 >= span ? (WORLD_TOP + WORLD_BOTTOM) / 2 : Math.max(WORLD_TOP + halfH, Math.min(WORLD_BOTTOM - halfH, c.y));
  return { x, y, z };
}

/** A camera that shows the box, with some room around it. */
export function fitBox(box: Box, w: number, h: number, padding = 0.18): Camera {
  const bw = Math.max(box.x1 - box.x0, 1e-4);
  const bh = Math.max(box.y1 - box.y0, 1e-4);
  const z = Math.min(w / bw, h / bh) * (1 - padding);
  return clampCamera({ x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2, z }, w, h);
}

const quantile = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];

/**
 * The box around most of the points (a few far-off ones left out when there are many), at least
 * `minDegrees` across, so one city doesn't fill the map.
 */
export function boxAround(points: Array<{ lat: number; lon: number }>, minDegrees = 8): Box | null {
  if (!points.length) return null;
  const cut = points.length >= 20 ? 0.04 : 0;
  const xs = points.map((p) => lonToX(p.lon)).sort((a, b) => a - b);
  const ys = points.map((p) => latToY(p.lat)).sort((a, b) => a - b);
  const box = { x0: quantile(xs, cut), x1: quantile(xs, 1 - cut), y0: quantile(ys, cut), y1: quantile(ys, 1 - cut) };
  const min = minDegrees / 360;
  const grow = (a: number, b: number) => (b - a < min ? [(a + b) / 2 - min / 2, (a + b) / 2 + min / 2] : [a, b]);
  [box.x0, box.x1] = grow(box.x0, box.x1);
  [box.y0, box.y1] = grow(box.y0, box.y1);
  return box;
}

/** Eases a camera from one view to another: the zoom moves evenly in scale, not in pixels. */
export function between(a: Camera, b: Camera, t: number): Camera {
  const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
  const z = a.z * (b.z / a.z) ** e;
  return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, z };
}

export interface Country {
  code: string;
  /** Where the name and node go when no station says where it is. */
  label: { lat: number; lon: number };
  /** Outlines in world units. */
  rings: Array<Array<[number, number]>>;
  /** The largest outline's box (the mainland, not far islands or overseas parts). */
  main: Box;
}

/** The countries from the packed outlines (scripts/radio/world-map.ts). */
export function decodeCountries(rows: Array<[string, number, number, string]>): Country[] {
  return rows.map(([code, lon, lat, packed]) => {
    const outlines = packed.split(' ').map(decodePolyline);
    const rings = outlines.map((ring) => ring.map(([x, y]): [number, number] => [lonToX(x), latToY(y)]));
    // The largest piece on the ground (not on the map: Mercator makes Alaska look larger than it is).
    let main: Box = { x0: 0, y0: 0, x1: 0, y1: 0 };
    let largest = -1;
    outlines.forEach((ring, k) => {
      let sum = 0;
      let lats = 0;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        sum += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
        lats += ring[i][1];
      }
      const size = Math.abs(sum / 2) * Math.cos(((lats / ring.length) * Math.PI) / 180);
      if (size <= largest) return;
      largest = size;
      const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
      for (const [x, y] of rings[k]) {
        box.x0 = Math.min(box.x0, x);
        box.x1 = Math.max(box.x1, x);
        box.y0 = Math.min(box.y0, y);
        box.y1 = Math.max(box.y1, y);
      }
      main = box;
    });
    return { code, label: { lat, lon }, rings, main };
  });
}
