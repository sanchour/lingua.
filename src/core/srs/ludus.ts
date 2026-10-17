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

export type ExerciseKind = 'choose-meaning' | 'choose-term' | 'match' | 'cloze' | 'build' | 'type' | 'translate' | 'article' | 'speak';

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
}

/**
 * A lesson for the given cards: a matching warm-up, then one exercise per card, harder for cards the
 * learner has seen before (typing, gaps, sentences, speaking) and gentle for new ones (recognition).
 * New cards get a second, production exercise later in the lesson.
 */
export function planLesson(items: LudusItem[], pool: LudusItem[], { random, match = true, canSpeak = false, articleOf, articles = [] }: PlanOptions): Exercise[] {
  const hasArticle = (i: LudusItem) => {
    const a = articleOf?.(i);
    return Boolean(a && articles.includes(a));
  };
  const others = pool.length >= 4 ? pool : [...pool, ...items];
  const plan: Exercise[] = [];
  let n = 0;
  const key = () => `x${n++}`;

  const matchItems = match && items.length >= 4 ? shuffle(items, random).slice(0, Math.min(5, items.length)) : [];
  if (matchItems.length) plan.push({ key: key(), kind: 'match', items: matchItems });

  const later: Exercise[] = [];
  for (const item of shuffle(items, random)) {
    const pick = <K extends ExerciseKind>(kinds: K[]) => kinds[Math.floor(random() * kinds.length)];
    if (item.isNew) {
      plan.push({ key: key(), kind: 'choose-meaning', item, ...choice(item, others, 'meaning', random) });
      const second = pick<ExerciseKind>(['choose-term', 'type', ...(canCloze(item) ? (['cloze'] as const) : []), ...(hasArticle(item) ? (['article'] as const) : [])]);
      later.push(build(second, item));
      continue;
    }
    const kinds: ExerciseKind[] = ['type', 'choose-term'];
    if (canCloze(item)) kinds.push('cloze', 'cloze');
    if (canBuild(item)) kinds.push('build');
    if (canTranslate(item)) kinds.push('translate');
    if (hasArticle(item)) kinds.push('article');
    if (canSpeak) kinds.push('speak');
    if (!matchItems.includes(item)) kinds.push('choose-meaning');
    plan.push(build(pick(kinds), item));
  }
  return [...plan, ...later];

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
      case 'type':
      case 'match':
      default:
        return { key: key(), kind: 'type', item };
    }
  }
}

/** Rebuilds a missed exercise for a second try later in the lesson (options reshuffled). */
export function retryOf(ex: Exercise, random: () => number, seq: number): Exercise {
  const key = `${ex.key}-r${seq}`;
  if ('options' in ex) {
    const options = shuffle(ex.options, random);
    const correct = ex.options[ex.answer];
    return { ...ex, key, options, answer: options.indexOf(correct) } as Exercise;
  }
  if (ex.kind === 'build' || ex.kind === 'translate') return { ...ex, key, tiles: shuffle(ex.tiles, random) };
  return { ...ex, key };
}

/** Per card: no mistakes → Good; right after a retry → Hard; missed twice → Again. */
export function gradeFor(mistakes: number, missedForGood: boolean): Grade4 {
  if (missedForGood) return 1;
  return mistakes ? 2 : 3;
}
