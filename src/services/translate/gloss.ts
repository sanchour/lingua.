// Tier-1 translations: everything a chapter needs is read in one go into an in-memory map, so a
// hover/tap is a Map lookup (≈1 ms). Only words missing from the offline dictionary go online.
import type { SenseOption } from '@/core/lang/context';
import { baseCandidates, compoundHeads } from '@/core/lang/inflect';
import { readingOf } from '@/core/lang/japanese';
import type { DictForm } from '@/data/types';
import { GLOSS_LANG } from '@/core/lang/languages';
import { packId } from '@/core/packs/format';
import { foldKey } from '@/core/text/normalize';
import { db } from '@/data/db';
import { getSettings } from '@/data/settings';
import { wordId } from '@/data/words';

export interface GlossInfo {
  text: string;
  lemma?: string;
  /** `context`: chosen for this occurrence (by its neighbours, or by the AI reading the sentence). */
  source: 'user' | 'dict' | 'online' | 'context';
  /** Not listed as written: the dictionary form it was read as ("könyvtárban" → könyvtár). */
  via?: string;
  /** Mandarin pinyin or Japanese kana for the word as written. */
  reading?: string;
}

/** Languages whose packs index a looser spelling too: Greek without accents, Arabic with a bare alef. */
const FOLDED = new Set(['el', 'ar']);

const onlineKey = (lang: string, norm: string) => `online:${lang}>${GLOSS_LANG}:${norm}`;

export interface BaseForm {
  form: DictForm;
  /** The listed word it was read as. */
  via: string;
  /** Only the end of a compound was found ("Kinderzimmerlampe" → lampe). */
  part: boolean;
}

/**
 * For words the dictionary doesn't list as written: the first likely base form it does list (a
 * case ending, a definite form, attached pronouns taken off), else the head of a compound.
 */
export async function findBaseForms(lang: string, norms: string[]): Promise<Map<string, BaseForm>> {
  const out = new Map<string, BaseForm>();
  const pack = packId(lang);
  for (const [kind, candidatesOf] of [
    ['base', baseCandidates],
    ['part', compoundHeads],
  ] as const) {
    const lists = norms.filter((n) => !out.has(n)).map((n) => [n, candidatesOf(n, lang)] as const);
    const keys = [...new Set(lists.flatMap(([, c]) => c))];
    if (!keys.length) continue;
    const rows = await db.dictForms.bulkGet(keys.map((k) => [pack, k] as [string, string]));
    const listed = new Map(keys.map((k, i) => [k, rows[i]]));
    for (const [norm, candidates] of lists) {
      const via = candidates.find((c) => listed.get(c));
      if (via) out.set(norm, { form: listed.get(via)!, via, part: kind === 'part' });
    }
  }
  return out;
}

/** How a base form reads in a tooltip: its gloss, and for a compound's end, which end. */
export const baseGloss = (b: BaseForm) => (b.part ? `…${b.via}: ${b.form.g}` : b.form.g);

export async function lookupGlosses(lang: string, norms: string[]): Promise<Map<string, GlossInfo>> {
  const out = new Map<string, GlossInfo>();
  if (!norms.length) return out;
  const pack = packId(lang);

  const forms = await db.dictForms.bulkGet(norms.map((n) => [pack, n] as [string, string]));
  let misses: string[] = [];
  const fromForm = (f: DictForm): GlossInfo => (f.r ? { text: f.g, lemma: f.lemmas[0], source: 'dict', reading: f.r } : { text: f.g, lemma: f.lemmas[0], source: 'dict' });
  forms.forEach((f, i) => (f ? out.set(norms[i], fromForm(f)) : misses.push(norms[i])));

  // Greek written without accents (ALL CAPS, subtitles), Arabic with a bare alef: the pack indexes those spellings.
  if (misses.length && FOLDED.has(lang)) {
    const folded = await db.dictForms.bulkGet(misses.map((n) => [pack, foldKey(n, lang)] as [string, string]));
    const still: string[] = [];
    folded.forEach((f, i) => (f ? out.set(misses[i], fromForm(f)) : still.push(misses[i])));
    misses = still;
  }

  // Forms the pack doesn't list: read as a likely base form.
  if (misses.length) {
    const found = await findBaseForms(lang, misses);
    for (const [norm, b] of found) {
      const info: GlossInfo = { text: baseGloss(b), lemma: b.form.lemmas[0], source: 'dict', via: b.via };
      // A Japanese conjugation reads like its dictionary form: 食べました (たべました) from 食べる (たべる).
      const reading = lang === 'ja' && b.form.r && !b.part ? readingOf(norm, b.via, b.form.r) : undefined;
      if (reading) info.reading = reading;
      out.set(norm, info);
    }
    misses = misses.filter((n) => !found.has(n));
  }

  // Mandarin words the pack doesn't list (听不懂, 第一次): read as the listed words they're made of.
  if (misses.length && lang === 'zh') {
    const found = await composeChinese(pack, misses);
    for (const [norm, info] of found) out.set(norm, info);
    misses = misses.filter((n) => !found.has(n));
  }

  if (misses.length) {
    const cached = await db.translationCache.bulkGet(misses.map((n) => onlineKey(lang, n)));
    cached.forEach((c, i) => c && c.result && out.set(misses[i], { text: c.result, source: 'online' }));
  }

  // The learner's own translations win.
  const words = await db.words.bulkGet(norms.map((n) => wordId(lang, n)));
  words.forEach((w, i) => {
    if (!w?.gloss) return;
    const before = out.get(norms[i]);
    out.set(norms[i], before?.reading ? { text: w.gloss, lemma: before.lemma, source: 'user', reading: before.reading } : { text: w.gloss, lemma: before?.lemma, source: 'user' });
  });
  return out;
}

/**
 * Mandarin words missing from the pack, cut into the longest listed words from the left: 听不懂 is
 * 听 + 不 + 懂 ("to listen + not + to understand", tīng bù dǒng).
 */
async function composeChinese(pack: string, norms: string[]): Promise<Map<string, GlossInfo>> {
  const out = new Map<string, GlossInfo>();
  const pieces = new Set<string>();
  for (const n of norms) for (let i = 0; i < n.length; i++) for (let j = i + 1; j <= Math.min(n.length, i + 4); j++) if (j - i < n.length) pieces.add(n.slice(i, j));
  if (!pieces.size) return out;
  const keys = [...pieces];
  const rows = await db.dictForms.bulkGet(keys.map((k) => [pack, k] as [string, string]));
  const listed = new Map(keys.map((k, i) => [k, rows[i]]));
  for (const n of norms) {
    const parts: DictForm[] = [];
    for (let i = 0; i < n.length; ) {
      let hit: DictForm | undefined;
      for (let j = Math.min(n.length, i + 4); j > i && !hit; j--) hit = j - i < n.length ? listed.get(n.slice(i, j)) : undefined;
      if (!hit) break;
      parts.push(hit);
      i += hit.form.length;
    }
    if (parts.length < 2 || parts.reduce((len, p) => len + p.form.length, 0) !== n.length) continue;
    const first = (g: string) => g.split(/[;,]/)[0].trim();
    const reading = parts.every((p) => p.r) ? parts.map((p) => p.r).join(' ') : undefined;
    const info: GlossInfo = { text: parts.map((p) => first(p.g)).join(' + '), lemma: parts[0].lemmas[0], source: 'dict', via: parts.map((p) => p.form).join(' + ') };
    if (reading) info.reading = reading;
    out.set(n, info);
  }
  return out;
}

/**
 * Every sense of the forms that can mean different things (a noun and an adverb, two lemmas), so
 * the reader can pick the one the sentence needs. Forms with a single part of speech are left out.
 */
export async function lookupSenses(lang: string, norms: string[]): Promise<Map<string, SenseOption[]>> {
  const out = new Map<string, SenseOption[]>();
  if (!norms.length) return out;
  const pack = packId(lang);
  const forms = await db.dictForms.bulkGet(norms.map((n) => [pack, n] as [string, string]));
  const lemmas = new Set<string>();
  for (const f of forms) for (const l of f?.lemmas ?? []) lemmas.add(l);
  if (!lemmas.size) return out;
  const entries = await db.dictEntries.bulkGet([...lemmas].map((l) => [pack, l] as [string, string]));
  const byLemma = new Map(entries.filter((e) => e !== undefined).map((e) => [e.lemma, e]));
  forms.forEach((f, i) => {
    if (!f) return;
    const options: SenseOption[] = [];
    for (const lemma of f.lemmas) for (const s of byLemma.get(lemma)?.senses ?? []) if (s.glosses.length) options.push({ lemma, pos: s.pos, glosses: s.glosses });
    if (new Set(options.map((o) => o.pos)).size > 1) out.set(norms[i], options);
  });
  return out;
}

const inflight = new Map<string, Promise<string | null>>();

/** The code online translators know a language by (Mandarin as zh-CN, Norwegian Bokmål as no). */
export function onlineCode(lang: string, service: 'mymemory' | 'google'): string {
  if (lang === 'nb') return 'no';
  if (lang === 'zh') return service === 'mymemory' ? 'zh-CN' : 'zh';
  return lang;
}

async function myMemory(lang: string, text: string): Promise<string | null> {
  const params = new URLSearchParams({ q: text, langpair: `${onlineCode(lang, 'mymemory')}|${GLOSS_LANG}` });
  const res = await fetch(`https://api.mymemory.translated.net/get?${params}`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  const data = (await res.json()) as { responseData?: { translatedText?: string }; responseStatus?: number };
  const out = data.responseData?.translatedText?.trim();
  if (!out || data.responseStatus !== 200 || /MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(out)) return null;
  return out.toLocaleLowerCase(GLOSS_LANG) === text.toLocaleLowerCase(lang) ? null : out;
}

async function lingva(host: string, lang: string, text: string): Promise<string | null> {
  const res = await fetch(`${host.replace(/\/$/, '')}/api/v1/${onlineCode(lang, 'google')}/${GLOSS_LANG}/${encodeURIComponent(text)}`, { signal: AbortSignal.timeout(5000) });
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
