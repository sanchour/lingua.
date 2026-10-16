// Tier-1 translations: everything a chapter needs is read in one go into an in-memory map, so a
// hover/tap is a Map lookup (≈1 ms). Only words missing from the offline dictionary go online.
import { GLOSS_LANG } from '@/core/lang/languages';
import { packId } from '@/core/packs/format';
import { foldKey } from '@/core/text/normalize';
import { db } from '@/data/db';
import { getSettings } from '@/data/settings';
import { wordId } from '@/data/words';

export interface GlossInfo {
  text: string;
  lemma?: string;
  source: 'user' | 'dict' | 'online';
}

const onlineKey = (lang: string, norm: string) => `online:${lang}>${GLOSS_LANG}:${norm}`;

export async function lookupGlosses(lang: string, norms: string[]): Promise<Map<string, GlossInfo>> {
  const out = new Map<string, GlossInfo>();
  if (!norms.length) return out;
  const pack = packId(lang);

  const forms = await db.dictForms.bulkGet(norms.map((n) => [pack, n] as [string, string]));
  let misses: string[] = [];
  forms.forEach((f, i) => (f ? out.set(norms[i], { text: f.g, lemma: f.lemmas[0], source: 'dict' }) : misses.push(norms[i])));

  // Greek written without accents (ALL CAPS, subtitles): the pack indexes accent-free spellings.
  if (misses.length && lang === 'el') {
    const folded = await db.dictForms.bulkGet(misses.map((n) => [pack, foldKey(n, lang)] as [string, string]));
    const still: string[] = [];
    folded.forEach((f, i) => (f ? out.set(misses[i], { text: f.g, lemma: f.lemmas[0], source: 'dict' }) : still.push(misses[i])));
    misses = still;
  }

  if (misses.length) {
    const cached = await db.translationCache.bulkGet(misses.map((n) => onlineKey(lang, n)));
    cached.forEach((c, i) => c && c.result && out.set(misses[i], { text: c.result, source: 'online' }));
  }

  // The learner's own translations win.
  const words = await db.words.bulkGet(norms.map((n) => wordId(lang, n)));
  words.forEach((w, i) => w?.gloss && out.set(norms[i], { text: w.gloss, lemma: out.get(norms[i])?.lemma, source: 'user' }));
  return out;
}

const inflight = new Map<string, Promise<string | null>>();

async function myMemory(lang: string, text: string): Promise<string | null> {
  const params = new URLSearchParams({ q: text, langpair: `${lang}|${GLOSS_LANG}` });
  const res = await fetch(`https://api.mymemory.translated.net/get?${params}`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  const data = (await res.json()) as { responseData?: { translatedText?: string }; responseStatus?: number };
  const out = data.responseData?.translatedText?.trim();
  if (!out || data.responseStatus !== 200 || /MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(out)) return null;
  return out.toLocaleLowerCase(GLOSS_LANG) === text.toLocaleLowerCase(lang) ? null : out;
}

async function lingva(host: string, lang: string, text: string): Promise<string | null> {
  const res = await fetch(`${host.replace(/\/$/, '')}/api/v1/${lang}/${GLOSS_LANG}/${encodeURIComponent(text)}`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  const data = (await res.json()) as { translation?: string };
  return data.translation?.trim() || null;
}

/** Online fallback for a word the dictionary lacks; cached forever. `null` when nothing is found. */
export function fetchOnlineGloss(lang: string, norm: string, surface: string): Promise<string | null> {
  if (lang === GLOSS_LANG) return Promise.resolve(null);
  const key = onlineKey(lang, norm);
  const existing = inflight.get(key);
  if (existing) return existing;

  const job = (async () => {
    const { translation } = await getSettings();
    let result: string | null = null;
    for (const provider of translation.chain) {
      try {
        if (provider === 'mymemory') result = await myMemory(lang, surface);
        if (provider === 'lingva') result = await lingva(translation.lingvaHost, lang, surface);
      } catch {
        result = null; // offline or provider down: try the next one
      }
      if (result) break;
    }
    if (result) await db.translationCache.put({ id: key, text: norm, result, provider: 'online', createdAt: Date.now() });
    return result;
  })().finally(() => inflight.delete(key));

  inflight.set(key, job);
  return job;
}
