// Radio stations you keep: favourites, and the ones played lately. Backed up and synced like the
// rest; the directory's own lists are fetched fresh (src/services/radio/stations.ts).
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { LinguaDB } from './db';
import type { RadioStation, SavedStation } from './types';

const station = (s: RadioStation): RadioStation => ({
  id: s.id,
  name: s.name,
  url: s.url,
  homepage: s.homepage,
  favicon: s.favicon,
  country: s.country,
  countryCode: s.countryCode,
  state: s.state,
  tags: s.tags,
  codec: s.codec,
  bitrate: s.bitrate,
  hls: s.hls,
  lat: s.lat,
  lon: s.lon,
  clicks: s.clicks,
  votes: s.votes,
});

/** Favourites first (by name), then the rest by when they were played. */
export function useSavedStations(lang: string): SavedStation[] | undefined {
  return useLiveQuery(
    async () =>
      (await db.stations.where('lang').equals(lang).toArray())
        .filter((s) => !s.deletedAt)
        .sort((a, b) => b.favorite - a.favorite || (a.favorite ? a.name.localeCompare(b.name) : (b.playedAt ?? 0) - (a.playedAt ?? 0))),
    [lang],
  );
}

/** Adds the station to your favourites, or takes it off. Returns whether it is one now. */
export async function toggleFavorite(s: RadioStation, lang: string, database: LinguaDB = db): Promise<boolean> {
  const now = Date.now();
  const existing = await database.stations.get(s.id);
  const favorite = existing && !existing.deletedAt ? (existing.favorite ? 0 : 1) : 1;
  await database.stations.put({ ...station(s), lang: existing?.lang ?? lang, favorite, playedAt: existing?.playedAt, createdAt: existing?.createdAt ?? now, updatedAt: now });
  return favorite === 1;
}

/** Remembers a station as played now (for "Played lately"). */
export async function markStationPlayed(s: RadioStation, lang: string, database: LinguaDB = db): Promise<void> {
  const now = Date.now();
  const existing = await database.stations.get(s.id);
  const kept = existing && !existing.deletedAt;
  await database.stations.put({ ...station(s), lang: kept ? existing.lang : lang, favorite: kept ? existing.favorite : 0, playedAt: now, createdAt: existing?.createdAt ?? now, updatedAt: now });
}
