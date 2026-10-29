// The kinds 6-4b adds, made from what the app already has: a word's dictionary entry (meaning, synonyms, antonyms, part of
// speech, affixes, example), a grammar item with its wrong forms, a table of forms, and (with Max) sentences made to order.
// Each builder returns specs (contracts/exercise.ts): data, no drawing. Pure and deterministic for a given random source.
import type { CorrectBody, DialogueBody, DragBody, ExerciseSpec, ListenSource, MatchBody, PredictBody, TaskBody } from '@/core/contracts/exercise';
import { plain, splitFocus } from '@/core/grammar/types';
import type { Item } from '@/core/grammar/types';
import { shuffle } from '@/core/srs/ludus';
import { usableForm } from './grid';
import { transformSpec } from './transform';
import type { FormGrid } from './grid';

type Trains = ExerciseSpec['trains'];

/** What the dictionary says about a word, as far as it is known (a missing field just means no exercise of that kind). */
export interface WordFacts {
  word: string;
  /** A short meaning in the learner's language. */
  gloss?: string;
  synonyms?: string[];
  antonyms?: string[];
  /** Part of speech as Wiktionary names it ('noun', 'verb', 'adj'). */
  pos?: string;
  /** An example sentence with the word in it. */
  sentence?: string;
  /** A picture of it: its address. */
  image?: string;
}

const POS_NAME: Record<string, string> = { noun: 'noun', verb: 'verb', adj: 'adjective', adv: 'adverb', prep: 'preposition', conj: 'conjunction', pron: 'pronoun', det: 'determiner', intj: 'interjection', num: 'numeral', phrase: 'phrase' };

/** A match set needs at least this many pairs to be a game, and takes at most this many. */
export const MATCH_MIN = 3;
export const MATCH_MAX = 5;

type MatchKind = Extract<ExerciseSpec['kind'], `match-${string}`>;

function matchSpec(kind: MatchKind, what: MatchBody['what'], pairs: MatchBody['pairs'], lang: string, key: string, trains: Trains, instruction: string): ExerciseSpec<MatchKind, MatchBody> | null {
  // Each side once: a game with two of the same answer cannot be won by thought.
  const seenL = new Set<string>();
  const seenR = new Set<string>();
  const unique = pairs.filter((p) => {
    const l = p.left.toLocaleLowerCase();
    const r = p.right.toLocaleLowerCase();
    if (!p.left || !p.right || seenL.has(l) || seenR.has(r)) return false;
    seenL.add(l);
    seenR.add(r);
    return true;
  });
  if (unique.length < MATCH_MIN) return null;
  return { key, kind, lang, instruction, body: { what, pairs: unique.slice(0, MATCH_MAX) }, check: { rule: 'self', modelAnswer: '' }, trains };
}

const take = <T>(list: T[], random: () => number) => shuffle(list, random);
const TRAINS = (words: WordFacts[]): Trains => ({ skill: 'vocabulary', item: { type: 'word', wordId: words[0]?.word ?? '' } });

/** Words and their meanings. */
export const matchDefinitions = (words: WordFacts[], lang: string, random: () => number, key: string) =>
  matchSpec('match-definition', 'definition', take(words.filter((w) => w.gloss), random).map((w) => ({ left: w.word, right: w.gloss! })), lang, key, TRAINS(words), 'Match the words with their meanings');

/** Words and one of their synonyms. */
export const matchSynonyms = (words: WordFacts[], lang: string, random: () => number, key: string) =>
  matchSpec('match-synonym', 'synonym', take(words.filter((w) => w.synonyms?.length), random).map((w) => ({ left: w.word, right: w.synonyms![0] })), lang, key, TRAINS(words), 'Match the words that mean the same');

/** Words and their opposites. */
export const matchAntonyms = (words: WordFacts[], lang: string, random: () => number, key: string) =>
  matchSpec('match-antonym', 'antonym', take(words.filter((w) => w.antonyms?.length), random).map((w) => ({ left: w.word, right: w.antonyms![0] })), lang, key, TRAINS(words), 'Match the opposites');

/** Words and what kind of word they are (only kinds that differ, so each answer is one). */
export const matchPartsOfSpeech = (words: WordFacts[], lang: string, random: () => number, key: string) =>
  matchSpec('match-pos', 'pos', take(words.filter((w) => w.pos && POS_NAME[w.pos]), random).map((w) => ({ left: w.word, right: POS_NAME[w.pos!] })), lang, key, TRAINS(words), 'Match the words with what kind of word they are');

/** Words and a sentence with the word missing: the same word in use. */
export const matchSentences = (words: WordFacts[], lang: string, random: () => number, key: string) =>
  matchSpec(
    'match-sentence',
    'sentence',
    take(words, random).flatMap((w) => {
      const at = w.sentence?.toLocaleLowerCase(lang).indexOf(w.word.toLocaleLowerCase(lang)) ?? -1;
      return at >= 0 && w.sentence ? [{ left: w.word, right: `${w.sentence.slice(0, at)}____${w.sentence.slice(at + w.word.length)}` }] : [];
    }),
    lang,
    key,
    TRAINS(words),
    'Match the words with the sentences they fit',
  );

/** Words and a recording of them (the screen speaks `say`; `right` is only a number to tap). */
export const matchSounds = (words: WordFacts[], lang: string, random: () => number, key: string) =>
  matchSpec('match-sound', 'sound', take(words, random).slice(0, MATCH_MAX).map((w, i) => ({ left: w.word, right: `Sound ${i + 1}`, say: w.word })), lang, key, TRAINS(words), 'Match the sounds with the words you read');

/** Words and their pictures (the learner's own, from their cards). */
export const matchPictures = (words: WordFacts[], lang: string, random: () => number, key: string) =>
  matchSpec('match-picture', 'picture', take(words.filter((w) => w.image), random).map((w, i) => ({ left: w.word, right: `Picture ${i + 1}`, image: w.image })), lang, key, TRAINS(words), 'Match the words with their pictures');

/** Prefixes and suffixes with what they do ("des-" → "undoing"). */
export const matchAffixes = (affixes: Array<{ affix: string; meaning: string }>, lang: string, random: () => number, key: string) =>
  matchSpec('match-affix', 'affix', take(affixes, random).map((a) => ({ left: a.affix, right: a.meaning })), lang, key, { skill: 'vocabulary', item: { type: 'pattern', patternId: `affix:${affixes[0]?.affix ?? ''}` } }, 'Match the beginnings and endings with what they do');

// ── Sentences with a mistake ────────────────────────────────────────────────

/** The grammar item's sentence with one of its wrong forms put in the gap. */
function withWrong(item: Item, random: () => number): { shown: string; wrong: string; right: string } {
  const { before, focus, after } = splitFocus(item.s);
  const wrong = shuffle([...item.wrong], random)[0];
  return { shown: before + wrong + after, wrong, right: focus };
}

/** "Correct the mistake": the wrong form is named, the learner types the right one. */
export function correctMistake(item: Item, topic: string, lang: string, random: () => number, key: string): ExerciseSpec<'correct-mistake', CorrectBody> {
  const { shown, wrong, right } = withWrong(item, random);
  return {
    key,
    kind: 'correct-mistake',
    lang,
    instruction: 'Find the mistake and write it right',
    body: { shown, wrong, translation: item.en },
    // The other wrong forms of the item are real forms too: never a slip.
    check: { rule: 'accent-blind', expected: right, rejects: item.wrong.filter((w) => w !== right) },
    hints: [{ text: `The wrong word is “${wrong}”.`, strength: 0 }, { text: `${[...right][0]}…`, strength: 1 }],
    trains: { skill: 'grammar', item: { type: 'grammar', topicId: topic } },
    feedback: { why: `“${right}” fits here, not “${wrong}”.` },
  };
}

/** "Rewrite the sentence": the whole sentence typed again without the mistake. */
export function rewriteFix(item: Item, topic: string, lang: string, random: () => number, key: string): ExerciseSpec<'rewrite', TaskBody> {
  const { shown, wrong, right } = withWrong(item, random);
  return {
    key,
    kind: 'rewrite',
    lang,
    instruction: 'Write the sentence again, without the mistake',
    body: { task: 'fix', given: [shown], prompt: 'Rewrite it correctly', translation: item.en },
    // The sentence as it was is one slip away from the right one: it must never count as nearly right.
    check: { rule: 'accent-blind', expected: plain(item.s), rejects: [shown] },
    hints: [{ text: `Look at “${wrong}”.`, strength: 0 }],
    trains: { skill: 'grammar', item: { type: 'grammar', topicId: topic } },
    feedback: { why: `“${right}” fits here, not “${wrong}”.` },
  };
}

// ── Forms in order ──────────────────────────────────────────────────────────

/** "What comes next?": a few forms of a table's row or column in order, the next one asked for. */
export function predictForms(grid: FormGrid, topic: string, lang: string, random: () => number, count: number, keyPrefix = 'pf'): Array<ExerciseSpec<'predict-form', PredictBody>> {
  const lines: Array<Array<{ label: string; form: string }>> = [];
  grid.rows.forEach((row) => {
    // A row across the columns (singular, plural, …).
    const cells = row.cells.map((form, c) => ({ label: grid.columns[c] ?? '', form }));
    if (cells.filter((x) => usableForm(x.form) && x.label).length >= 3) lines.push(cells.filter((x) => usableForm(x.form) && x.label));
  });
  // A column down the rows (I, you, he…).
  for (let c = 0; c < Math.max(0, ...grid.rows.map((r) => r.cells.length)); c++) {
    const cells = grid.rows.map((r) => ({ label: r.label, form: r.cells[c] ?? '' })).filter((x) => usableForm(x.form) && x.label);
    if (cells.length >= 3) lines.push(cells);
  }
  return take(lines, random)
    .slice(0, count)
    .map((line, i) => {
      const upto = Math.min(line.length - 1, 2 + Math.floor(random() * 2));
      const next = line[upto];
      const others = line.filter((x) => x !== next).map((x) => x.form);
      return {
        key: `${keyPrefix}-${i}`,
        kind: 'predict-form',
        lang,
        instruction: 'What comes next?',
        body: { title: grid.title, given: line.slice(0, upto), ask: { label: next.label } },
        check: { rule: 'accent-blind', expected: next.form, rejects: others.filter((o) => o !== next.form) },
        hints: [{ text: `It is the ${next.label} form.`, strength: 0 }, { text: `${[...next.form][0]}…`, strength: 1 }],
        trains: { skill: 'grammar', item: { type: 'grammar', topicId: topic } },
        feedback: { why: `After ${line[upto - 1].form} comes ${next.form} (${next.label}).` },
      };
    });
}

/** "Present into past": a form of a word's table changed into the same person's form in another table (tense). */
export function pairsAcrossGrids(grids: FormGrid[], from: RegExp, to: RegExp): Array<{ title: string; from: { form: string; label: string }; to: { form: string; label: string }; others: string[] }> {
  const src = grids.filter((g) => from.test(g.title));
  const dst = grids.filter((g) => to.test(g.title));
  const out: ReturnType<typeof pairsAcrossGrids> = [];
  for (const a of src) {
    for (const b of dst) {
      for (const ra of a.rows) {
        const rb = b.rows.find((r) => r.label === ra.label);
        const [fa, fb] = [ra.cells[0], rb?.cells[0]];
        if (!rb || !usableForm(fa) || !usableForm(fb) || fa.toLocaleLowerCase() === fb.toLocaleLowerCase()) continue;
        out.push({
          title: ra.label,
          from: { form: fa, label: a.title },
          to: { form: fb, label: b.title },
          others: [...a.rows, ...b.rows].map((r) => r.cells[0]).filter((x): x is string => usableForm(x) && x.toLocaleLowerCase() !== fb.toLocaleLowerCase()),
        });
      }
    }
  }
  return out;
}

// ── Dialogue and free sentence tasks (made to order, or by hand) ────────────

/** "Complete the dialogue": one line missing, typed. */
export function completeDialogue(lines: DialogueBody['lines'], missing: number, lang: string, key: string, trains: Trains, title?: string): ExerciseSpec<'complete-dialogue', DialogueBody> | null {
  const gap = lines[missing];
  if (!gap || lines.length < 3) return null;
  return {
    key,
    kind: 'complete-dialogue',
    lang,
    instruction: 'Complete the dialogue',
    body: { title, lines: lines.map((l, i) => ({ ...l, missing: i === missing })) },
    check: { rule: 'accent-blind', expected: gap.text },
    hints: [{ text: `${[...gap.text][0]}…`, strength: 1 }],
    trains,
    feedback: { why: `${gap.speaker}: ${gap.text}` },
  };
}

const TASK_INSTRUCTION: Record<TaskBody['task'], string> = {
  fix: 'Write the sentence again, without the mistake',
  passive: 'Say it in the passive',
  reported: 'Say it in reported speech',
  question: 'Turn it into a question',
  combine: 'Combine the two sentences into one',
  expand: 'Add more information to the sentence',
  simplify: 'Say it more simply',
};

/**
 * A sentence task with a model answer: judged by meaning with Max when `ai` is set, otherwise the model answer is shown and the learner
 * rates their own (the engine's "self" rule), because without Max nothing offline can tell two good rewrites apart.
 */
export function sentenceTask(task: Exclude<TaskBody['task'], 'fix'>, given: string[], model: string, lang: string, key: string, trains: Trains, ai: boolean): ExerciseSpec<'rewrite' | 'combine' | 'expand' | 'simplify', TaskBody> {
  const kind = task === 'combine' || task === 'expand' || task === 'simplify' ? task : 'rewrite';
  return {
    key,
    kind,
    lang,
    instruction: TASK_INSTRUCTION[task],
    body: { task, given, prompt: TASK_INSTRUCTION[task] },
    check: ai ? { rule: 'ai', modelAnswer: model, criteria: TASK_INSTRUCTION[task] } : { rule: 'self', modelAnswer: model },
    trains,
    feedback: { why: model },
  };
}

/**
 * "Use it in a sentence": the learner writes their own, then sees an example and rates themselves (the engine's `self` rule: nothing
 * offline can say whether a free sentence is good). Needs a word with an example sentence to show.
 */
export function useInSentence(word: WordFacts, lang: string, key: string): ExerciseSpec<'expand', TaskBody> | null {
  // A phrase is not a model sentence: it needs a few words.
  if (!word.sentence || plain(word.sentence).split(/\s+/).length < 4) return null;
  const prompt = 'Write a sentence with this word';
  return {
    key,
    kind: 'expand',
    lang,
    instruction: prompt,
    body: { task: 'expand', given: [word.gloss ? `${word.word}: ${word.gloss}` : word.word], prompt },
    check: { rule: 'self', modelAnswer: plain(word.sentence) },
    trains: { skill: 'writing', item: { type: 'word', wordId: `${lang}:${word.word.toLocaleLowerCase(lang)}` } },
    feedback: { why: plain(word.sentence) },
  };
}

// ── Listening (6-9) ─────────────────────────────────────────────────────────

/** A line of something the learner listened to: its words, and where in the audio or video it is heard. */
export interface HeardLine {
  text: string;
  mediaId?: string;
  startMs?: number;
  endMs?: number;
}

const listenOf = (l: HeardLine): ListenSource => ({ text: l.text, ...(l.mediaId && l.startMs !== undefined ? { clip: { mediaId: l.mediaId, startMs: l.startMs, endMs: l.endMs ?? l.startMs + 4000 } } : {}) });
const heardTrains = (l: HeardLine): Trains => ({ skill: 'listening', item: { type: 'text', textId: l.mediaId ?? 'heard' } });
const wordsOfLine = (text: string) => plain(text).split(/\s+/).filter(Boolean);

/** Dictation of a real line: hear it, type it. A missing accent counts as close, case and punctuation not at all. */
export function listenType(line: HeardLine, lang: string, key: string): ExerciseSpec<'listen-type', TaskBody> {
  return {
    key,
    kind: 'listen-type',
    lang,
    instruction: 'Type what you hear',
    body: { task: 'fix', given: [], prompt: 'Type what you hear' },
    listen: listenOf(line),
    check: { rule: 'accent-blind', expected: plain(line.text) },
    trains: heardTrains(line),
    feedback: { why: plain(line.text) },
    hints: [{ text: `${wordsOfLine(line.text).length} words`, strength: 0 }, { text: `It starts: ${wordsOfLine(line.text).slice(0, 2).join(' ')}…`, strength: 1 }],
  };
}

/** A real line with one word taken out: hear it whole, type the missing word. Needs a line of at least five words. */
export function listenGap(line: HeardLine, lang: string, random: () => number, key: string): ExerciseSpec<'listen-gap', TaskBody> | null {
  const words = wordsOfLine(line.text);
  if (words.length < 5) return null;
  // Not the first word, and a word of some size: the gap should be a word to hear, not "a".
  const candidates = words.map((w, i) => ({ w: w.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, ''), i })).filter((x) => x.i > 0 && [...x.w].length >= 4);
  if (!candidates.length) return null;
  const pick = candidates[Math.floor(random() * candidates.length)];
  const shown = words.map((w, i) => (i === pick.i ? w.replace(pick.w, '_____') : w)).join(' ');
  return {
    key,
    kind: 'listen-gap',
    lang,
    instruction: 'Type the missing word',
    body: { task: 'fix', given: [shown], prompt: 'Type the missing word' },
    listen: listenOf(line),
    check: { rule: 'accent-blind', expected: pick.w },
    trains: heardTrains(line),
    feedback: { why: plain(line.text) },
    hints: [{ text: `It has ${[...pick.w].length} letters`, strength: 0 }, { text: `It starts with “${[...pick.w][0]}”`, strength: 1 }],
  };
}

/** Hear a real line, then put its words in order. */
export function listenOrder(line: HeardLine, lang: string, random: () => number, key: string): ExerciseSpec<'drag-drop', DragBody> | null {
  const answer = wordsOfLine(line.text);
  if (answer.length < 3 || answer.length > 10) return null;
  let tiles = shuffle(answer, random);
  for (let i = 0; i < 5 && tiles.join(' ') === answer.join(' '); i++) tiles = shuffle(answer, random);
  return { key, kind: 'drag-drop', lang, instruction: 'Listen, then put the words in order', body: { prompt: 'Hear the line, then drag its words into order', tiles }, listen: listenOf(line), check: { rule: 'order', answer }, trains: heardTrains(line) };
}

/** "Drag the words into order": the tiles of a sentence, shuffled so it does not already read out. */
export function dragSentence(sentence: string, translation: string, lang: string, random: () => number, key: string, trains: Trains): ExerciseSpec<'drag-drop', DragBody> | null {
  const answer = plain(sentence).split(/\s+/).filter(Boolean);
  if (answer.length < 3 || answer.length > 10) return null;
  let tiles = shuffle(answer, random);
  for (let i = 0; i < 5 && tiles.join(' ') === answer.join(' '); i++) tiles = shuffle(answer, random);
  return { key, kind: 'drag-drop', lang, instruction: 'Drag the words into order', body: { prompt: translation, tiles }, check: { rule: 'order', answer }, trains };
}

/** Gives each spec a spare of its own kind to fall back on: "try again with another example" after a wrong answer. */
export function attachRetries<T extends ExerciseSpec>(main: T[], spares: T[]): T[] {
  const left = [...spares];
  return main.map((spec) => {
    const at = left.findIndex((s) => s.kind === spec.kind);
    return at < 0 ? spec : { ...spec, retry: left.splice(at, 1)[0] };
  });
}

/** The plain tenses only: "present into past" is not into the subjunctive, the future or a participle. */
const PLAIN = /^(?!.*(subjunctive|imperative|conditional|future|continuous|progressive|participle|perfect continuous|pluperfect))/i;
const PRESENT = new RegExp(`${PLAIN.source}present`, 'i');
const PAST = new RegExp(`${PLAIN.source}(past|preterit|imperfect|perfect)`, 'i');

/** "Present into past" (and back): the same person's form in two tenses, made from a word's tables. */
export function tenseTransforms(grids: FormGrid[], lang: string, random: () => number, count: number, trains: Trains, keyPrefix = 'tt', lemma?: string) {
  const pairs = take(pairsAcrossGrids(grids, PRESENT, PAST), random);
  const seen = new Set<string>();
  const out: Array<ReturnType<typeof transformSpec>> = [];
  for (const p of pairs) {
    const id = `${p.from.label}>${p.to.label}|${p.title}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(transformSpec({ ...p, title: `${p.title} · ${p.from.label} → ${p.to.label}` }, lang, `${keyPrefix}-${out.length}`, trains, lemma));
    if (out.length >= count) break;
  }
  return out;
}
