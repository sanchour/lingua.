// The faint world behind Sonus › Radio's map: where the radio stations of every language are, on a
// half-degree grid, so the dots draw the world. Made once; run again only to refresh. Node 24:
//   node scripts/radio/world-dots.ts
// Writes src/features/sonus/radio/worldDots.ts (cells as sorted deltas in base 36).
import { writeFileSync } from 'node:fs';

interface Raw {
  geo_lat: number | null;
  geo_long: number | null;
}

const PAGE = 10_000;
const all: Raw[] = [];
for (let offset = 0; ; offset += PAGE) {
  const url = `https://de1.api.radio-browser.info/json/stations/search?has_geo_info=true&hidebroken=true&limit=${PAGE}&offset=${offset}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Lingua/3.0 (world-dots script)' } });
  if (!res.ok) throw new Error(`radio-browser answered ${res.status}`);
  const page = (await res.json()) as Raw[];
  all.push(...page);
  console.log(`${all.length} stations`);
  if (page.length < PAGE) break;
}

const counts = new Map<number, number>();
for (const s of all) {
  const lat = s.geo_lat;
  const lon = s.geo_long;
  if (lat === null || lon === null || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 85 || Math.abs(lon) > 180) continue;
  // Exactly 0,0 is a missing place, not the Gulf of Guinea.
  if (lat === 0 && lon === 0) continue;
  const cell = Math.floor((lat + 90) * 2) * 720 + Math.min(719, Math.floor((lon + 180) * 2));
  counts.set(cell, (counts.get(cell) ?? 0) + 1);
}

const pack = (cells: number[]) => {
  let last = 0;
  return cells
    .sort((a, b) => a - b)
    .map((c) => {
      const d = c - last;
      last = c;
      return d.toString(36);
    })
    .join('.');
};
const dim = [...counts].filter(([, n]) => n < 4).map(([c]) => c);
const bright = [...counts].filter(([, n]) => n >= 4).map(([c]) => c);

const out = `// Made by scripts/radio/world-dots.ts from radio-browser.info (${new Date().toISOString().slice(0, 10)}, ${all.length} stations with a place):
// half-degree cells that have radio stations, as sorted deltas in base 36. Fewer than four, then more.
export const DIM_CELLS = '${pack(dim)}';
export const BRIGHT_CELLS = '${pack(bright)}';
`;
writeFileSync(new URL('../../src/features/sonus/radio/worldDots.ts', import.meta.url), out);
console.log(`${dim.length} dim and ${bright.length} bright cells, ${Math.round(out.length / 1024)} KB`);
