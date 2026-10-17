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

/** How long the first provider has before the next one is asked as well (a hedged request). */
const HEDGE_MS = 900;

/**
 * Asks the providers in order, but never waits on a slow one: if an answer hasn't come within
 * HEDGE_MS (or a provider fails), the next starts too, and the first useful answer wins.
 */
export function firstAnswer(asks: Array<() => Promise<string | null>>): Promise<string | null> {
  return new Promise((resolve) => {
    let next = 0;
    let pending = 0;
    let done = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (value: string | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(value);
    };
    const start = () => {
      clearTimeout(timer);
      if (done || next >= asks.length) {
        if (!pending) finish(null);
        return;
      }
      const ask = asks[next++];
      pending++;
      timer = setTimeout(start, HEDGE_MS);
      ask()
        .catch(() => null) // offline or provider down
        .then((value) => {
          pending--;
          if (value) finish(value);
          else start();
        });
    };
    start();
  });
}

/** A whole line or sentence through the same online chain (subtitle lines); cached forever. */
export function translateLine(lang: string, text: string): Promise<string | null> {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (lang === GLOSS_LANG || !clean) return Promise.resolve(null);
  const key = `line:${lang}>${GLOSS_LANG}:${clean}`;
  const existing = inflight.get(key);
  if (existing) return existing;
  const job = (async () => {
    const cached = await db.translationCache.get(key);
    if (cached?.result) return cached.result;
    const { translation } = await getSettings();
    const asks = translation.chain.flatMap((provider) =>
      provider === 'mymemory' ? [() => myMemory(lang, clean)] : provider === 'lingva' ? [() => lingva(translation.lingvaHost, lang, clean)] : [],
    );
    const result = await firstAnswer(asks);
    if (result) await db.translationCache.put({ id: key, text: clean, result, provider: 'online', createdAt: Date.now() });
    return result;
  })().finally(() => inflight.delete(key));
  inflight.set(key, job);
  return job;
}

/** Online fallback for a word the dictionary lacks; cached forever. `null` when nothing is found. */
export function fetchOnlineGloss(lang: string, norm: string, surface: string): Promise<string | null> {
  if (lang === GLOSS_LANG) return Promise.resolve(null);
  const key = onlineKey(lang, norm);
  const existing = inflight.get(key);
  if (existing) return existing;

  const job = (async () => {
    const { translation } = await getSettings();
    const asks = translation.chain.flatMap((provider) =>
      provider === 'mymemory' ? [() => myMemory(lang, surface)] : provider === 'lingva' ? [() => lingva(translation.lingvaHost, lang, surface)] : [],
    );
    const result = await firstAnswer(asks);
    if (result) await db.translationCache.put({ id: key, text: norm, result, provider: 'online', createdAt: Date.now() });
    return result;
  })().finally(() => inflight.delete(key));

  inflight.set(key, job);
  return job;
}
