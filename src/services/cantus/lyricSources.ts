// Lyrics from beyond LRCLIB, for the songs it lacks: lyrics.ovh (free, no key, plain text). Genius
// can't be asked from a browser (its API refuses the check browsers make before sending a key), so
// the song page links to Genius's own search, to copy the words and paste them.
// They aren't timed to the music: the lyrics are shown whole, to read along.
import { parsePlain } from '@/core/cantus/lyrics';
import type { LyricLine } from '@/core/cantus/lyrics';

export interface OtherLyrics {
  lines: LyricLine[];
  from: 'lyrics.ovh';
}

/** "Despacito (feat. Justin Bieber) - Remastered 2019" → "Despacito". */
export const plainTitle = (title: string) =>
  title
    .replace(/\s*[([](?:feat|ft|with|con|prod)\.?[^)\]]*[)\]]/gi, '')
    .replace(/\s+-\s+(?:remaster(?:ed)?|live|version|mono|stereo|radio edit|from\b).*$/i, '')
    .trim();

/**
 * Plain lyrics as lines: section labels ([Chorus], [Verso 1]) become verse breaks, and text that puts
 * an empty line after every line keeps only the real verse breaks.
 */
export function tidyLyrics(raw: string): LyricLine[] {
  let text = raw.replace(/\r\n?/g, '\n').replace(/ | /g, ' ');
  // lyrics.ovh's French pages begin "Paroles de la chanson … par …".
  text = text.replace(/^Paroles de la chanson [^\n]* par [^\n]*\n/, '');
  let lines = text.split('\n').map((l) => l.trim());
  const filled = lines.filter(Boolean).length;
  const singleGaps = lines.filter((l, i) => !l && lines[i - 1] && lines[i + 1]).length;
  if (filled > 6 && singleGaps > filled * 0.6) {
    // Every line spaced out: one empty line is no break, two are.
    const out: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]) out.push(lines[i]);
      else if (!lines[i + 1] && out[out.length - 1] !== '') out.push('');
    }
    lines = out;
  }
  // A section label ([Chorus]) starts a verse: it becomes a break.
  lines = lines.map((l) => (/^\[[^\]]*\]$/.test(l) ? '' : l));
  return parsePlain(lines.join('\n').replace(/\n{3,}/g, '\n\n').trim());
}

/** lyrics.ovh; null when it has nothing (or doesn't answer). */
export async function lyricsOvh(title: string, artist: string): Promise<OtherLyrics | null> {
  const name = artist.split(/,|&| feat\.? | ft\.? | x /i)[0].trim();
  try {
    const res = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(name)}/${encodeURIComponent(plainTitle(title))}`, { signal: AbortSignal.timeout(9000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { lyrics?: string };
    const lines = data.lyrics ? tidyLyrics(data.lyrics) : [];
    return lines.filter((l) => l.text).length >= 4 ? { lines, from: 'lyrics.ovh' } : null;
  } catch {
    return null;
  }
}

/** Genius's own search, for finding the words by hand. */
export const geniusSearchUrl = (title: string, artist: string) => `https://genius.com/search?q=${encodeURIComponent(`${plainTitle(title)} ${artist}`)}`;
