// Grammatica's drills: every exercise of a grammar lesson, made from a topic's items and tables.
// Pure and deterministic for a given random source (like core/srs/ludus.ts), so lessons can be
// tested. The lesson screen renders them; data/grammar.ts turns each item's results into a grade.
import { seededRandom, shuffle } from '@/core/srs/ludus';
import { GRAMMAR_LEVELS, plain, splitFocus, topicsOf } from './types';
import type { Grammar, GrammarLevel, GrammarTable, Item, Topic } from './types';
import type { Step } from './progress';

export { seededRandom, shuffle };

/**
 * The kinds of exercise, by step: 1 recognise (which sentence is right; hear it and pick the form;
 * match a table's pairs), 2 pick (the gap from four forms; complete the table), 3 build (type the
 * form), 4 use (put the words in order; tap the wrong word), 5 say it (build it from English).
 */
export type DrillKind = 'recognise' | 'hear' | 'pairs' | 'pick' | 'table' | 'build' | 'order' | 'spot' | 'say' | 'own';

export const DRILL_KINDS: DrillKind[] = ['recognise', 'hear', 'pairs', 'pick', 'table', 'build', 'order', 'spot', 'say', 'own'];

export const DRILL_STEP: Record<DrillKind, Step> = { recognise: 1, hear: 1, pairs: 1, pick: 2, table: 2, build: 3, order: 4, spot: 4, say: 5, own: 5 };

export const DRILL_LABEL: Record<DrillKind, string> = {
  recognise: 'Which sentence is right?',
  hear: 'Which form do you hear?',
  pairs: 'Match the pairs',
  pick: 'Fill the gap',
  table: 'Complete the table',
  build: 'Type the form',
  order: 'Put the words in order',
  spot: 'Tap the wrong word',
  say: 'Say it in the language',
  own: 'Your own sentence',
};

/** Short names for the setup sheet. */
export const DRILL_NAME: Record<DrillKind, string> = {
  recognise: 'Right or wrong',
  hear: 'Listening',
  pairs: 'Pairs',
  pick: 'Gaps',
  table: 'Tables',
  build: 'Typing',
  order: 'Word order',
  spot: 'Spot the mistake',
  say: 'From English',
  own: 'Own sentence (AI)',
};

interface Base {
  /** Unique within a lesson. */
  key: string;
  topic: string;
}

export type Drill = Base &
  (
    | { kind: 'recognise'; item: Item; options: string[]; answer: number }
    | { kind: 'hear'; item: Item; options: string[]; answer: number }
    | { kind: 'pick'; item: Item; before: string; after: string; options: string[]; answer: number }
    | { kind: 'build'; item: Item; before: string; after: string }
    | { kind: 'order'; item: Item; tiles: string[]; answer: string[] }
    | { kind: 'spot'; item: Item; tokens: string[]; wrongAt: number }
    | { kind: 'say'; item: Item; tiles: string[]; answer: string[] }
    | { kind: 'table'; table: GrammarTable; row: number; col: number; options: string[]; answer: number }
    | { kind: 'pairs'; table: GrammarTable; pairs: Array<[string, string]> }
    /** A sentence of the learner's own using the topic, checked by the AI (with a key). */
    | { kind: 'own'; example: Item }
  );

export type ItemDrill = Extract<Drill, { item: Item }>;
export const hasItem = (d: Drill): d is ItemDrill => 'item' in d;

// ── Text ────────────────────────────────────────────────────────────────────

/** Languages written without spaces between words: tiles come from Intl.Segmenter. */
const UNSPACED = new Set(['zh', 'ja']);
const joiner = (lang: string) => (UNSPACED.has(lang) ? '' : ' ');

/** Russian stress marks would give the answer away (the wrong forms have none): forms drop them. */
export function bare(form: string, lang: string): string {
  return lang === 'ru' || lang === 'uk' ? form.normalize('NFD').replace(/[̀́]/g, '').normalize('NFC') : form;
}

const EDGE = /^[¿¡"'«»„“”‚‘(\-–—]+|[.,;:!?"'«»“”’)…؟،؛。，！？：；、\-–—]+$/gu;

function spacedTokens(text: string): string[] {
  return text
    .split(/\s+/)
    .map((w) => w.replace(EDGE, ''))
    .filter((w) => /\p{L}|\p{N}/u.test(w));
}

function segmentedTokens(text: string, lang: string): string[] {
  if (typeof Intl === 'undefined' || !('Segmenter' in Intl)) return [...text].filter((c) => /\p{L}|\p{N}/u.test(c));
  const seg = new Intl.Segmenter(lang, { granularity: 'word' });
  return [...seg.segment(text)].filter((s) => s.isWordLike).map((s) => s.segment);
}

const tokensOf = (text: string, lang: string) => (UNSPACED.has(lang) ? segmentedTokens(text, lang) : spacedTokens(text));

/**
 * The sentence as tiles, its bracketed form one tile (stress marks off), with the form's index;
 * null when the form is glued to a neighbouring word ("d’[un]"), so it can't stand as a tile.
 */
export function sentenceTiles(item: Item, lang: string): { tokens: string[]; at: number } | null {
  const { before, focus, after } = splitFocus(item.s);
  if (!focus) return null;
  if (!UNSPACED.has(lang) && (/[\p{L}\p{N}’']$/u.test(before) || /^[\p{L}\p{N}’']/u.test(after))) return null;
  const head = tokensOf(before, lang);
  const tail = tokensOf(after, lang);
  return { tokens: [...head, bare(focus, lang), ...tail], at: head.length };
}

/** The tiles joined back into a sentence, for showing and for comparing. */
export const joinTiles = (tiles: string[], lang: string) => tiles.join(joiner(lang));

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC');

function clean(s: string, lang: string): string {
  return bare(s, lang)
    .normalize('NFC')
    .toLocaleLowerCase(lang)
    .split(/\s+/)
    .map((w) => w.replace(EDGE, ''))
    .filter(Boolean)
    .join(' ');
}

/** Tiles compared word for word, without case (the first word's capital) or stress marks. */
export const tilesMatch = (picked: string[], answer: string[], lang: string) =>
  picked.length === answer.length && picked.every((t, i) => clean(t, lang) === clean(answer[i], lang));

export interface FormCheck {
  verdict: 'exact' | 'close' | 'wrong';
  /** The form as written in the sentence. */
  expected: string;
  note?: 'accent';
}

/**
 * A typed form. Case and punctuation never count. Missing accents are forgiven (with a note) unless a
 * wrong form is spelled the same without them (hablo, habló); Arabic vowel marks likewise, silently.
 */
export function checkForm(typed: string, item: Item, lang: string): FormCheck {
  const { focus } = splitFocus(item.s);
  const input = clean(typed, lang);
  const target = clean(focus, lang);
  if (!input) return { verdict: 'wrong', expected: focus };
  if (input === target) return { verdict: 'exact', expected: focus };
  if (fold(input) === fold(target) && !item.wrong.some((w) => fold(clean(w, lang)) === fold(target))) {
    return lang === 'ar' ? { verdict: 'exact', expected: focus } : { verdict: 'close', expected: focus, note: 'accent' };
  }
  return { verdict: 'wrong', expected: focus };
}

/** The sentence with another form in its gap. */
const withForm = (item: Item, form: string) => {
  const { before, after } = splitFocus(item.s);
  return before + form + after;
};

/** The right form and the three wrong ones, shuffled; stress marks off so none stands out. */
function formChoice(item: Item, lang: string, random: () => number) {
  const right = bare(splitFocus(item.s).focus, lang);
  const options = shuffle([right, ...item.wrong.map((w) => bare(w, lang))], random);
  return { options, answer: options.indexOf(right) };
}

// ── Tables ──────────────────────────────────────────────────────────────────

const usableCell = (c: string | undefined) => Boolean(c && c.length <= 24 && !/[/()…*]|\.\.\./.test(c) && c.trim() !== '—' && c.trim() !== '-');

/** A table's cells that can be hidden or matched: short, without alternatives or notes. */
function cellsOf(table: GrammarTable): Array<{ row: number; col: number; value: string }> {
  const out: Array<{ row: number; col: number; value: string }> = [];
  table.rows.forEach((r, row) => r.forEach((value, col) => col > 0 && usableCell(value) && out.push({ row, col, value })));
  return out;
}

/** Tables with at least four different usable cells (a gap needs three wrong ones). */
export const drillableTables = (topic: Topic) => (topic.tables ?? []).filter((t) => new Set(cellsOf(t).map((c) => c.value)).size >= 4);

function tableDrill(topic: Topic, random: () => number, key: string): Drill | null {
  const table = shuffle(drillableTables(topic), random)[0];
  if (!table) return null;
  const cells = cellsOf(table);
  const hidden = cells[Math.floor(random() * cells.length)];
  const sameColumn = cells.filter((c) => c.col === hidden.col);
  const ranked = [...shuffle(sameColumn, random), ...shuffle(cells, random)];
  const wrong: string[] = [];
  for (const c of ranked) if (c.value !== hidden.value && !wrong.includes(c.value) && wrong.length < 3) wrong.push(c.value);
  const options = shuffle([hidden.value, ...wrong], random);
  return { key, topic: topic.id, kind: 'table', table, row: hidden.row, col: hidden.col, options, answer: options.indexOf(hidden.value) };
}

function pairsDrill(topic: Topic, random: () => number, key: string): Drill | null {
  for (const table of shuffle(drillableTables(topic), random)) {
    const width = Math.max(...table.rows.map((r) => r.length));
    for (const col of shuffle(Array.from({ length: width - 1 }, (_, i) => i + 1), random)) {
      const seenL = new Set<string>();
      const seenR = new Set<string>();
      const pairs: Array<[string, string]> = [];
      for (const r of shuffle(table.rows, random)) {
        const left = r[0]?.trim();
        const right = r[col];
        if (!left || !usableCell(right) || seenL.has(left) || seenR.has(right)) continue;
        seenL.add(left);
        seenR.add(right);
        pairs.push([left, right]);
        if (pairs.length >= 5) break;
      }
      if (pairs.length >= 3) return { key, topic: topic.id, kind: 'pairs', table, pairs };
    }
  }
  return null;
}

// ── One exercise ────────────────────────────────────────────────────────────

/** Every word of the sentence, the form's words too: word order is about all of them. */
export const orderTiles = (item: Item, lang: string) => tokensOf(plain(item.s), lang);

const canOrder = (item: Item, lang: string) => {
  const n = orderTiles(item, lang).length;
  return n >= 3 && n <= 9;
};
const canSay = (item: Item, lang: string) => {
  const t = sentenceTiles(item, lang);
  return Boolean(t && t.tokens.length >= 3 && t.tokens.length <= 10 && item.en);
};
/** One wrong word to find: the form must be one word (a short one in Mandarin), or it stands out. */
const oneWord = (form: string, lang: string) => (UNSPACED.has(lang) ? [...form].length <= 2 : !/s/.test(form.trim()));
const canSpot = (item: Item, lang: string) => {
  const t = sentenceTiles(item, lang);
  return Boolean(t && t.tokens.length >= 3 && oneWord(splitFocus(item.s).focus, lang) && item.wrong.every((w) => oneWord(w, lang)));
};

/** Whether an item can be drilled this way at all (tiles need a sentence that splits cleanly). */
export function fits(kind: DrillKind, item: Item, lang: string): boolean {
  if (kind === 'order') return canOrder(item, lang);
  if (kind === 'say') return canSay(item, lang);
  if (kind === 'spot') return canSpot(item, lang);
  return kind !== 'table' && kind !== 'pairs' && kind !== 'own';
}

export function itemDrill(kind: DrillKind, item: Item, topic: string, lang: string, random: () => number, key: string): ItemDrill {
  switch (kind) {
    case 'recognise': {
      const right = plain(withForm(item, bare(splitFocus(item.s).focus, lang)));
      const wrongForm = bare(item.wrong[Math.floor(random() * 3)], lang);
      const options = shuffle([right, plain(withForm(item, wrongForm))], random);
      return { key, topic, kind, item, options, answer: options.indexOf(right) };
    }
    case 'hear':
      return { key, topic, kind, item, ...formChoice(item, lang, random) };
    case 'pick': {
      const { before, after } = splitFocus(item.s);
      return { key, topic, kind, item, before, after, ...formChoice(item, lang, random) };
    }
    case 'order': {
      const answer = orderTiles(item, lang);
      let tiles = shuffle(answer, random);
      // A shuffle that leaves the sentence as it was is no exercise.
      for (let i = 0; i < 4 && tilesMatch(tiles, answer, lang); i++) tiles = shuffle(answer, random);
      return { key, topic, kind, item, tiles, answer };
    }
    case 'spot': {
      const { tokens, at } = sentenceTiles(item, lang)!;
      const out = [...tokens];
      out[at] = bare(item.wrong[Math.floor(random() * 3)], lang);
      return { key, topic, kind, item, tokens: out, wrongAt: at };
    }
    case 'say': {
      const answer = sentenceTiles(item, lang)!.tokens;
      const extra = shuffle(item.wrong, random)
        .map((w) => bare(w, lang))
        .filter((w) => !answer.some((a) => clean(a, lang) === clean(w, lang)))
        .slice(0, 2);
      return { key, topic, kind, item, tiles: shuffle([...answer, ...extra], random), answer };
    }
    case 'build':
    default: {
      const { before, after } = splitFocus(item.s);
      return { key, topic, kind: 'build', item, before, after };
    }
  }
}

// ── Lessons ─────────────────────────────────────────────────────────────────

export interface DrillOptions {
  random: () => number;
  /** A voice can read the language aloud (for "which form do you hear?"). */
  canHear?: boolean;
  /** Typing exercises; off turns them into choices. */
  typing?: boolean;
  /** Kinds the learner turned off in the setup sheet. */
  off?: ReadonlySet<DrillKind>;
  /** How many exercises (before retries); 10 by default. */
  size?: number;
  /** An AI key is set: a last exercise asks for a sentence of the learner's own. */
  canWrite?: boolean;
  /** Items due from other topics, mixed in (at most three). */
  due?: ReviewEntry[];
}

/** What an exercise of this kind becomes when it can't be made for an item, or is turned off. */
const FALLBACK: Record<DrillKind, DrillKind> = { recognise: 'pick', hear: 'recognise', pairs: 'recognise', pick: 'recognise', table: 'pick', build: 'pick', order: 'spot', spot: 'pick', say: 'build', own: 'say' };

/** The kind an item gets, given the kinds wanted: unusable or switched-off kinds fall back. */
export function resolveKind(kind: DrillKind, item: Item, lang: string, opts: DrillOptions): DrillKind {
  let k = kind;
  for (let i = 0; i < 6; i++) {
    const blocked = (k === 'hear' && !opts.canHear) || (k === 'build' && opts.typing === false) || opts.off?.has(k) || !fits(k, item, lang);
    if (!blocked) return k;
    k = FALLBACK[k];
  }
  // Every way is switched off: the plainest exercise still teaches the form.
  return fits(k, item, lang) && k !== 'table' && k !== 'pairs' ? k : 'pick';
}

const ITEM_KINDS: Record<Step, DrillKind[]> = {
  1: ['recognise', 'recognise', 'hear'],
  2: ['pick'],
  3: ['build'],
  4: ['order', 'spot'],
  5: ['say'],
};

/**
 * A lesson on one topic at one step: up to `size` of its items, each as an exercise of that step,
 * with a pairs warm-up (step 1) or a table to complete (step 2) when the topic has a table for it.
 * `step: 'mix'` (a learned topic's practice) draws each item's kind from steps 2–5.
 */
export function planTopicLesson(topic: Topic, lang: string, step: Step | 'mix', opts: DrillOptions): Drill[] {
  const { random } = opts;
  const size = opts.size ?? 10;
  let n = 0;
  const key = () => `${topic.id}-${n++}`;
  const out: Drill[] = [];

  if (step === 1 && !opts.off?.has('pairs')) {
    const p = pairsDrill(topic, random, key());
    if (p) out.push(p);
  }
  const items = shuffle(topic.items, random);
  // Short topics go round twice, so a lesson is never only four exercises.
  const chosen = items.length >= size ? items.slice(0, size) : [...items, ...shuffle(items, random)].slice(0, Math.max(items.length, Math.min(size, items.length * 2)));
  const seen = new Set<string>();
  for (const item of chosen) {
    const kinds = step === 'mix' ? ITEM_KINDS[(2 + Math.floor(random() * 4)) as Step] : ITEM_KINDS[step];
    let kind = resolveKind(kinds[Math.floor(random() * kinds.length)], item, lang, opts);
    // An item met twice is met two ways.
    const id = `${item.s}|${kind}`;
    if (seen.has(id)) kind = resolveKind(FALLBACK[kind], item, lang, opts);
    seen.add(`${item.s}|${kind}`);
    out.push(itemDrill(kind, item, topic.id, lang, random, key()));
  }
  if ((step === 2 || step === 'mix') && !opts.off?.has('table')) {
    const t = tableDrill(topic, random, key());
    if (t) out.splice(Math.min(out.length, 3 + Math.floor(random() * 3)), 0, t);
  }
  // What's due elsewhere comes in near the end, in the steps its topics have passed.
  const due = (opts.due ?? []).filter((e) => e.topic.id !== topic.id).slice(0, 3);
  if (due.length) out.push(...planReview(due, lang, { ...opts, due: undefined }).map((d) => ({ ...d, key: `${topic.id}-due-${n++}` })));
  if ((step === 5 || step === 'mix') && opts.canWrite && !opts.off?.has('own')) out.push({ key: key(), topic: topic.id, kind: 'own', example: shuffle(topic.items, random)[0] });
  return out;
}

export interface ReviewEntry {
  topic: Topic;
  item: Item;
  /** The highest step the topic has passed (1–5). */
  passed: number;
}

/** Due items across topics, each as an exercise from one of the last two steps its topic passed. */
export function planReview(entries: ReviewEntry[], lang: string, opts: DrillOptions): Drill[] {
  const { random } = opts;
  return shuffle(entries, random).map(({ topic, item, passed }, i) => {
    const top = Math.max(1, Math.min(5, passed));
    const s = Math.max(1, top - Math.floor(random() * 2)) as Step;
    const kinds = ITEM_KINDS[s];
    return itemDrill(resolveKind(kinds[Math.floor(random() * kinds.length)], item, lang, opts), item, topic.id, lang, random, `rv-${i}`);
  });
}

/** Lightning: quick choices only (a gap or right-or-wrong), as many as a minute holds. */
export function planLightning(topics: Topic[], lang: string, random: () => number, count = 60): Drill[] {
  const pool = topics.flatMap((t) => t.items.map((item) => ({ topic: t.id, item })));
  if (!pool.length) return [];
  const out: Drill[] = [];
  let deck = shuffle(pool, random);
  for (let i = 0; i < count; i++) {
    if (!deck.length) deck = shuffle(pool, random);
    const { topic, item } = deck.pop()!;
    out.push(itemDrill(random() < 0.65 ? 'pick' : 'recognise', item, topic, lang, random, `lz-${i}`));
  }
  return out;
}

/** A missed exercise again, later in the lesson, with its options or tiles reshuffled. */
export function retryDrill(d: Drill, random: () => number, seq: number): Drill {
  const key = `${d.key}-r${seq}`;
  if ('options' in d) {
    const options = shuffle(d.options, random);
    return { ...d, key, options, answer: options.indexOf(d.options[d.answer]) } as Drill;
  }
  if (d.kind === 'order' || d.kind === 'say') return { ...d, key, tiles: shuffle(d.tiles, random) };
  return { ...d, key };
}

/** The correct answer, written out, for the feedback bar. */
export function solutionOf(d: Drill, lang: string): string {
  switch (d.kind) {
    case 'table':
      return d.options[d.answer];
    case 'pairs':
    case 'own':
      return '';
    default:
      return plain(d.item.s) || joinTiles(sentenceTiles(d.item, lang)?.tokens ?? [], lang);
  }
}

/** How many topics the placement check asks about, at most (two quick gaps each). */
export const PLACEMENT_TOPICS = 12;

/**
 * The placement check: two quick gaps for each topic not yet learned, in teaching order, up to one
 * level above the learner's (A0 counts as A1). Both right marks a topic as known.
 */
export function planPlacement(grammar: Grammar, lang: string, progress: Map<string, { step: number }>, learnerLevel: string, random: () => number): Drill[] {
  const rank = (l: string) => Math.max(0, GRAMMAR_LEVELS.indexOf((l === 'A0' ? 'A1' : l) as GrammarLevel));
  const reach = rank(learnerLevel) + 1;
  const topics = topicsOf(grammar)
    .filter((t) => rank(t.level) <= reach && (progress.get(t.id)?.step ?? 1) < 6 && t.items.length >= 2)
    .slice(0, PLACEMENT_TOPICS);
  let n = 0;
  return topics.flatMap((t) => shuffle(t.items, random).slice(0, 2).map((item) => itemDrill('pick', item, t.id, lang, random, `pl-${n++}`)));
}
