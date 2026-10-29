// Grammatica (Lingua 3.0-8): each language's grammar as a typed module of topics, loaded only when
// needed. A topic teaches examples first: a few real sentences, then a short rule, then the
// learner uses it at once. Every sentence comes from the language pack's own examples (Wiktionary,
// with its translation), and a test checks that it does.

export type GrammarLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export const GRAMMAR_LEVELS: GrammarLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

/** A real sentence from the pack. The form the topic is about is in [brackets]. */
export interface Example {
  s: string;
  en: string;
}

/**
 * One drill item: a pack sentence with the form in [brackets], its translation, and three wrong
 * forms in its place. The five steps of a lesson are all made from items like this.
 */
export interface Item extends Example {
  wrong: [string, string, string];
  /** The dictionary form, shown when the learner types the form (comer). */
  base?: string;
  /** What to make of it, shown when typing: "nosotros · preterite". */
  cue?: string;
}

/** A reference table, written out (articles, endings, pronouns, one model verb). */
export interface GrammarTable {
  title?: string;
  /** Column headings; the first is the row labels' heading. */
  columns?: string[];
  rows: string[][];
  /** A line under the table. */
  note?: string;
}

/** Two structures that are easily confused, side by side. */
export interface Comparison {
  title: string;
  sides: [ComparisonSide, ComparisonSide];
}

export interface ComparisonSide {
  label: string;
  /** Short lines: when you use it. */
  points: string[];
  example?: Example;
}

export interface FormalityPair {
  formal: Example;
  informal: Example;
  note?: string;
}

export interface RightWrongPair {
  right: string;
  wrong: string;
  reason: string;
}

export interface RegionalNote {
  region: string;
  note: string;
  example?: Example;
}

export interface CrossReference {
  topicId: string;
  note: string;
}

export interface GrammarTimelinePoint {
  label: string;
  tense: string;
  position: 'past-far' | 'past' | 'past-recent' | 'now' | 'future-near' | 'future';
  kind?: 'point' | 'continuous' | 'habitual' | 'state';
  example?: string;
}

export interface GrammarTimelineData {
  title?: string;
  points: GrammarTimelinePoint[];
  note?: string;
}

export interface WordOrderSlot {
  role: string;
  example?: string;
  optional?: boolean;
  highlight?: boolean;
}

export interface WordOrderData {
  title?: string;
  slots: WordOrderSlot[];
  note?: string;
}

export interface DecisionBranch {
  result?: string;
  rule?: string;
  example?: string;
  next?: DecisionNode;
}

export interface DecisionNode {
  question: string;
  yes: DecisionBranch;
  no: DecisionBranch;
}

export interface SentenceDiagramNode {
  word: string;
  role: string;
  clause?: 'main' | 'subordinate' | 'relative';
}

export interface SentenceDiagramData {
  title?: string;
  sentence: string;
  translation?: string;
  nodes: SentenceDiagramNode[];
  note?: string;
}

export interface MorphologyPart {
  text: string;
  type: 'prefix' | 'stem' | 'suffix' | 'ending';
  meaning?: string;
}

export interface MorphologyBreakdownData {
  word: string;
  translation: string;
  parts: MorphologyPart[];
  note?: string;
}

export interface Topic {
  /** Stable within the language: item keys and progress rows hang on it. */
  id: string;
  title: string;
  level: GrammarLevel;
  /** One line: what it is for. */
  summary: string;
  /** The sentences shown first, before any rule. Defaults to the first three items. */
  examples?: Example[];
  /** Two to five short paragraphs. `**bold**` marks a form or ending. */
  rule: string[];
  tables?: GrammarTable[];
  compare?: Comparison;
  /** A "watch out" line. */
  watch?: string;
  /** The one-line reminder shown after a mistake. */
  why: string;
  items: Item[];
  /**
   * Paradigm tag sets the topic explains, matched against a form's tags in the word drawer
   * ("Why this form?"): each entry is tags that must all be present, e.g. 'preterite indicative'.
   */
  tags?: string[];
  related?: string[];
  category?: string;
  pos?: string;
  prerequisites?: string[];
  exceptions?: string[];
  formalityPairs?: FormalityPair[];
  rightWrongPairs?: RightWrongPair[];
  regionalNotes?: RegionalNote[];
  targetLangRule?: string[];
  crossReferences?: CrossReference[];
  timeline?: GrammarTimelineData;
  wordOrder?: WordOrderData;
  decisionTree?: DecisionNode;
  sentenceDiagram?: SentenceDiagramData;
  morphology?: MorphologyBreakdownData[];
}

export interface Unit {
  title: string;
  topics: Topic[];
}

export interface Grammar {
  lang: string;
  units: Unit[];
  /** Where the rules were checked. */
  sources: Array<{ name: string; url?: string }>;
  /** Topics left out on purpose, and why (shown nowhere; kept for the next session). */
  notes?: string;
}

/** The topics in teaching order (A1 first), across units. */
export const topicsOf = (g: Grammar): Topic[] => g.units.flatMap((u) => u.topics);

export const findTopic = (g: Grammar, id: string): Topic | undefined => topicsOf(g).find((t) => t.id === id);

/** The examples a topic opens with. */
export const openingExamples = (t: Topic): Example[] => t.examples ?? t.items.slice(0, 3);

/** The sentence without its brackets: "Ayer comimos paella." */
export const plain = (s: string): string => s.replace(/[[\]]/g, '');

/** The sentence split around its bracketed form. */
export function splitFocus(s: string): { before: string; focus: string; after: string } {
  const open = s.indexOf('[');
  const close = s.indexOf(']', open + 1);
  if (open < 0 || close < 0) return { before: s, focus: '', after: '' };
  return { before: s.slice(0, open), focus: s.slice(open + 1, close), after: s.slice(close + 1) };
}
