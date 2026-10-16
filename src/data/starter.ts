// Ready-made decks from the language pack: frequency bands (Top 100 → 10,000) and themed sets.
// A deck only exists once the learner adds it; until then the catalog reads the pack's lists.
import { useLiveQuery } from 'dexie-react-hooks';
import { frequencyBand, getTheme } from '@/core/lang/starter';
import { packId } from '@/core/packs/format';
import { normalizeWord } from '@/core/text/normalize';
import { db } from './db';
import type { LinguaDB } from './db';
import { createDeck, ensureFolder, makeNote } from './decks';
import type { NoteInput } from './decks';
import type { Deck, DictEntry, StarterList } from './types';
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

/** The words of a ready-made deck, with what the learner already knows. */
export async function starterItems(lang: string, spec: StarterSpec, database: LinguaDB = db): Promise<StarterItem[]> {
  const list = await database.starterLists.get(lang);
  if (!list) return [];
  const pack = packId(lang);

  let items: NoteInput[];
  let lemmas: string[];
  if (spec.kind === 'frequency') {
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
  const ids = items.map((it, i) => (/\s/.test(it.term) ? undefined : wordId(lang, spec.kind === 'frequency' ? lemmas[i] : normalizeWord(it.term, lang))));
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
      example: ex ? { text: ex[0], translation: ex[1] || undefined, cloze: [ex[2], ex[3]] as [number, number] } : undefined,
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
