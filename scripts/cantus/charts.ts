// Builds public/cantus/charts.json: what's played most right now in the countries of each language
// (Apple's charts, then Deezer's), kept to songs actually sung in that language. Browsers can't read
// these charts directly (no CORS, or too flaky), so this runs when the app is built (and weekly,
// see .github/workflows/deploy.yml).
// Each song's lyrics come from LRCLIB and are checked with the app's own language detector.
//
//   node scripts/cantus/charts.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { detectLanguage } from '../../src/core/lang/detect.ts';

/** Deezer's "Top <country>" playlists (by the Deezer Charts account), per language. */
const CHARTS: Record<string, Array<[country: string, playlist: number]>> = {
  es: [['Spain', 1116190041], ['Mexico', 1111142361], ['Argentina', 1279119721], ['Colombia', 1116188451]],
  pt: [['Brazil', 1111141961], ['Portugal', 1362519755]],
  fr: [['France', 1109890291], ['Belgium', 1266968331]],
  de: [['Germany', 1111143121], ['Austria', 1313615765], ['Switzerland', 1313617925]],
  it: [['Italy', 1116187241]],
  ru: [['Russia', 1116189381]],
  sv: [['Sweden', 1313620305]],
  hu: [['Hungary', 1362506695]],
  en: [['the USA', 1313621735], ['the UK', 1111142221]],
  nl: [['the Netherlands', 1266971851], ['Belgium', 1266968331]],
  nb: [['Norway', 1313619885]],
  tr: [['Türkiye', 1116189071]],
  id: [['Indonesia', 1116188761]],
  sw: [['Kenya', 1362509215]],
  ar: [['Egypt', 1362501615], ['Saudi Arabia', 1362521285], ['Morocco', 1362512715], ['Lebanon', 1362511155], ['Jordan', 1362508765], ['the UAE', 1362491345], ['Algeria', 1362501015]],
  zh: [['Singapore', 1313620765]],
  ja: [['Japan', 1362508955]],
  ko: [['South Korea', 1362510315]],
};

const PER_LANGUAGE = 30;

interface DeezerTrack {
  title: string;
  title_short?: string;
  duration?: number;
  artist?: { name?: string };
  album?: { title?: string; cover_big?: string; cover_medium?: string };
}

export interface ChartSong {
  title: string;
  artist: string;
  album?: string;
  cover?: string;
  durationMs?: number;
  /** Where it charts. */
  where: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function json<T>(url: string): Promise<T | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    let limited = false;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Lingua charts (https://github.com/sanchour/lingua.)' }, signal: AbortSignal.timeout(15_000) });
      if (res.status === 404) return null;
      if (res.ok) return (await res.json()) as T;
      limited = res.status === 429;
    } catch {
      /* try again */
    }
    // LRCLIB asks clients to slow down with 429: wait properly before the next try.
    await sleep((limited ? 4000 : 800) * (attempt + 1));
  }
  return null;
}

/** Apple's "most played" charts per country (the same stores Cantus searches). */
const APPLE: Record<string, Array<[country: string, store: string]>> = {
  es: [['Spain', 'es'], ['Mexico', 'mx'], ['Argentina', 'ar'], ['Colombia', 'co']],
  pt: [['Brazil', 'br'], ['Portugal', 'pt']],
  fr: [['France', 'fr'], ['Belgium', 'be']],
  de: [['Germany', 'de'], ['Austria', 'at'], ['Switzerland', 'ch']],
  it: [['Italy', 'it']],
  ru: [['Russia', 'ru']],
  el: [['Greece', 'gr']],
  sv: [['Sweden', 'se']],
  hu: [['Hungary', 'hu']],
  en: [['the USA', 'us'], ['the UK', 'gb']],
  nl: [['the Netherlands', 'nl'], ['Belgium', 'be']],
  nb: [['Norway', 'no']],
  tr: [['Türkiye', 'tr']],
  id: [['Indonesia', 'id']],
  sw: [['Kenya', 'ke'], ['Tanzania', 'tz']],
  ar: [['Egypt', 'eg'], ['Saudi Arabia', 'sa'], ['the UAE', 'ae'], ['Morocco', 'ma'], ['Jordan', 'jo'], ['Lebanon', 'lb']],
  zh: [['Taiwan', 'tw'], ['China', 'cn'], ['Singapore', 'sg']],
  ja: [['Japan', 'jp']],
  ko: [['South Korea', 'kr']],
};

interface Candidate {
  title: string;
  artist: string;
  album?: string;
  cover?: string;
  durationMs?: number;
  where: string;
}

/** A chart's songs in order, from Apple then from Deezer. */
async function candidates(lang: string): Promise<Candidate[]> {
  const out: Candidate[] = [];
  for (const [country, store] of APPLE[lang] ?? []) {
    const feed = await json<{ feed?: { results?: Array<{ name: string; artistName: string; artworkUrl100?: string }> } }>(`https://rss.marketingtools.apple.com/api/v2/${store}/music/most-played/100/songs.json`);
    for (const r of feed?.feed?.results ?? []) out.push({ title: r.name, artist: r.artistName, cover: r.artworkUrl100?.replace(/\/\d+x\d+bb\./, '/300x300bb.'), where: country });
  }
  for (const [country, playlist] of CHARTS[lang] ?? []) {
    const page = await json<{ data?: DeezerTrack[] }>(`https://api.deezer.com/playlist/${playlist}/tracks?limit=100`);
    for (const t of page?.data ?? []) {
      out.push({ title: t.title_short ?? t.title, artist: t.artist?.name ?? '', album: t.album?.title, cover: t.album?.cover_big ?? t.album?.cover_medium, durationMs: t.duration ? t.duration * 1000 : undefined, where: country });
    }
  }
  return out;
}

/** The song's lyrics language, from LRCLIB; the title alone for Cyrillic and Greek. */
async function sungIn(t: Candidate): Promise<string | null> {
  const byScript = detectLanguage(`${t.title} ${t.title} ${t.artist}`);
  if (byScript && (byScript.lang === 'ru' || byScript.lang === 'el')) return byScript.lang;
  let rec: { plainLyrics?: string | null } | null = null;
  if (t.durationMs) {
    rec = await json(`https://lrclib.net/api/get?${new URLSearchParams({ track_name: t.title, artist_name: t.artist, duration: String(Math.round(t.durationMs / 1000)) })}`);
  }
  if (!rec?.plainLyrics) {
    const found = await json<Array<{ plainLyrics?: string | null }>>(`https://lrclib.net/api/search?${new URLSearchParams({ track_name: t.title, artist_name: t.artist })}`);
    rec = found?.find((r) => r.plainLyrics) ?? null;
  }
  if (!rec?.plainLyrics) return null;
  return detectLanguage(rec.plainLyrics)?.lang ?? null;
}

const key = (t: { title: string; artist: string }) => `${t.title.replace(/\s*[([].*$/, '')}|${t.artist.split(/,|&| feat/i)[0]}`.toLocaleLowerCase().trim();

async function chartFor(lang: string): Promise<ChartSong[]> {
  const out: ChartSong[] = [];
  const seen = new Set<string>();
  const all = (await candidates(lang)).filter((t) => {
    const k = key(t);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  // Two at a time, in chart order, gently (LRCLIB is a free service).
  for (let i = 0; i < all.length && out.length < PER_LANGUAGE; i += 2) {
    const batch = all.slice(i, i + 2);
    await sleep(250);
    const langs = await Promise.all(batch.map((t) => sungIn(t).catch(() => null)));
    batch.forEach((t, k) => {
      if (langs[k] === lang && out.length < PER_LANGUAGE) out.push(t);
    });
  }
  return out;
}

const charts: Record<string, ChartSong[]> = {};
for (const lang of Object.keys(APPLE)) {
  charts[lang] = await chartFor(lang);
  console.log(`${lang}: ${charts[lang].length} songs`);
}
const total = Object.values(charts).reduce((n, list) => n + list.length, 0);
if (total < 40) {
  // The services were down: keep the charts already in the repository.
  console.log('Too few songs came back; charts.json left as it was.');
} else {
  mkdirSync(new URL('../../public/cantus/', import.meta.url), { recursive: true });
  writeFileSync(new URL('../../public/cantus/charts.json', import.meta.url), JSON.stringify({ updatedAt: new Date().toISOString().slice(0, 10), charts }));
  console.log(`Wrote ${total} songs.`);
}
