// A translation under each lyric line: the AI reads the whole song (so a line is translated in the
// light of the verse it's in); without a key, the free online translators take it line by line.
import { getLanguage } from '@/core/lang/languages';
import { getSettings } from '@/data/settings';
import type { Song } from '@/data/types';
import { askJson } from '@/services/llm/client';
import { translateLine } from '@/services/translate/gloss';

const BATCH = 60;

async function hasAiKey(): Promise<boolean> {
  const { llm, apiKeys } = await getSettings();
  return Boolean(apiKeys[llm.provider]?.trim() && llm.model);
}

async function byAi(song: Song, texts: string[], onProgress?: (fraction: number) => void): Promise<string[]> {
  const name = getLanguage(song.lang)?.name ?? song.lang;
  const system =
    `You translate ${name} song lyrics into natural English for a language learner reading along. ` +
    'Answer only with JSON: {"lines": string[]}, exactly one English line for each input line, in the same order. ' +
    'Keep the meaning, tone and imagery of each line; explain nothing, never merge or split lines, and leave sounds like "oh" or "la la" as they are.';
  const out: string[] = [];
  for (let start = 0; start < texts.length; start += BATCH) {
    onProgress?.(start / texts.length);
    const lines = texts.slice(start, start + BATCH);
    const user = JSON.stringify({ song: song.title, artist: song.artist, earlier: texts.slice(Math.max(0, start - 4), start), lines });
    const result = await askJson<{ lines?: unknown }>({ system, user, kind: 'lyrics' });
    const got = Array.isArray(result.lines) ? result.lines.map((l) => String(l ?? '').trim()) : [];
    lines.forEach((_, i) => out.push(got[i] ?? ''));
  }
  return out;
}

async function online(lang: string, texts: string[], onProgress?: (fraction: number) => void): Promise<string[]> {
  const out = new Array<string>(texts.length).fill('');
  let next = 0;
  let done = 0;
  // Three at a time: quick, and kind to the free services.
  const worker = async () => {
    while (next < texts.length) {
      const i = next++;
      out[i] = (await translateLine(lang, texts[i]).catch(() => null)) ?? '';
      onProgress?.(++done / texts.length);
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  return out;
}

/**
 * English for every line of a song (breaks stay empty). Repeated lines (a chorus) are translated
 * once. Throws when nothing came back.
 */
export async function translateLyrics(song: Song, onProgress?: (fraction: number) => void): Promise<NonNullable<Song['translation']>> {
  const unique = [...new Set(song.lines.map((l) => l.text).filter((t) => /\p{L}/u.test(t)))];
  if (!unique.length) throw new Error('This song has no words to translate.');
  const ai = await hasAiKey();
  let english: string[];
  try {
    english = ai ? await byAi(song, unique, onProgress) : await online(song.lang, unique, onProgress);
  } catch (e) {
    if (!ai) throw e;
    english = await online(song.lang, unique, onProgress);
  }
  const of = new Map(unique.map((t, i) => [t, english[i]]));
  const lines = song.lines.map((l) => of.get(l.text) ?? '');
  if (!lines.some(Boolean)) throw new Error('No translation came back. Check the connection and try again.');
  onProgress?.(1);
  return { lines, by: ai ? 'ai' : 'online' };
}
