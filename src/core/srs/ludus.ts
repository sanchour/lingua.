// Ludus: Duolingo-style exercises generated from a deck. Pure and deterministic for a given random
// source, so sessions can be tested. The study screen renders the exercises and reports results;
// core/srs/scheduler.ts turns each card's results into one FSRS grade.
import type { ReviewMode } from '@/data/types';
import type { Grade4 } from './scheduler';

export interface LudusItem {
  /** Card id. */
  id: string;
  term: string;
  meaning: string;
  pos?: string;
  gender?: string;
  example?: { text: string; translation?: string; cloze?: [number, number] };
  /** Never studied before: introduced gently (recognition first). */
  isNew: boolean;
}

export type ExerciseKind = 'choose-meaning' | 'choose-term' | 'match' | 'cloze' | 'build' | 'type' | 'translate' | 'article' | 'speak' | 'listen' | 'dictation' | 'spell' | 'truefalse';

/** Every kind, in the order the setup sheet lists them. */
export const EXERCISE_KINDS: ExerciseKind[] = ['choose-meaning', 'choose-term', 'truefalse', 'match', 'listen', 'cloze', 'type', 'spell', 'build', 'dictation', 'translate', 'article', 'speak'];

/** Short names for the setup sheet. */
export const EXERCISE_NAME: Record<ExerciseKind, string> = {
  'choose-meaning': 'Meanings',
  'choose-term': 'Words',
  truefalse: 'Right or wrong',
  match: 'Pairs',
  listen: 'Listening',
  cloze: 'Gaps',
  type: 'Typing',
  spell: 'Spelling',
  build: 'Sentences',
  dictation: 'Dictation',
  translate: 'Translating',
  article: 'Articles',
  speak: 'Speaking',
};

interface Base {
  /** Unique within a session. */
  key: string;
}
export type Exercise = Base &
  (
    | { kind: 'choose-meaning'; item: LudusItem; options: string[]; answer: number }
    | { kind: 'choose-term'; item: LudusItem; options: string[]; answer: number }
    | { kind: 'cloze'; item: LudusItem; before: string; gap: string; after: string; options: string[]; answer: number }
    | { kind: 'build'; item: LudusItem; translation: string; tiles: string[]; answer: string[] }
    | { kind: 'type'; item: LudusItem }
    | { kind: 'match'; items: LudusItem[] }
    /** Read the sentence, build its translation from English tiles. */
    | { kind: 'translate'; item: LudusItem; tiles: string[]; answer: string[] }
    /** der, die or das: the noun's article. */
    | { kind: 'article'; item: LudusItem; options: string[]; answer: number }
    /** Say the word out loud (speech recognition, where the device has it). */
    | { kind: 'speak'; item: LudusItem }
    /** Hear the word, pick it from four written ones. */
    | { kind: 'listen'; item: LudusItem; options: string[]; answer: number }
    /** Hear the example sentence, build it from tiles. */
    | { kind: 'dictation'; item: LudusItem; tiles: string[]; answer: string[] }
    /** Put the word's letters in order, from its meaning. */
    | { kind: 'spell'; item: LudusItem; tiles: string[]; answer: string[] }
    /** Does this word mean that? `shown` is the meaning offered; options are Yes and No. */
    | { kind: 'truefalse'; item: LudusItem; shown: string; options: string[]; answer: number }
  );

export const MODE_OF: Record<ExerciseKind, ReviewMode> = {
  'choose-meaning': 'mcq',
  'choose-term': 'mcq',
  cloze: 'cloze',
  build: 'build',
  type: 'type',
  match: 'match',
  translate: 'build',
  article: 'mcq',
  speak: 'speak',
  listen: 'listen',
  dictation: 'listen',
  spell: 'type',
  truefalse: 'mcq',
};

export const EXERCISE_LABEL: Record<ExerciseKind, string> = {
  'choose-meaning': 'What does this mean?',
  'choose-term': 'Choose the right word',
  cloze: 'Fill in the gap',
  build: 'Build the sentence',
  type: 'Type the word',
  match: 'Match the pairs',
  translate: 'Translate the sentence',
  article: 'Which article?',
  speak: 'Say it out loud',
  listen: 'What do you hear?',
  dictation: 'Write what you hear',
  spell: 'Spell the word',
  truefalse: 'Right or wrong?',
};

/** Small seeded generator (mulberry32) so a session is reproducible in tests. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(list: T[], random: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const norm = (s: string) => s.trim().toLocaleLowerCase();

/** Three wrong options unlike the answer, preferring the same part of speech. */
function distractors(item: LudusItem, pool: LudusItem[], field: 'term' | 'meaning', random: () => number, count = 3): string[] {
  const answer = norm(item[field]);
  const seen = new Set([answer]);
  const ranked = shuffle(pool, random).sort((a, b) => Number(b.pos === item.pos) - Number(a.pos === item.pos));
  const out: string[] = [];
  for (const other of ranked) {
    const value = other[field];
    if (!value || seen.has(norm(value))) continue;
    seen.add(norm(value));
    out.push(value);
    if (out.length >= count) break;
  }
  return out;
}

function choice(item: LudusItem, pool: LudusItem[], field: 'term' | 'meaning', random: () => number) {
  const options = shuffle([item[field], ...distractors(item, pool, field, random)], random);
  return { options, answer: options.indexOf(item[field]) };
}

/** Words of a sentence for the word bank, without surrounding punctuation. */
export function sentenceTiles(text: string): string[] {
  return text
    .split(/\s+/)
    .map((w) => w.replace(/^[¿¡"'«»„“”(]+|[.,;:!?"'«»“”)…]+$/g, ''))
    .filter((w) => /\p{L}|\p{N}/u.test(w));
}

const canCloze = (i: LudusItem) => Boolean(i.example?.cloze && i.example.text.length < 140);
const canBuild = (i: LudusItem) => {
  const n = i.example?.translation ? sentenceTiles(i.example.text).length : 0;
  return n >= 3 && n <= 9;
};
/** One word of three to twelve letters, in a language written with letters (not characters). */
const canSpellItem = (i: LudusItem) => {
  const letters = [...i.term.normalize('NFC')];
  return !/\s/.test(i.term.trim()) && letters.length >= 3 && letters.length <= 12 && letters.every((c) => /\p{L}|['’-]/u.test(c));
};

/** The word's letters, shuffled so the word doesn't already read out. */
function letterTiles(term: string, random: () => number): { tiles: string[]; answer: string[] } {
  const answer = [...term.normalize('NFC')];
  let tiles = shuffle(answer, random);
  for (let i = 0; i < 5 && tiles.join('') === answer.join(''); i++) tiles = shuffle(answer, random);
  return { tiles, answer };
}

const canTranslate = (i: LudusItem) => {
  const n = i.example?.translation ? sentenceTiles(i.example.translation).length : 0;
  return n >= 3 && n <= 10;
};

export interface PlanOptions {
  random: () => number;
  /** Include one "match the pairs" round when there are enough cards. */
  match?: boolean;
  /** The device can recognise speech in this language. */
  canSpeak?: boolean;
  /** The noun's article (der Hund → "der"), or null; with the language's article set to choose from. */
  articleOf?: (item: LudusItem) => string | null;
  articles?: string[];
  /** A voice can say the language (listening and dictation). */
  canHear?: boolean;
  /** The language is written with letters, so words can be spelled from tiles. */
  canSpell?: boolean;
  /** Typing exercises; off turns them into choices. */
  typing?: boolean;
  /** Kinds turned off in the setup sheet. */
  off?: ReadonlySet<ExerciseKind>;
}

/** How often each kind comes up for a card seen before: making the word and sentences more, plain recognition less (5.1-3b). */
const SEEN_WEIGHT: Partial<Record<ExerciseKind, number>> = {
  type: 3,
  cloze: 3,
  'choose-term': 2,
  build: 2,
  translate: 2,
  dictation: 2,
  spell: 2,
  listen: 2,
  article: 2,
  speak: 2,
  truefalse: 1,
  'choose-meaning': 1,
};
/** A new card's first look: gentle recognition (or the pairs round). */
const FIRST_WEIGHT: Partial<Record<ExerciseKind, number>> = { 'choose-meaning': 3, truefalse: 2, listen: 1 };
/** A new card's second round, later in the lesson: a step towards saying it. */
const SECOND_WEIGHT: Partial<Record<ExerciseKind, number>> = { 'choose-term': 3, type: 2, cloze: 2, article: 2, spell: 2, listen: 1 };

type Weighted = Array<[ExerciseKind, number]>;

/** One exercise still to place: its card, the kinds it may be (weighted), and the slot it must follow. */
interface Slot {
  item: LudusItem;
  kinds: Weighted;
  /** A new card's second round comes after its first (index into the slots). */
  after?: number;
}

function weightedPick<T extends { w: number }>(options: T[], random: () => number): T {
  let r = random() * options.reduce((a, o) => a + o.w, 0);
  for (const o of options) if ((r -= o.w) < 0) return o;
  return options[options.length - 1];
}

/**
 * A lesson for the given cards (5.1-3b): a pairs warm-up (new cards first), then one exercise per
 * card, picked by weight: harder for cards seen before (typing, gaps, sentences, speaking), gentle
 * for a new card's first look, and a step towards saying it in its second round, which is mixed in
 * among the others at least two exercises later. Never the same kind twice running, and no kind
 * more than about a third of the lesson. The same random source gives the same lesson.
 */
export function planLesson(items: LudusItem[], pool: LudusItem[], { random, match = true, canSpeak = false, articleOf, articles = [], canHear = false, canSpell = false, typing = true, off }: PlanOptions): Exercise[] {
  const allowed = (k: ExerciseKind) => !off?.has(k) && (typing || k !== 'type');
  /** The kinds the learner kept, weighted; when none is left, the gentlest one. */
  const weigh = (kinds: ExerciseKind[], weights: Partial<Record<ExerciseKind, number>>, fallback: ExerciseKind): Weighted => {
    const left = [...new Set(kinds)].filter(allowed);
    return left.length ? left.map((k) => [k, weights[k] ?? 1]) : [[allowed(fallback) ? fallback : 'choose-meaning', 1]];
  };
  const hasArticle = (i: LudusItem) => {
    const a = articleOf?.(i);
    return Boolean(a && articles.includes(a));
  };
  const others = pool.length >= 4 ? pool : [...pool, ...items];
  let n = 0;
  const key = () => `x${n++}`;

  // The pairs round meets new cards first: matching a word to its meaning is its gentle first look.
  const matchItems =
    match && allowed('match') && items.length >= 4
      ? shuffle([...shuffle(items.filter((i) => i.isNew), random), ...shuffle(items.filter((i) => !i.isNew), random)].slice(0, Math.min(5, items.length)), random)
      : [];

  const seenKinds = (item: LudusItem) => {
    const kinds: ExerciseKind[] = ['type', 'choose-term', 'truefalse'];
    if (canHear) kinds.push('listen');
    if (canHear && canBuild(item)) kinds.push('dictation');
    if (canSpell && canSpellItem(item)) kinds.push('spell');
    if (canCloze(item)) kinds.push('cloze');
    if (canBuild(item)) kinds.push('build');
    if (canTranslate(item)) kinds.push('translate');
    if (hasArticle(item)) kinds.push('article');
    if (canSpeak) kinds.push('speak');
    if (!matchItems.includes(item)) kinds.push('choose-meaning');
    return weigh(kinds, SEEN_WEIGHT, 'choose-term');
  };
  const firstKinds = () => weigh(['choose-meaning', 'truefalse', ...(canHear ? (['listen'] as const) : [])], FIRST_WEIGHT, 'truefalse');
  const secondKinds = (item: LudusItem) =>
    weigh(
      [
        'choose-term',
        'type',
        ...(canCloze(item) ? (['cloze'] as const) : []),
        ...(hasArticle(item) ? (['article'] as const) : []),
        ...(canHear ? (['listen'] as const) : []),
        ...(canSpell && canSpellItem(item) ? (['spell'] as const) : []),
      ],
      SECOND_WEIGHT,
      'choose-term',
    );

  const slots: Slot[] = [];
  for (const item of shuffle(items, random)) {
    if (!item.isNew) slots.push({ item, kinds: seenKinds(item) });
    else {
      const first = matchItems.includes(item) ? undefined : slots.push({ item, kinds: firstKinds() }) - 1;
      slots.push({ item, kinds: secondKinds(item), after: first });
    }
  }

  const total = slots.length + (matchItems.length ? 1 : 0);
  const cap = Math.max(1, Math.ceil(total / 3));

  /** One try at ordering the slots; returns the kinds in order and how many rules it had to bend. */
  const order = () => {
    const used = new Map<ExerciseKind, number>(matchItems.length ? [['match', 1]] : []);
    const placed = new Map<number, number>();
    const out: Array<{ slot: number; kind: ExerciseKind }> = [];
    const left = new Set(slots.keys());
    let last: ExerciseKind | null = matchItems.length ? 'match' : null;
    let bent = 0;
    const offset = matchItems.length ? 1 : 0;
    while (left.size) {
      const pos = out.length + offset;
      const due = (s: number) => slots[s].after === undefined || placed.has(slots[s].after!);
      const spaced = (s: number) => slots[s].after === undefined || pos - placed.get(slots[s].after!)! >= 3;
      let ready = [...left].filter((s) => due(s) && spaced(s));
      if (!ready.length) ready = [...left].filter(due);
      let pick: { slot: number; kind: ExerciseKind } | null = null;
      for (const strict of [true, false]) {
        const fit = (s: number) => slots[s].kinds.filter(([k]) => k !== last && (!strict || (used.get(k) ?? 0) < cap));
        const open = ready.filter((s) => fit(s).length);
        if (!open.length) continue;
        const slot = open[Math.floor(random() * open.length)];
        pick = { slot, kind: weightedPick(fit(slot).map(([kind, w]) => ({ kind, w })), random).kind };
        if (!strict) bent++;
        break;
      }
      if (!pick) {
        const slot = ready[Math.floor(random() * ready.length)];
        pick = { slot, kind: weightedPick(slots[slot].kinds.map(([kind, w]) => ({ kind, w })), random).kind };
        bent++;
      }
      out.push(pick);
      placed.set(pick.slot, pos);
      left.delete(pick.slot);
      used.set(pick.kind, (used.get(pick.kind) ?? 0) + 1);
      last = pick.kind;
    }
    return { out, bent };
  };
  // A few tries, keeping the first that bends no rule (or the one that bends fewest).
  let best = order();
  for (let i = 0; i < 8 && best.bent; i++) {
    const next = order();
    if (next.bent < best.bent) best = next;
  }

  const plan: Exercise[] = matchItems.length ? [{ key: key(), kind: 'match', items: matchItems }] : [];
  for (const { slot, kind } of best.out) plan.push(build(kind, slots[slot].item));
  return plan;

  function build(kind: ExerciseKind, item: LudusItem): Exercise {
    switch (kind) {
      case 'choose-meaning':
        return { key: key(), kind, item, ...choice(item, others, 'meaning', random) };
      case 'choose-term':
        return { key: key(), kind, item, ...choice(item, others, 'term', random) };
      case 'cloze': {
        const { text, cloze } = item.example!;
        const [s, e] = cloze!;
        const gap = text.slice(s, e);
        const options = shuffle([gap, ...distractors({ ...item, term: gap }, others, 'term', random)], random);
        return { key: key(), kind, item, before: text.slice(0, s), gap, after: text.slice(e), options, answer: options.indexOf(gap) };
      }
      case 'build': {
        const answer = sentenceTiles(item.example!.text);
        const extra = shuffle(others.flatMap((o) => (o.example ? sentenceTiles(o.example.text) : [o.term])), random)
          .filter((w) => !answer.some((a) => norm(a) === norm(w)))
          .slice(0, 2);
        return { key: key(), kind, item, translation: item.example!.translation!, tiles: shuffle([...answer, ...extra], random), answer };
      }
      case 'translate': {
        const answer = sentenceTiles(item.example!.translation!);
        const extra = shuffle(others.flatMap((o) => (o.example?.translation ? sentenceTiles(o.example.translation) : sentenceTiles(o.meaning))), random)
          .filter((w) => !answer.some((a) => norm(a) === norm(w)))
          .slice(0, 3);
        return { key: key(), kind, item, tiles: shuffle([...answer, ...extra], random), answer };
      }
      case 'article': {
        const options = [...articles];
        return { key: key(), kind, item, options, answer: options.indexOf(articleOf!(item)!) };
      }
      case 'speak':
        return { key: key(), kind, item };
      case 'listen':
        return { key: key(), kind, item, ...choice(item, others, 'term', random) };
      case 'dictation': {
        const answer = sentenceTiles(item.example!.text);
        const extra = shuffle(others.flatMap((o) => (o.example ? sentenceTiles(o.example.text) : [o.term])), random)
          .filter((w) => !answer.some((a) => norm(a) === norm(w)))
          .slice(0, 2);
        return { key: key(), kind, item, tiles: shuffle([...answer, ...extra], random), answer };
      }
      case 'spell':
        return { key: key(), kind, item, ...letterTiles(item.term, random) };
      case 'truefalse':
        return trueFalse(item, others, random, key());
      case 'type':
      case 'match':
      default:
        return { key: key(), kind: 'type', item };
    }
  }
}

/** Right or wrong: half the time the word's own meaning, otherwise another card's. */
function trueFalse(item: LudusItem, others: LudusItem[], random: () => number, key: string): Exercise {
  const truthful = random() < 0.5;
  const decoy = distractors(item, others, 'meaning', random, 1)[0];
  const shown = truthful || !decoy ? item.meaning : decoy;
  const options = ['Yes', 'No'];
  return { key, kind: 'truefalse', item, shown, options, answer: shown === item.meaning ? 0 : 1 };
}

/**
 * Lightning: quick choices only (meaning, word, right or wrong), cycling through the cards, as
 * many as a minute holds. Nothing in it moves a schedule.
 */
export function planLightning(items: LudusItem[], pool: LudusItem[], random: () => number, count = 80): Exercise[] {
  const others = pool.length >= 4 ? pool : [...pool, ...items];
  const out: Exercise[] = [];
  let deck: LudusItem[] = [];
  for (let i = 0; i < count && items.length; i++) {
    if (!deck.length) deck = shuffle(items, random);
    const item = deck.pop()!;
    const r = random();
    const key = `lz${i}`;
    if (r < 0.4) out.push({ key, kind: 'choose-meaning', item, ...choice(item, others, 'meaning', random) });
    else if (r < 0.7) out.push({ key, kind: 'choose-term', item, ...choice(item, others, 'term', random) });
    else out.push(trueFalse(item, others, random, key));
  }
  return out;
}

/** Rebuilds a missed exercise for a second try later in the lesson (options reshuffled). */
export function retryOf(ex: Exercise, random: () => number, seq: number): Exercise {
  const key = `${ex.key}-r${seq}`;
  if ('options' in ex) {
    const options = shuffle(ex.options, random);
    const correct = ex.options[ex.answer];
    return { ...ex, key, options, answer: options.indexOf(correct) } as Exercise;
  }
  if (ex.kind === 'build' || ex.kind === 'translate' || ex.kind === 'dictation' || ex.kind === 'spell') return { ...ex, key, tiles: shuffle(ex.tiles, random) };
  return { ...ex, key };
}

/** Per card: no mistakes → Good; right after a retry → Hard; missed twice → Again. */
export function gradeFor(mistakes: number, missedForGood: boolean): Grade4 {
  if (missedForGood) return 1;
  return mistakes ? 2 : 3;
}
