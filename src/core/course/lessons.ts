// A unit's lessons as exercises for Grammatica's lesson engine: the unit's words and phrases become
// topics of their own (a word is an item whose whole sentence is the word), so the exercises, keys
// and feel are the same everywhere.
import { itemDrill, resolveKind, shuffle } from '@/core/grammar/drills';
import type { Drill, DrillKind, DrillOptions } from '@/core/grammar/drills';
import type { Grammar, Item, Topic } from '@/core/grammar/types';
import { findTopic } from '@/core/grammar/types';
import type { LessonId, UnitOutline } from './outline';
import type { UnitContent } from './types';

export const courseTopicId = (unit: string, part: 'words' | 'phrases') => `course:${unit}:${part}`;

/** The course's own titles for exercises on its words and phrases. */
export const COURSE_LABELS: Record<'words' | 'phrases', Partial<Record<DrillKind, string>>> = {
  words: { hear: 'Which word do you hear?', pick: 'Which word is it?', build: 'Type the word', recognise: 'Which word is it?' },
  phrases: { hear: 'Which word do you hear?', pick: 'Fill the gap', build: 'Type the missing word', say: 'Build it in the language' },
};

const levelOf = (u: UnitOutline) => u.level;

/** Three other words of the unit for a word's place: its neighbours in the list, so they stay alike in kind. */
function otherWords(terms: string[], i: number): [string, string, string] {
  const out: string[] = [];
  for (let step = 1; out.length < 3 && step < terms.length; step++) {
    for (const j of [i + step, i - step]) {
      if (out.length < 3 && j >= 0 && j < terms.length && terms[j] !== terms[i] && !out.includes(terms[j])) out.push(terms[j]);
    }
  }
  return out as [string, string, string];
}

/** The unit's words as a topic: each word an item, and the list a table to match in pairs. */
export function wordsTopic(unit: UnitOutline, content: UnitContent): Topic {
  const terms = content.words.map(([term]) => term);
  return {
    id: courseTopicId(unit.id, 'words'),
    title: `${unit.short}: words`,
    level: levelOf(unit),
    summary: unit.title,
    rule: [],
    why: 'Say the word aloud as you learn it: it sticks better.',
    items: content.words.map(([term, meaning], i) => ({ s: `[${term}]`, en: meaning, wrong: otherWords(terms, i) })),
    tables: [{ columns: ['Word', 'Meaning'], rows: content.words.map(([term, meaning]) => [term, meaning]) }],
    examples: [],
  };
}

/** The unit's key phrases as a topic, opening with all of them. */
export function phrasesTopic(unit: UnitOutline, content: UnitContent): Topic {
  const items: Item[] = content.phrases.map(({ s, en, wrong }) => ({ s, en, wrong }));
  return {
    id: courseTopicId(unit.id, 'phrases'),
    title: `${unit.short}: phrases`,
    level: levelOf(unit),
    summary: unit.title,
    rule: unit.canDo.map((line) => `${line}.`),
    why: 'Listen to the whole phrase again, then try it once more.',
    items,
    examples: items,
  };
}

/** Kinds in the order a lesson goes through them: recognising first, making last. */
const WORD_KINDS: DrillKind[] = ['hear', 'pick', 'pick', 'build'];
const PHRASE_KINDS: DrillKind[] = ['hear', 'pick', 'order', 'spot', 'say', 'build'];

function itemsAs(topic: Topic, kinds: DrillKind[], lang: string, opts: DrillOptions, count: number, prefix: string): Drill[] {
  const { random } = opts;
  const items = shuffle(topic.items, random);
  const out: Drill[] = [];
  for (let i = 0; i < count && items.length; i++) {
    const item = items[i % items.length];
    // Easier kinds first: the lesson moves along the list as it goes.
    const want = kinds[Math.min(kinds.length - 1, Math.floor((i / count) * kinds.length))];
    out.push(itemDrill(resolveKind(want, item, lang, opts), item, topic.id, lang, random, `${prefix}-${i}`));
  }
  return out;
}

/** Up to five pairs from the words' table, to match first. */
function pairsDrill(topic: Topic, random: () => number, key: string): Drill | null {
  const table = topic.tables?.[0];
  if (!table) return null;
  const rows = shuffle(table.rows, random).filter((r) => r[1] && r[1].length <= 24);
  const pairs: Array<[string, string]> = [];
  for (const r of rows) if (pairs.length < 5 && !pairs.some(([l, m]) => l === r[0] || m === r[1])) pairs.push([r[0], r[1]]);
  return pairs.length >= 3 ? { key, topic: topic.id, kind: 'pairs', table, pairs } : null;
}

export interface CourseLessonPlan {
  drills: Drill[];
  topics: Map<string, Topic>;
  /** The topic whose examples open the lesson. */
  intro?: Topic;
}

/**
 * The exercises of one of a unit's drilled lessons (words, phrases, grammar, the check); null for
 * a grammar lesson when the unit has no topic, and for the lessons that aren't drills (speak, write).
 */
export function planCourseLesson(lesson: LessonId, unit: UnitOutline, content: UnitContent, grammar: Grammar | null, lang: string, opts: DrillOptions): CourseLessonPlan | null {
  const words = wordsTopic(unit, content);
  const phrases = phrasesTopic(unit, content);
  const size = opts.size ?? 10;
  const { random } = opts;

  if (lesson === 'words') {
    const pairs = pairsDrill(words, random, 'pairs');
    const drills = [...(pairs ? [pairs] : []), ...itemsAs(words, WORD_KINDS, lang, opts, Math.max(size, words.items.length), 'w')];
    return { drills, topics: new Map([[words.id, words]]), intro: words };
  }
  if (lesson === 'phrases') {
    return { drills: itemsAs(phrases, PHRASE_KINDS, lang, opts, Math.max(size, phrases.items.length), 'p'), topics: new Map([[phrases.id, phrases]]), intro: phrases };
  }
  if (lesson === 'grammar') {
    const topics = content.grammar.map((id) => (grammar ? findTopic(grammar, id) : undefined)).filter((t): t is Topic => Boolean(t?.items.length));
    if (!topics.length) return null;
    // Each topic's examples, then its items: recognised, then filled in, then typed.
    const per = Math.max(4, Math.ceil(size / topics.length));
    const drills = topics.flatMap((t, n) => itemsAs(t, ['recognise', 'pick', 'pick', 'build'], lang, opts, Math.min(per, t.items.length * 2), `g${n}`));
    return { drills, topics: new Map(topics.map((t) => [t.id, t])), intro: topics[0] };
  }
  if (lesson === 'check') {
    // A mixed round with nothing to recognise only: words made, phrases built and filled in.
    const fromWords = itemsAs(words, ['pick', 'build'], lang, opts, 4, 'cw');
    const fromPhrases = itemsAs(phrases, ['pick', 'order', 'say', 'build'], lang, opts, 8, 'cp');
    return { drills: shuffle([...fromWords, ...fromPhrases], random), topics: new Map([[words.id, words], [phrases.id, phrases]]) };
  }
  return null;
}

/** The lessons a unit has in this language (grammar only where it has a topic). */
export const unitLessons = (content: UnitContent, grammar: Grammar | null): LessonId[] =>
  (['words', 'phrases', 'grammar', 'speak', 'write', 'check'] as LessonId[]).filter((l) => l !== 'grammar' || content.grammar.some((id) => grammar && findTopic(grammar, id)));
