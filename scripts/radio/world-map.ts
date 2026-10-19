// The countries on Sonus › Radio's map: Natural Earth's 1:50m countries (public domain), made
// small: each outline simplified to about five kilometres, tiny islands dropped (a country always
// keeps its largest piece), points rounded to 0.01° and written as polylines. Made once; run
// again only to refresh. Node 24:
//   node scripts/radio/world-map.ts
// Downloads the GeoJSON into scripts/.cache (3 MB) and writes src/features/sonus/radio/worldMap.ts.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const SOURCE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson';
const CACHE = 'scripts/.cache/ne_50m_countries.geojson';
/** Degrees: points closer than this to the simplified line are dropped. */
const TOLERANCE = 0.05;
/** Square degrees: smaller islands are left out (unless they are all a country has). */
const MIN_AREA = 0.05;

type Ring = Array<[number, number]>;
interface Feature {
  properties: Record<string, unknown>;
  geometry: { type: 'Polygon'; coordinates: Ring[] } | { type: 'MultiPolygon'; coordinates: Ring[][] };
}

if (!existsSync(CACHE)) {
  mkdirSync('scripts/.cache', { recursive: true });
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`Natural Earth answered ${res.status}`);
  writeFileSync(CACHE, Buffer.from(await res.arrayBuffer()));
}
const features = (JSON.parse(readFileSync(CACHE, 'utf8')) as { features: Feature[] }).features;

/** Areas Natural Earth gives no ISO code, drawn as part of the country they're usually shown with. */
const PART_OF: Record<string, string> = { Somaliland: 'SO', 'N. Cyprus': 'CY', 'Siachen Glacier': 'IN' };

function simplify(ring: Ring, tolerance: number): Ring {
  if (ring.length <= 4) return ring;
  const keep = new Uint8Array(ring.length);
  keep[0] = keep[ring.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, ring.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = ring[a];
    const [bx, by] = ring[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    let far = -1;
    let farGap = tolerance;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = ring[i];
      const gap = len ? Math.abs(dy * px - dx * py + bx * ay - by * ax) / len : Math.hypot(px - ax, py - ay);
      if (gap > farGap) {
        farGap = gap;
        far = i;
      }
    }
    if (far >= 0) {
      keep[far] = 1;
      stack.push([a, far], [far, b]);
    }
  }
  return ring.filter((_, i) => keep[i]);
}

const area = (ring: Ring) => {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) sum += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  return Math.abs(sum / 2);
};

/** Google's polyline encoding of rounded, delta-coded values. */
function encode(ring: Ring): string {
  let out = '';
  let lastX = 0;
  let lastY = 0;
  const put = (v: number) => {
    let n = v < 0 ? ~(v << 1) : v << 1;
    while (n >= 0x20) {
      out += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
      n >>= 5;
    }
    out += String.fromCharCode(n + 63);
  };
  for (const [lon, lat] of ring) {
    const x = Math.round(lon * 100);
    const y = Math.round(lat * 100);
    if (x === lastX && y === lastY && out) continue;
    put(x - lastX);
    put(y - lastY);
    lastX = x;
    lastY = y;
  }
  return out;
}

const countries = new Map<string, { label: [number, number]; rings: Ring[]; labelRank: number }>();
for (const f of features) {
  const p = f.properties;
  const name = String(p.NAME);
  const raw = String(p.ISO_A2_EH ?? p.ISO_A2);
  const code = /^[A-Z]{2}$/.test(raw) ? raw : PART_OF[name];
  if (!code || code === 'AQ') continue;
  const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const entry = countries.get(code) ?? { label: [Number(p.LABEL_X), Number(p.LABEL_Y)] as [number, number], rings: [], labelRank: 99 };
  // The country itself names the label point, not an area drawn with it.
  if (!PART_OF[name]) entry.label = [Number(p.LABEL_X), Number(p.LABEL_Y)];
  // Outer rings only: lakes and enclaves are too small to matter here.
  for (const polygon of polygons) entry.rings.push(polygon[0]);
  countries.set(code, entry);
}

let points = 0;
const rows: Array<[string, number, number, string]> = [];
for (const [code, { label, rings }] of [...countries].sort(([a], [b]) => a.localeCompare(b))) {
  const largest = rings.reduce((best, r) => (area(r) > area(best) ? r : best), rings[0]);
  const kept = rings
    .filter((r) => r === largest || area(r) >= MIN_AREA)
    .map((r) => simplify(r, r === largest && area(r) < 1 ? TOLERANCE / 4 : TOLERANCE))
    .filter((r) => r.length >= 4);
  points += kept.reduce((n, r) => n + r.length, 0);
  rows.push([code, Math.round(label[0] * 100) / 100, Math.round(label[1] * 100) / 100, kept.map(encode).join(' ')]);
}

const body = `// Made by scripts/radio/world-map.ts from Natural Earth's 1:50m countries (public domain). Do not edit.
// [ISO code, label longitude, label latitude, outlines as Google polylines (0.01°) joined by spaces]
export const WORLD_MAP: Array<[string, number, number, string]> = ${JSON.stringify(rows)};
`;
writeFileSync('src/features/sonus/radio/worldMap.ts', body);
console.log(`${rows.length} countries, ${points} points, ${Math.round(body.length / 1024)} KB`);
