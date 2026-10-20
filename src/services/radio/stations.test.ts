import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { LANGUAGES } from '@/core/lang/languages';
import { createDb } from '@/data/db';
import { markStationPlayed, toggleFavorite } from '@/data/radio';
import { WORLD_MAP } from '@/features/sonus/radio/worldMap';
import { between, boxAround, clampCamera, decodeCountries, decodePolyline, fitBox, latToY, lonToX, minZoom, xToLon, yToLat } from '@/features/sonus/radio/sky';
import { cleanStations, countriesOf, countryName, placesOf, radioNames, readAzuraCast, readIcecast, toStation } from './stations';
import type { RawStation } from './stations';

const raw = (over: Partial<RawStation>): RawStation => ({ stationuuid: over.name ?? 'x', name: 'Radio', url_resolved: 'https://stream.example/live', codec: 'MP3', lastcheckok: 1, clickcount: 1, ...over });
const everything = () => true;

describe('radio stations', () => {
  it('finds stations for every language by its names in the directory', () => {
    for (const l of LANGUAGES.filter((x) => !x.soon)) expect(radioNames(l.code).length, l.code).toBeGreaterThan(0);
    expect(radioNames('es')).toEqual(['spanish']);
    expect(radioNames('sh')).toEqual(['croatian', 'serbian', 'bosnian', 'montenegrin']);
    expect(radioNames('nb')).toContain('norsk');
  });

  it('calls countries by their everyday names', () => {
    expect(toStation(raw({ country: 'Bolivarian Republic Of Venezuela', countrycode: 've' }))?.country).toBe('Venezuela');
    expect(countryName('US', 'The United States Of America')).toBe('United States');
    expect(countryName(undefined, 'Somewhere')).toBe('Somewhere');
  });

  it('keeps only https streams that play here, each once, most listened first', () => {
    const stations = cleanStations(
      [
        raw({ name: 'Plain', url_resolved: 'http://insecure.example/live', url: 'http://insecure.example/live' }),
        raw({ name: 'Broken', url_resolved: 'https://b.example/', lastcheckok: 0 }),
        raw({ name: 'Video', url_resolved: 'https://v.example/', codec: 'AAC,H.264' }),
        raw({ name: 'Hls', url_resolved: 'https://h.example/a.m3u8', hls: 1 }),
        raw({ name: 'Quiet', url_resolved: 'https://q.example/', clickcount: 2, countrycode: 'es' }),
        raw({ name: 'Loud', url_resolved: 'https://l.example/', clickcount: 90, geo_lat: 0, geo_long: 0 }),
        raw({ name: 'Loud', stationuuid: 'copy', url_resolved: 'https://l.example' }),
        raw({ name: 'Fallback', url_resolved: 'http://f.example/', url: 'https://f.example/', clickcount: 5 }),
      ],
      (type) => type !== 'application/vnd.apple.mpegurl',
    );
    expect(stations.map((s) => s.name)).toEqual(['Loud', 'Fallback', 'Quiet']);
    expect(stations[0].lat).toBeUndefined(); // 0,0 is no place
    expect(stations[1].url).toBe('https://f.example/');
    expect(stations[2].countryCode).toBe('ES');
    expect(cleanStations([raw({ name: 'Hls', hls: 1 })], everything)).toHaveLength(1);
  });

  it('gathers nearby stations into places, and counts countries', () => {
    const stations = cleanStations(
      [
        raw({ name: 'A', url_resolved: 'https://a.example/', geo_lat: 40.41, geo_long: -3.7, state: 'Madrid', country: 'Spain', countrycode: 'ES' }),
        raw({ name: 'B', url_resolved: 'https://b.example/', geo_lat: 40.45, geo_long: -3.68, state: 'Madrid', country: 'Spain', countrycode: 'ES' }),
        raw({ name: 'C', url_resolved: 'https://c.example/', geo_lat: 19.43, geo_long: -99.13, country: 'Mexico', countrycode: 'MX' }),
        raw({ name: 'D', url_resolved: 'https://d.example/', country: 'Spain', countrycode: 'ES' }),
      ],
      everything,
    );
    const places = placesOf(stations).sort((a, b) => b.stations.length - a.stations.length);
    expect(places).toHaveLength(2);
    expect(places[0].label).toBe('Madrid, Spain');
    expect(places[0].stations.map((s) => s.name).sort()).toEqual(['A', 'B']);
    expect(countriesOf(stations)).toEqual([
      { code: 'ES', name: 'Spain', count: 3 },
      { code: 'MX', name: 'Mexico', count: 1 },
    ]);
  });

  it('reads now playing from Icecast (for the right stream) and AzuraCast', () => {
    const status = {
      icestats: {
        server_name: 'Radio',
        source: [
          { listenurl: 'http://host:8000/other', title: 'Not this one' },
          { listenurl: 'http://host:8000/live.mp3', artist: 'Rosalía', title: 'Malamente' },
        ],
      },
    };
    expect(readIcecast(status, 'https://host:8000/live.mp3')).toBe('Rosalía – Malamente');
    expect(readIcecast({ icestats: { source: { listenurl: 'http://h/x', title: 'Manu Chao - Clandestino' } } }, 'https://h/y')).toBe('Manu Chao - Clandestino');
    expect(readIcecast({ icestats: { source: { title: 'Unknown' } } }, 'https://h/x')).toBeNull();
    expect(readIcecast({ icestats: {} }, 'https://h/x')).toBeNull();
    expect(readAzuraCast({ now_playing: { song: { text: 'louis armstrong - summertime', title: 'summertime', artist: 'louis armstrong' } } })).toBe('louis armstrong – summertime');
    expect(readAzuraCast({ now_playing: { song: { text: 'Station jingle', title: '', artist: '' } } })).toBe('Station jingle');
    expect(readAzuraCast({})).toBeNull();
  });

  it('draws the countries, and moves and fits the map', () => {
    expect(decodePolyline('_p~iF~ps|U')).toEqual([[38500, -120200]]); // Google's example (38.5, -120.2), read at 0.01° steps
    const countries = decodeCountries(WORLD_MAP);
    expect(countries.length).toBeGreaterThan(200);
    const spain = countries.find((c) => c.code === 'ES')!;
    const france = countries.find((c) => c.code === 'FR')!;
    const usa = countries.find((c) => c.code === 'US')!;
    // Madrid is inside Spain's mainland box; France's box is Europe's France, not French Guiana.
    const [mx, my] = [lonToX(-3.7), latToY(40.4)];
    expect(mx > spain.main.x0 && mx < spain.main.x1 && my > spain.main.y0 && my < spain.main.y1).toBe(true);
    expect(xToLon(france.main.x0)).toBeGreaterThan(-6);
    expect(xToLon(usa.main.x0)).toBeGreaterThan(-130); // the lower 48, not Alaska
    expect(yToLat(latToY(52.5))).toBeCloseTo(52.5, 6);

    // A camera can't leave the world or zoom out past it.
    const [w, h] = [400, 300];
    const out = clampCamera({ x: -2, y: 5, z: 1 }, w, h);
    expect(out.z).toBe(minZoom(w, h));
    expect(out.x).toBe(0.5);
    const germany = boxAround([
      { lat: 52.5, lon: 13.4 },
      { lat: 48.1, lon: 11.6 },
      { lat: 53.6, lon: 10 },
      { lat: 50.9, lon: 6.9 },
    ])!;
    const view = fitBox(germany, w, h);
    for (const [lat, lon] of [
      [52.5, 13.4],
      [50.9, 6.9],
    ]) {
      const x = (lonToX(lon) - view.x) * view.z + w / 2;
      const y = (latToY(lat) - view.y) * view.z + h / 2;
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(w);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(h);
    }
    // Halfway between two zooms is halfway in scale.
    expect(between({ x: 0, y: 0, z: 100 }, { x: 1, y: 1, z: 400 }, 0.5).z).toBeCloseTo(200, 6);
  });

  it('keeps favourites and stations played lately, and favourites survive being played', async () => {
    const database = createDb(`radio-${Math.random()}`);
    const [station] = cleanStations([raw({ name: 'Cadena', url_resolved: 'https://c.example/' })], everything);
    await markStationPlayed(station, 'es', database);
    expect((await database.stations.get(station.id))?.favorite).toBe(0);
    expect(await toggleFavorite(station, 'es', database)).toBe(true);
    await markStationPlayed(station, 'es', database);
    const kept = await database.stations.get(station.id);
    expect(kept?.favorite).toBe(1);
    expect(kept?.playedAt).toBeGreaterThan(0);
    expect(await toggleFavorite(station, 'es', database)).toBe(false);
  });
});
