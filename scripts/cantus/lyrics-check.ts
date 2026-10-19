// How often the song page finds lyrics: the week's chart songs per language, looked up the way the
// app does (LRCLIB, then lyrics.ovh). Run with Node 24:
//   node scripts/cantus/lyrics-check.ts [--per=12] [--langs=es,fr] [--finder=path/to/lrclib.ts] [--verbose]
// `--finder` measures another version of the LRCLIB lookup (for a before-and-after).
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { lyricsOvh } from '../../src/services/cantus/lyricSources.ts';

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const per = Number(arg('per') ?? 12);
const finderPath = arg('finder');
const { findLyrics } = (await import(finderPath ? pathToFileURL(finderPath).href : '../../src/services/cantus/lrclib.ts')) as typeof import('../../src/services/cantus/lrclib.ts');

interface ChartSong {
  title: string;
  artist: string;
  album?: string;
  durationMs?: number;
}
const { charts } = JSON.parse(readFileSync(new URL('../../public/cantus/charts.json', import.meta.url), 'utf8')) as { charts: Record<string, ChartSong[]> };
const langs = arg('langs')?.split(',') ?? Object.keys(charts);

type Outcome = 'timed' | 'plain' | 'ovh' | 'none' | 'error';
async function lookUp(song: ChartSong): Promise<Outcome> {
  try {
    const found = await findLyrics(song);
    if (found?.lines.length) return found.timed ? 'timed' : 'plain';
    return (await lyricsOvh(song.title, song.artist)) ? 'ovh' : 'none';
  } catch (e) {
    if (process.argv.includes('--verbose')) console.log(`  ${song.title} · ${song.artist}: ${e instanceof Error ? `${e.name} ${e.message}` : e}`);
    return 'error';
  }
}

const total: Record<Outcome, number> = { timed: 0, plain: 0, ovh: 0, none: 0, error: 0 };
console.log('lang  songs  timed  plain  ovh  none  error  found');
for (const lang of langs) {
  const songs = (charts[lang] ?? []).slice(0, per);
  if (!songs.length) continue;
  const counts: Record<Outcome, number> = { timed: 0, plain: 0, ovh: 0, none: 0, error: 0 };
  // Two at a time with a pause: LRCLIB is run by volunteers.
  for (let i = 0; i < songs.length; i += 2) {
    for (const outcome of await Promise.all(songs.slice(i, i + 2).map(lookUp))) {
      counts[outcome]++;
      total[outcome]++;
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  const found = counts.timed + counts.plain + counts.ovh;
  console.log(
    [lang.padEnd(4), String(songs.length).padStart(5), ...(['timed', 'plain', 'ovh', 'none', 'error'] as const).map((k) => String(counts[k]).padStart(6)), `${Math.round((found / songs.length) * 100)}%`.padStart(6)].join(' '),
  );
}
const all = Object.values(total).reduce((a, b) => a + b, 0);
const found = total.timed + total.plain + total.ovh;
console.log(`all: ${found} of ${all} songs have lyrics (${Math.round((found / all) * 100)}%), ${total.timed} timed (${Math.round((total.timed / all) * 100)}%)`);
