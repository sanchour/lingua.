// Sentences with a gap (4.0-2, after Clozemaster): a real sentence with one word missing, from the
// language pack's examples (with their translation) or from where you met the word. Your own words
// come first (a deck's own cards when it's played from a deck, then Learning, then words you looked
// up), then words around your level by frequency. It is a Ludus mode.
import type { Level } from '@/core/lang/levels';
import { packId } from '@/core/packs/format';
import { db } from './db';
import type { LinguaDB } from './db';
import type { SightingKind } from './types';

export type GapLevel = 'choose' | 'type' | 'hard';

export interface GapSentence {
  id: string;
  /** The word as it stands in the sentence (the answer). */
  answer: string;
  lemma: string;
  before: string;
  after: string;
  translation?: string;
  gloss?: string;
  /** Where it came from: one of your words (and where you met it), or the frequency list. */
  from: 'deck' | 'learning' | 'memory' | 'level';
  metIn?: { kind: SightingKind; title: string };
  options?: string[];
}

/** Frequency ranks to practise at each level; `hard` reaches one band further. */
const BANDS: Record<Level, [number, number]> = { A0: [1, 800], A1: [1, 1200], A2: [500, 2500], B1: [1500, 4500], B2: [3000, 8000], C1: [6000, 10000] };
const ORDER: Level[] = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1'];

const shuffle = <T,>(items: T[], random = Math.random) => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** A sentence cut around [start, end), or null when the span isn't a word in it. */
export function cut(sentence: string, start: number, end: number): { before: string; answer: string; after: string } | null {
  if (start < 0 || end > sentence.length || start >= end) return null;
  const answer = sentence.slice(start, end).trim();
  if (!answer || /\s/.test(answer) || answer.length > 24) return null;
  return { before: sentence.slice(0, start), answer, after: sentence.slice(end) };
}

/** Where a word stands in a sentence of its own (as met, case aside), as a span. */
export function locate(sentence: string, word: string, lang: string): [number, number] | null {
  const at = sentence.toLocaleLowerCase(lang).indexOf(word.toLocaleLowerCase(lang));
  return at < 0 ? null : [at, at + word.length];
}

/** Three wrong choices: other answers of the round of a similar length, never the answer itself. */
export function distractors(answer: string, pool: string[], lang: string, random = Math.random): string[] {
  const key = answer.toLocaleLowerCase(lang);
  const others = [...new Set(pool.filter((w) => w.toLocaleLowerCase(lang) !== key))];
  const near = shuffle(others, random).sort((a, b) => Math.abs(a.length - answer.length) - Math.abs(b.length - answer.length));
  return near.slice(0, 3);
}

/** One round of sentences: the deck's words first (if any), then your words, then words of your level. */
export async function buildGapRound(lang: string, level: Level, gapLevel: GapLevel, size = 15, deckId: string | null = null, database: LinguaDB = db): Promise<GapSentence[]> {
  const pack = packId(lang);
  const round: GapSentence[] = [];
  const used = new Set<string>();

  const fromPack = async (lemma: string): Promise<Omit<GapSentence, 'id' | 'from'> | null> => {
    const ex = (await database.dictExamples.get([pack, lemma]))?.ex ?? [];
    for (const [sentence, translation, start, end] of shuffle(ex)) {
      if (sentence.length > (gapLevel === 'hard' ? 160 : 110)) continue;
      const parts = cut(sentence, start, end);
      if (parts) return { ...parts, lemma, translation: translation || undefined };
    }
    return null;
  };

  // 0. The deck's own cards: their example (with its gap), the sentence they were met in, or the pack's.
  if (deckId) {
    const notes = shuffle((await database.notes.where('deckId').equals(deckId).toArray()).filter((n) => !n.deletedAt && n.lang === lang));
    for (const n of notes) {
      if (round.length >= Math.ceil(size * 0.8)) break;
      const lemma = n.lemma || n.term;
      if (used.has(lemma)) continue;
      let parts: ReturnType<typeof cut> = null;
      let translation: string | undefined;
      if (n.example?.cloze) {
        parts = cut(n.example.text, n.example.cloze[0], n.example.cloze[1]);
        translation = n.example.translation;
      }
      for (const sentence of [n.example?.text, n.context?.sentence]) {
        if (parts || !sentence || sentence.length > 160) continue;
        const span = locate(sentence, n.term, lang);
        if (span) parts = cut(sentence, span[0], span[1]);
        if (parts && sentence === n.example?.text) translation = n.example.translation;
      }
      const item = parts ? { ...parts, lemma, translation } : await fromPack(lemma);
      if (!item) continue;
      used.add(lemma);
      round.push({ ...item, id: `${lemma}:${round.length}`, from: 'deck', gloss: n.meaning || undefined });
    }
  }

  // 1. Words you're learning, then words you looked up, newest first.
  const learning = (await database.words.where('[lang+state]').equals([lang, 2]).toArray()).filter((w) => !w.deletedAt);
  const sightings = (await database.sightings.where('[lang+at]').between([lang, 0], [lang, Infinity]).reverse().limit(400).toArray()).filter((s) => !s.deletedAt);
  const metIn = new Map<string, (typeof sightings)[number]>();
  for (const s of sightings) if (!metIn.has(s.lemma ?? s.norm)) metIn.set(s.lemma ?? s.norm, s);
  const mine: Array<{ lemma: string; norm: string; from: GapSentence['from']; gloss?: string }> = [
    ...shuffle(learning).map((w) => ({ lemma: w.lemma ?? '', norm: w.norm, from: 'learning' as const, gloss: w.gloss })),
    ...[...metIn.values()].map((s) => ({ lemma: s.lemma ?? s.norm, norm: s.norm, from: 'memory' as const })),
  ];
  for (const w of mine) {
    if (round.length >= Math.ceil(size * 0.6)) break;
    const lemma = w.lemma || (await database.dictForms.get([pack, w.norm]))?.lemmas[0] || w.norm;
    if (used.has(lemma)) continue;
    let item = await fromPack(lemma);
    const seen = metIn.get(lemma) ?? metIn.get(w.norm);
    // No example in the pack: the sentence you met it in.
    if (!item && seen?.sentence) {
      const span = locate(seen.sentence, seen.surface ?? seen.norm, lang);
      const parts = span && seen.sentence.length <= 160 ? cut(seen.sentence, span[0], span[1]) : null;
      if (parts) item = { ...parts, lemma };
    }
    if (!item) continue;
    used.add(lemma);
    round.push({ ...item, id: `${lemma}:${round.length}`, from: w.from, gloss: w.gloss, metIn: seen ? { kind: seen.kind, title: seen.title } : undefined });
  }

  // 2. Words around your level, by frequency.
  const freq = (await database.starterLists.get(lang))?.lemmaFreq ?? [];
  const at = ORDER.indexOf(level);
  const [from, to] = BANDS[gapLevel === 'hard' ? ORDER[Math.min(ORDER.length - 1, at + 1)] : level];
  const band = shuffle(freq.slice(from - 1, to));
  for (const lemma of band) {
    if (round.length >= size) break;
    if (used.has(lemma)) continue;
    const item = await fromPack(lemma);
    if (!item) continue;
    used.add(lemma);
    round.push({ ...item, id: `${lemma}:${round.length}`, from: 'level' });
  }

  // Glosses for the answers, and choices for the first level.
  const glosses = await database.frequency.bulkGet(round.map((r) => `${lang}:${r.answer.toLocaleLowerCase(lang)}`));
  const pool = round.map((r) => r.answer);
  return round.map((r, i) => ({ ...r, gloss: r.gloss ?? glosses[i]?.gloss, options: gapLevel === 'choose' ? shuffle([r.answer, ...distractors(r.answer, pool, lang)]) : undefined }));
}
