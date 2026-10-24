// Ready-made decks from the language pack: frequency bands (Top 100 → 10,000) and themed sets.
// A deck only exists once the learner adds it; until then the catalog reads the pack's lists.
import { useLiveQuery } from 'dexie-react-hooks';
import { frequencyBand, getTheme, HEARD_THEME } from '@/core/lang/starter';
import { packId } from '@/core/packs/format';
import { normalizeWord } from '@/core/text/normalize';
import { db } from './db';
import type { LinguaDB } from './db';
import { createDeck, ensureFolder, makeNote, orderNewCards } from './decks';
import type { NoteInput } from './decks';
import type { Deck, DictEntry, SightingKind, StarterList } from './types';
import { wordId } from './words';

export const STARTER_FOLDER = 'Ready-made';

export type StarterSpec = { kind: 'frequency'; milestone: number } | { kind: 'theme'; id: string };

export const starterKey = (spec: StarterSpec) => (spec.kind === 'frequency' ? `top-${spec.milestone}` : `theme-${spec.id}`);

export function starterName(spec: StarterSpec): string {
  return spec.kind === 'frequency' ? `Top ${spec.milestone.toLocaleString('en')}` : (getTheme(spec.id)?.name ?? spec.id);
}

export function useStarterList(lang: string): StarterList | null | undefined {
  return useLiveQuery(async () => (await db.starterLists.get(lang)) ?? null, [lang]);
}

export interface StarterItem extends NoteInput {
  /** Already marked Known in the reader. */
  known: boolean;
  /** Already a card in one of the learner's decks. */
  inDeck: boolean;
}

/** "to be; to have" from a dictionary entry: its first sense's glosses, kept short. */
function shortMeaning(entry: DictEntry | undefined): string {
  const glosses = entry?.senses[0]?.glosses ?? [];
  let out = '';
  for (const g of glosses) {
    // Remove "(…)" from the innermost out, so nested notes don't leave a stray ")".
    let clean = g;
    for (let prev = ''; prev !== clean; ) [prev, clean] = [clean, clean.replace(/\s*\([^()]*\)/g, '')];
    clean = clean.replace(/[()]/g, '').trim();
    if (out.split('; ').includes(clean)) continue;
    if (!clean) continue;
    const next = out ? `${out}; ${clean}` : clean;
    if (next.length > 60 && out) break;
    out = next;
  }
  return out.length > 80 ? `${out.slice(0, 78).replace(/\s+\S*$/, '')}…` : out;
}

/** Where a word looked up counts as heard: songs, videos, podcasts and radio. */
const HEARD_KINDS = new Set<SightingKind>(['song', 'video', 'listening', 'radio']);
const HEARD_MAX = 100;

/** The words looked up while listening and watching, the most met first, each with a sentence it was heard in. */
async function heardWords(lang: string, database: LinguaDB): Promise<Array<{ lemma: string; surface?: string; sentence?: string; count: number }>> {
  const rows = (await database.sightings.where('[lang+at]').between([lang, 0], [lang, Infinity]).toArray()).filter((s) => !s.deletedAt && HEARD_KINDS.has(s.kind));
  const byLemma = new Map<string, { lemma: string; surface?: string; sentence?: string; count: number; at: number }>();
  for (const s of rows) {
    const lemma = s.lemma ?? s.norm;
    const seen = byLemma.get(lemma);
    if (!seen) byLemma.set(lemma, { lemma, surface: s.surface, sentence: s.sentence, count: s.count, at: s.at });
    else {
      seen.count += s.count;
      if (s.at > seen.at && s.sentence) Object.assign(seen, { surface: s.surface, sentence: s.sentence, at: s.at });
    }
  }
  return [...byLemma.values()].sort((a, b) => b.count - a.count || b.at - a.at).slice(0, HEARD_MAX);
}

/** "Me gusta tu canción" with "canción" → [11, 18], so the card can gap it. */
function clozeOf(sentence: string, surface: string | undefined): [number, number] | undefined {
  const at = surface ? sentence.toLowerCase().indexOf(surface.toLowerCase()) : -1;
  return at >= 0 ? [at, at + surface!.length] : undefined;
}

/** The words of a ready-made deck, with what the learner already knows. */
export async function starterItems(lang: string, spec: StarterSpec, database: LinguaDB = db): Promise<StarterItem[]> {
  const list = await database.starterLists.get(lang);
  if (!list) return [];
  const pack = packId(lang);

  let items: NoteInput[];
  let lemmas: string[];
  if (spec.kind === 'theme' && spec.id === HEARD_THEME) {
    // Computed from what the learner looked up (5.1-3b): the dictionary gives the meaning, the
    // sighting the sentence it was heard in.
    const heard = await heardWords(lang, database);
    lemmas = heard.map((h) => h.lemma);
    const [entries, forms] = await Promise.all([
      database.dictEntries.bulkGet(lemmas.map((l) => [pack, l] as [string, string])),
      database.dictForms.bulkGet(heard.map((h) => [pack, h.surface ? normalizeWord(h.surface, lang) : h.lemma] as [string, string])),
    ]);
    items = heard.map((h, i) => {
      const e = entries[i];
      const cloze = h.sentence ? clozeOf(h.sentence, h.surface) : undefined;
      return {
        term: e?.head ?? h.lemma,
        meaning: shortMeaning(e) || forms[i]?.g || '',
        lemma: h.lemma,
        pos: e?.senses[0]?.pos,
        gender: e?.gender,
        ipa: e?.ipa,
        example: h.sentence ? { text: h.sentence, cloze } : undefined,
        source: 'starter' as const,
      };
    });
  } else if (spec.kind === 'frequency') {
    const [from, to] = frequencyBand(spec.milestone);
    lemmas = list.lemmaFreq.slice(from - 1, to);
    const entries = await database.dictEntries.bulkGet(lemmas.map((l) => [pack, l] as [string, string]));
    items = lemmas.map((lemma, i) => {
      const e = entries[i];
      return {
        term: e?.head ?? lemma,
        meaning: shortMeaning(e),
        lemma,
        pos: e?.senses[0]?.pos,
        gender: e?.gender,
        ipa: e?.ipa,
        freqRank: from + i,
        source: 'starter' as const,
      };
    });
  } else {
    const rows = list.themes[spec.id] ?? [];
    lemmas = rows.map(([term]) => normalizeWord(term, lang));
    const entries = await database.dictEntries.bulkGet(lemmas.map((l) => [pack, l] as [string, string]));
    items = rows.map(([term, meaning, pos, gender], i) => ({
      term,
      meaning,
      lemma: entries[i] ? lemmas[i] : undefined,
      pos: pos || undefined,
      gender: gender || undefined,
      ipa: entries[i]?.ipa,
      source: 'starter' as const,
    }));
  }

  // Single words link to the reader's word states; phrases ("buenos días") stand alone.
  const byLemma = spec.kind === 'frequency' || spec.id === HEARD_THEME;
  const ids = items.map((it, i) => (/\s/.test(it.term) ? undefined : wordId(lang, byLemma ? lemmas[i] : normalizeWord(it.term, lang))));
  const [examples, words, existing] = await Promise.all([
    database.dictExamples.bulkGet(lemmas.map((l) => [pack, l] as [string, string])),
    database.words.bulkGet(ids.map((id) => id ?? '')),
    database.notes.where('wordId').anyOf(ids.filter((id): id is string => Boolean(id))).toArray(),
  ]);
  const inDecks = new Set(existing.filter((n) => !n.deletedAt).map((n) => n.wordId));

  return items.map((item, i) => {
    const ex = examples[i]?.ex[0];
    const word = words[i];
    return {
      ...item,
      wordId: ids[i],
      example: item.example ?? (ex ? { text: ex[0], translation: ex[1] || undefined, cloze: [ex[2], ex[3]] as [number, number] } : undefined),
      known: Boolean(word && !word.deletedAt && word.state === 1),
      inDeck: Boolean(ids[i] && inDecks.has(ids[i])),
    };
  });
}

/** The learner's ready-made decks, by starterKey. */
export function useStarterDecks(lang: string): Map<string, Deck> | undefined {
  return useLiveQuery(async () => {
    const decks = (await db.decks.where('lang').equals(lang).toArray()).filter((d) => !d.deletedAt && d.starter);
    return new Map(decks.map((d) => [d.starter!.theme ? `theme-${d.starter!.theme}` : `top-${d.starter!.rankTo}`, d]));
  }, [lang]);
}

export interface ThemeStat {
  size: number;
  known: number;
  /** The middle frequency rank of its words: lower is easier (Discover's "Easiest first" and levels). */
  rank: number;
}

/** Unranked words count as this rare. */
const UNRANKED = 20_000;

/** For each ready-made theme (and the words heard in songs and shows): its size, how much is known, how common its words are. */
export function useThemeStats(lang: string): Map<string, ThemeStat> | undefined {
  return useLiveQuery(async () => {
    const out = new Map<string, ThemeStat>();
    const list = await db.starterLists.get(lang);
    if (!list) return out;
    const rankOf = new Map(list.lemmaFreq.map((l, i) => [l, i + 1]));
    const heard = await heardWords(lang, db);
    const sets: Array<[string, string[][]]> = Object.entries(list.themes).map(([id, rows]) => [id, rows.map(([term]) => term.split(/\s+/).map((w) => normalizeWord(w, lang)))]);
    sets.push([HEARD_THEME, heard.map((h) => [h.lemma])]);
    const singles = [...new Set(sets.flatMap(([, rows]) => rows.filter((r) => r.length === 1).map((r) => r[0])))];
    const words = await db.words.bulkGet(singles.map((w) => wordId(lang, w)));
    const known = new Set(singles.filter((_, i) => words[i] && !words[i]!.deletedAt && words[i]!.state === 1));
    for (const [id, rows] of sets) {
      const ranks = rows.map((r) => Math.max(...r.map((w) => rankOf.get(w) ?? UNRANKED))).sort((a, b) => a - b);
      out.set(id, { size: rows.length, known: rows.filter((r) => r.length === 1 && known.has(r[0])).length, rank: ranks.length ? ranks[Math.floor(ranks.length / 2)] : UNRANKED });
    }
    return out;
  }, [lang]);
}

/** Share of each frequency band already Known, for the milestone path. */
export function useFrequencyProgress(lang: string, milestones: readonly number[]): Map<number, number> | undefined {
  return useLiveQuery(async () => {
    const list = await db.starterLists.get(lang);
    if (!list) return new Map<number, number>();
    const words = await db.words.bulkGet(list.lemmaFreq.slice(0, milestones[milestones.length - 1]).map((l) => wordId(lang, l)));
    const out = new Map<number, number>();
    for (const m of milestones) {
      const [from, to] = frequencyBand(m);
      const band = words.slice(from - 1, to);
      const known = band.filter((w) => w && !w.deletedAt && w.state === 1).length;
      out.set(m, band.length ? known / band.length : 0);
    }
    return out;
  }, [lang, milestones.join(',')]);
}

export interface AddedStarter {
  deckId: string;
  added: number;
  skippedKnown: number;
  skippedInDeck: number;
}

/**
 * Adds a ready-made deck's words to a deck the learner already has (5.1-3b): words already in that
 * deck are skipped (known ones too, if asked), and the new cards come after the deck's own.
 */
export async function addStarterToDeck(lang: string, spec: StarterSpec, deckId: string, opts: { skipKnown: boolean }, database: LinguaDB = db): Promise<AddedStarter> {
  const deck = await database.decks.get(deckId);
  if (!deck || deck.deletedAt) throw new Error('That deck isn’t there any more.');
  const [items, notes] = await Promise.all([starterItems(lang, spec, database), database.notes.where('deckId').equals(deckId).toArray()]);
  const live = notes.filter((n) => !n.deletedAt);
  const ids = new Set(live.map((n) => n.wordId).filter(Boolean));
  const terms = new Set(live.map((n) => normalizeWord(n.term, lang)));
  const there = (item: StarterItem) => Boolean(item.wordId && ids.has(item.wordId)) || terms.has(normalizeWord(item.term, lang));
  const usable = items.filter((it) => it.meaning);
  const keep = usable.filter((it) => !there(it) && !(opts.skipKnown && it.known));
  const now = Date.now();
  const built = keep.map((item, i) => {
    const { known: _k, inDeck: _d, ...input } = item;
    const made = makeNote(deck, input, now);
    for (const c of made.cards) c.due = now + i;
    return made;
  });
  await database.transaction('rw', database.notes, database.cards, async () => {
    await database.notes.bulkAdd(built.map((b) => b.note));
    await database.cards.bulkAdd(built.flatMap((b) => b.cards));
  });
  if (built.length && deck.config.newOrder === 'shuffled') await orderNewCards(deckId, 'shuffled', Math.random, database);
  return {
    deckId,
    added: built.length,
    skippedKnown: opts.skipKnown ? usable.filter((it) => it.known && !there(it)).length : 0,
    skippedInDeck: usable.filter(there).length,
  };
}

/** Creates a ready-made deck in the "Ready-made" folder (once; adding again returns the same deck). */
export async function addStarterDeck(lang: string, spec: StarterSpec, opts: { skipKnown: boolean }, database: LinguaDB = db): Promise<AddedStarter> {
  const key = starterKey(spec);
  const existing = (await database.decks.where('lang').equals(lang).toArray()).find(
    (d) => !d.deletedAt && d.starter && (d.starter.theme ? `theme-${d.starter.theme}` : `top-${d.starter.rankTo}`) === key,
  );
  if (existing) return { deckId: existing.id, added: 0, skippedKnown: 0, skippedInDeck: 0 };

  const items = await starterItems(lang, spec, database);
  const keep = items.filter((it) => !it.inDeck && !(opts.skipKnown && it.known) && it.meaning);
  const folderId = await ensureFolder(lang, STARTER_FOLDER, database);
  const [rankFrom, rankTo] = spec.kind === 'frequency' ? frequencyBand(spec.milestone) : [undefined, undefined];
  const deckId = await createDeck(
    lang,
    {
      name: starterName(spec),
      folderId,
      kind: spec.kind === 'frequency' ? 'starterFrequency' : 'starterTheme',
      description: spec.kind === 'frequency' ? `The ${rankFrom}–${rankTo}th most common words` : getTheme(spec.id)?.blurb,
      starter: { packId: packId(lang), rankFrom, rankTo, theme: spec.kind === 'theme' ? spec.id : undefined, materialized: 1 },
    },
    database,
  );
  const deck = (await database.decks.get(deckId))!;
  const now = Date.now();
  // New cards are shown in list order (most common first): their due times keep that order.
  const built = keep.map((item, i) => {
    const { known: _k, inDeck: _d, ...input } = item;
    const made = makeNote(deck, input, now);
    for (const c of made.cards) c.due = now + i;
    return made;
  });
  await database.transaction('rw', database.notes, database.cards, async () => {
    await database.notes.bulkAdd(built.map((b) => b.note));
    await database.cards.bulkAdd(built.flatMap((b) => b.cards));
  });
  return {
    deckId,
    added: built.length,
    skippedKnown: opts.skipKnown ? items.filter((it) => it.known && !it.inDeck).length : 0,
    skippedInDeck: items.filter((it) => it.inDeck).length,
  };
}
