// The night-sky map's arithmetic: the world's cells, and a view fitted to where stations are.

/** Half-degree cells (sorted deltas in base 36) back to their centres, as [lat, lon]. */
export function decodeCells(packed: string): Array<[number, number]> {
  if (!packed) return [];
  let cell = 0;
  return packed.split('.').map((d) => {
    cell += parseInt(d, 36);
    return [Math.floor(cell / 720) / 2 - 90 + 0.25, (cell % 720) / 2 - 180 + 0.25];
  });
}

export interface View {
  /** West, south, east, north, in degrees. */
  west: number;
  south: number;
  east: number;
  north: number;
}

export const WORLD: View = { west: -170, south: -50, east: 180, north: 72 };

const quantile = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];

/**
 * The part of the world where most of the points are (a few far-off ones left out), padded, at
 * least `minSpan` degrees tall, and shaped like the map (`aspect` = width / height).
 */
export function fitView(points: Array<{ lat: number; lon: number }>, aspect: number, minSpan = 9): View {
  if (points.length < 2) return WORLD;
  const lats = points.map((p) => p.lat).sort((a, b) => a - b);
  const lons = points.map((p) => p.lon).sort((a, b) => a - b);
  const cut = points.length >= 20 ? 0.04 : 0;
  let south = quantile(lats, cut);
  let north = quantile(lats, 1 - cut);
  let west = quantile(lons, cut);
  let east = quantile(lons, 1 - cut);
  const padLat = Math.max(minSpan - (north - south), 0) / 2 + (north - south) * 0.12;
  south -= padLat;
  north += padLat;
  // Longitude shrinks towards the poles: the map draws x as lon × cos(middle latitude).
  const k = Math.cos((((south + north) / 2) * Math.PI) / 180);
  let width = (east - west) * k * 1.24;
  const height = north - south;
  if (width / height < aspect) width = height * aspect;
  else {
    const grow = (width / aspect - height) / 2;
    south -= grow;
    north += grow;
  }
  const middle = (west + east) / 2;
  west = middle - width / k / 2;
  east = middle + width / k / 2;
  return { west: Math.max(-180, west), south: Math.max(-60, south), east: Math.min(180, east), north: Math.min(80, north) };
}

/** Degrees to pixels for a view drawn in a `width` × `height` box (the view's shape may differ a little). */
export function projector(view: View, width: number, height: number): (lat: number, lon: number) => [number, number] {
  const k = Math.cos((((view.south + view.north) / 2) * Math.PI) / 180);
  const spanX = (view.east - view.west) * k;
  const spanY = view.north - view.south;
  const scale = Math.min(width / spanX, height / spanY);
  const offX = (width - spanX * scale) / 2;
  const offY = (height - spanY * scale) / 2;
  return (lat, lon) => [offX + (lon - view.west) * k * scale, offY + (view.north - lat) * scale];
}
