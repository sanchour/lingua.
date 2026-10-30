// What Max makes (6-6), and what is checked before it is shown. "Language learners can easily internalize a confident but
// incorrect explanation": so nothing generated is shown unchecked. Pure: the model and the dictionary come in from outside.
import type { GeneratedRow } from '@/core/contracts/db';
import { hashString } from '@/core/hash';
import { CEFR_LEVELS, cefrForRank } from '@/core/lang/levels';
import type { Cefr } from '@/core/lang/levels';
import { normalizeWord } from '@/core/text/normalize';

export type GeneratedKind = 'story' | 'sentences' | 'dialogue' | 'rewrites' | 'wordlist' | 'quiz' | 'simplified' | 'difference' | 'drill' | 'pronunciation' | 'adventure' | 'course' | 'translations';

/** What a made-to-order rewrite asks for (the sentence tasks of 6-4b). */
export type RewriteTask = 'passive' | 'reported' | 'question' | 'combine' | 'expand' | 'simplify';
export const REWRITE_TASKS: RewriteTask[] = ['passive', 'reported', 'question', 'combine', 'expand', 'simplify'];
export type Check = GeneratedRow['checks'][number];

export interface StoryBody {
  title: string;
  /** The story, paragraphs separated by a blank line. */
  text: string;
  /** Its English translation, paragraphs in the same order. */
  translation: string;
}

export interface SentencesBody {
  sentences: Array<{ text: string; translation: string }>;
}

/** A short exchange between two people, with its translation line by line. */
export interface DialogueBody {
  title: string;
  lines: Array<{ speaker: string; text: string; translation?: string }>;
}

/** Sentences to be rewritten and what they become: one sentence each, or two to combine. */
export interface RewritesBody {
  task: RewriteTask;
  items: Array<{ given: string[]; answer: string }>;
}

/** Useful words about a topic, each with its meaning and a sentence: the stuff of a deck. */
export interface WordlistBody {
  words: Array<{ term: string; meaning: string; example?: string }>;
}

/** Multiple-choice questions on a topic, each with its reason. */
export interface QuizBody {
  title: string;
  questions: Array<{ question: string; options: string[]; answer: number; why?: string }>;
}

/** How two words that are easily mixed up differ (6-1c): each with what it is used for and an example, and the one-line difference. */
export interface DifferenceBody {
  summary: string;
  rows: Array<{ word: string; use: string; example: string }>;
}

/** One passage in the target language, put into the learner's language three ways (6-13): word for word, natural, and as literature, with where they part. */
export interface TranslationsBody {
  versions: Array<{ style: 'literal' | 'natural' | 'literary'; text: string; note: string }>;
  choices: Array<{ phrase: string; why: string }>;
}

/** A grammar drill: sentences with one gap each, on one topic. */
export interface DrillBody {
  topic: string;
  items: Array<{ before: string; answer: string; after: string; hint?: string }>;
}

/** Words, phrases and tongue twisters to practise one sound or contrast. */
export interface PronunciationBody {
  sound: string;
  items: Array<{ text: string; note?: string }>;
}

/** An interactive story: scenes that lead to other scenes by the reader's choices (6-6b). */
export interface AdventureBody {
  title: string;
  start: string;
  scenes: Record<string, { text: string; choices: Array<{ label: string; to: string }> }>;
}

/** A short course: lessons with a goal, the words to learn and a sentence that uses them. */
export interface CourseBody {
  title: string;
  lessons: Array<{ title: string; goal: string; words: Array<{ term: string; meaning: string }>; sentence: string }>;
}

export type GeneratedBody = TranslationsBody | StoryBody | SentencesBody | DialogueBody | RewritesBody | WordlistBody | QuizBody | DifferenceBody | DrillBody | PronunciationBody | AdventureBody | CourseBody;

const str = (v: unknown, max = 8000): string | null => (typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : null);

/** A story as the model answered, if it has the shape it must (strict: a story without its translation is not accepted). */
export function readStory(raw: unknown): StoryBody | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const title = str(r.title, 120);
  const text = str(r.text);
  const translation = str(r.translation);
  return title && text && translation ? { title, text, translation } : null;
}

/** A list of example sentences with their translations: at least three usable ones, each short. */
export function readSentences(raw: unknown): SentencesBody | null {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { sentences?: unknown }).sentences)) return null;
  const sentences = (raw as { sentences: unknown[] }).sentences.flatMap((s) => {
    const o = s && typeof s === 'object' ? (s as Record<string, unknown>) : {};
    const text = str(o.text, 240);
    const translation = str(o.translation, 240);
    return text && translation ? [{ text, translation }] : [];
  });
  return sentences.length >= 3 ? { sentences } : null;
}

/** A dialogue of at least four lines, two people at most, each line with its words. */
export function readDialogue(raw: unknown): DialogueBody | null {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { lines?: unknown }).lines)) return null;
  const lines = (raw as { lines: unknown[] }).lines.flatMap((l) => {
    const o = l && typeof l === 'object' ? (l as Record<string, unknown>) : {};
    const speaker = str(o.speaker, 20);
    const text = str(o.text, 240);
    return speaker && text ? [{ speaker, text, translation: str(o.translation, 240) ?? undefined }] : [];
  });
  const title = str((raw as { title?: unknown }).title, 120) ?? 'A conversation';
  return lines.length >= 4 && new Set(lines.map((l) => l.speaker)).size <= 2 ? { title, lines } : null;
}

/** Rewrites for a task: at least three, each with something to start from and an answer; a "combine" gives two sentences, the others one. */
export function readRewrites(raw: unknown, task: RewriteTask): RewritesBody | null {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { items?: unknown }).items)) return null;
  const items = (raw as { items: unknown[] }).items.flatMap((it) => {
    const o = it && typeof it === 'object' ? (it as Record<string, unknown>) : {};
    const given = Array.isArray(o.given) ? o.given.map((g) => str(g, 240)).filter((g): g is string => g !== null) : [];
    const answer = str(o.answer, 300);
    const right = task === 'combine' ? given.length === 2 : given.length === 1;
    return right && answer && !given.includes(answer) ? [{ given, answer }] : [];
  });
  return items.length >= 3 ? { task, items } : null;
}

/** A word list: at least five words, each with a short word or phrase and its meaning; doubles are dropped. */
export function readWordlist(raw: unknown): WordlistBody | null {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { words?: unknown }).words)) return null;
  const seen = new Set<string>();
  const words = (raw as { words: unknown[] }).words.flatMap((w) => {
    const o = w && typeof w === 'object' ? (w as Record<string, unknown>) : {};
    const term = str(o.term, 40);
    const meaning = str(o.meaning, 120);
    if (!term || !meaning || seen.has(term.toLocaleLowerCase())) return [];
    seen.add(term.toLocaleLowerCase());
    return [{ term, meaning, example: str(o.example, 240) ?? undefined }];
  });
  return words.length >= 5 ? { words } : null;
}

/** A quiz: at least three questions, each with 3 or 4 different options and one right answer among them. */
export function readQuiz(raw: unknown): QuizBody | null {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { questions?: unknown }).questions)) return null;
  const questions = (raw as { questions: unknown[] }).questions.flatMap((q) => {
    const o = q && typeof q === 'object' ? (q as Record<string, unknown>) : {};
    const question = str(o.question, 300);
    const options = Array.isArray(o.options) ? o.options.map((x) => str(x, 160)).filter((x): x is string => x !== null) : [];
    const answer = typeof o.answer === 'number' && Number.isInteger(o.answer) ? o.answer : -1;
    const fine = question && options.length >= 3 && options.length <= 4 && new Set(options.map((x) => x.toLocaleLowerCase())).size === options.length && answer >= 0 && answer < options.length;
    return fine ? [{ question, options, answer, why: str(o.why, 300) ?? undefined }] : [];
  });
  const title = str((raw as { title?: unknown }).title, 120) ?? 'A quiz';
  return questions.length >= 3 ? { title, questions } : null;
}

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

/** Two rows, each with the word, what it is for and an example; the summary says the difference in a line. */
export function readDifference(raw: unknown): DifferenceBody | null {
  const r = obj(raw);
  const summary = str(r.summary, 400);
  const rows = Array.isArray(r.rows) ? r.rows.flatMap((x) => (str(obj(x).word, 60) && str(obj(x).use, 300) && str(obj(x).example, 240) ? [{ word: str(obj(x).word, 60)!, use: str(obj(x).use, 300)!, example: str(obj(x).example, 240)! }] : [])) : [];
  return summary && rows.length === 2 ? { summary, rows } : null;
}

/** Exactly the three versions, once each, and up to six notes on where the choices were made. */
export function readTranslations(raw: unknown): TranslationsBody | null {
  const r = obj(raw);
  const versions = Array.isArray(r.versions)
    ? r.versions.flatMap((x) => {
        const o = obj(x);
        const style = o.style;
        return (style === 'literal' || style === 'natural' || style === 'literary') && str(o.text, 3000) && str(o.note, 300) ? [{ style: style as TranslationsBody['versions'][number]['style'], text: str(o.text, 3000)!, note: str(o.note, 300)! }] : [];
      })
    : [];
  const choices = Array.isArray(r.choices) ? r.choices.flatMap((x) => (str(obj(x).phrase, 120) && str(obj(x).why, 300) ? [{ phrase: str(obj(x).phrase, 120)!, why: str(obj(x).why, 300)! }] : [])).slice(0, 6) : [];
  return versions.length === 3 && new Set(versions.map((v) => v.style)).size === 3 ? { versions, choices } : null;
}

/** A drill: at least four items, each with the sentence's two halves and the word for the gap between them. */
export function readDrill(raw: unknown): DrillBody | null {
  const r = obj(raw);
  const topic = str(r.topic, 120);
  const items = Array.isArray(r.items)
    ? r.items.flatMap((x) => {
        const o = obj(x);
        const answer = str(o.answer, 60);
        const before = typeof o.before === 'string' ? o.before.trimStart() : '';
        const after = typeof o.after === 'string' ? o.after : '';
        return answer && before.length + after.length >= 8 && before.length + after.length <= 240 ? [{ before, answer, after, hint: str(o.hint, 120) ?? undefined }] : [];
      })
    : [];
  return topic && items.length >= 4 ? { topic, items } : null;
}

export function readPronunciation(raw: unknown): PronunciationBody | null {
  const r = obj(raw);
  const sound = str(r.sound, 80);
  const items = Array.isArray(r.items) ? r.items.flatMap((x) => (str(obj(x).text, 160) ? [{ text: str(obj(x).text, 160)!, note: str(obj(x).note, 160) ?? undefined }] : [])) : [];
  return sound && items.length >= 6 ? { sound, items } : null;
}

/** An adventure: a start scene that exists, at least four scenes, every choice leading to a scene that exists, and at least one scene with no way on (an ending). */
export function readAdventure(raw: unknown): AdventureBody | null {
  const r = obj(raw);
  const title = str(r.title, 120);
  const start = str(r.start, 40);
  const src = obj(r.scenes);
  const scenes: AdventureBody['scenes'] = {};
  for (const [id, v] of Object.entries(src)) {
    const o = obj(v);
    const text = str(o.text, 1200);
    if (!text || id.length > 40) continue;
    const choices = Array.isArray(o.choices) ? o.choices.flatMap((c) => (str(obj(c).label, 160) && str(obj(c).to, 40) ? [{ label: str(obj(c).label, 160)!, to: str(obj(c).to, 40)! }] : [])) : [];
    scenes[id] = { text, choices };
  }
  const ids = Object.keys(scenes);
  const sound = ids.length >= 4 && ids.length <= 14 && start !== null && start in scenes && ids.every((id) => scenes[id].choices.every((c) => c.to in scenes)) && ids.some((id) => scenes[id].choices.length === 0);
  return title && sound ? { title, start: start!, scenes } : null;
}

export function readCourse(raw: unknown): CourseBody | null {
  const r = obj(raw);
  const title = str(r.title, 120);
  const lessons = Array.isArray(r.lessons)
    ? r.lessons.flatMap((x) => {
        const o = obj(x);
        const words = Array.isArray(o.words) ? o.words.flatMap((w) => (str(obj(w).term, 40) && str(obj(w).meaning, 100) ? [{ term: str(obj(w).term, 40)!, meaning: str(obj(w).meaning, 100)! }] : [])) : [];
        return str(o.title, 100) && str(o.goal, 200) && str(o.sentence, 240) && words.length >= 5 ? [{ title: str(o.title, 100)!, goal: str(o.goal, 200)!, words, sentence: str(o.sentence, 240)! }] : [];
      })
    : [];
  return title && lessons.length >= 4 ? { title, lessons } : null;
}

export function readGenerated(kind: GeneratedKind, raw: unknown, task?: RewriteTask): GeneratedBody | null {
  if (kind === 'translations') return readTranslations(raw);
  if (kind === 'difference') return readDifference(raw);
  if (kind === 'drill') return readDrill(raw);
  if (kind === 'pronunciation') return readPronunciation(raw);
  if (kind === 'adventure') return readAdventure(raw);
  if (kind === 'course') return readCourse(raw);
  if (kind === 'wordlist') return readWordlist(raw);
  if (kind === 'quiz') return readQuiz(raw);
  if (kind === 'simplified') return readStory(raw);
  if (kind === 'story') return readStory(raw);
  if (kind === 'dialogue') return readDialogue(raw);
  if (kind === 'rewrites') return task ? readRewrites(raw, task) : null;
  return readSentences(raw);
}

/** The words of what was made, the way the dictionary spells them, each once with how many times it came. */
export function wordsOf(text: string, lang: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const part of new Intl.Segmenter(lang, { granularity: 'word' }).segment(text)) {
    if (!part.isWordLike || /^\d+$/.test(part.segment)) continue;
    const norm = normalizeWord(part.segment, lang);
    if (norm) out.set(norm, (out.get(norm) ?? 0) + 1);
  }
  return out;
}

/** All the target-language text of a body. */
export function textOf(kind: GeneratedKind, body: GeneratedBody): string {
  // The passage is the learner's own and the versions are in their language: no target-language text to measure.
  if (kind === 'translations') return '';
  if (kind === 'difference') return (body as DifferenceBody).rows.map((r) => r.example).join('\n');
  if (kind === 'drill') return (body as DrillBody).items.map((i) => `${i.before}${i.answer}${i.after}`).join('\n');
  if (kind === 'pronunciation') return (body as PronunciationBody).items.map((i) => i.text).join('\n');
  if (kind === 'adventure') return Object.values((body as AdventureBody).scenes).map((s) => s.text).join('\n');
  if (kind === 'course') return (body as CourseBody).lessons.map((l) => `${l.words.map((w) => w.term).join(' ')} ${l.sentence}`).join('\n');
  if (kind === 'story' || kind === 'simplified') return (body as StoryBody).text;
  if (kind === 'quiz') return (body as QuizBody).questions.flatMap((q) => [q.question, ...q.options]).join('\n');
  if (kind === 'dialogue') return (body as DialogueBody).lines.map((l) => l.text).join('\n');
  if (kind === 'rewrites') return (body as RewritesBody).items.flatMap((i) => [...i.given, i.answer]).join('\n');
  if (kind === 'wordlist') return (body as WordlistBody).words.map((w) => [w.term, w.example ?? ''].join(' ')).join('\n');
  return (body as SentencesBody).sentences.map((s) => s.text).join('\n');
}

/** Forms the offline dictionary does not know (names are likely among them): flagged, not hidden. */
export function unknownWords(words: ReadonlyMap<string, number>, known: ReadonlySet<string>): string[] {
  return [...words.keys()].filter((w) => !known.has(w));
}

export interface LevelReport {
  /** Share of the running words that are beyond the level, 0 to 1. */
  beyond: number;
  /** The most common of them, to ask the model to replace. */
  hard: string[];
  /** Words with no frequency rank (names, rare words): left out of the share. */
  unranked: number;
}

const levelIndex = (level: Cefr) => CEFR_LEVELS.indexOf(level);

/** How far a text goes beyond a level: the share of its running words more rare than the level's vocabulary (core/lang/levels cefrForRank). */
export function levelReport(words: ReadonlyMap<string, number>, rankOf: ReadonlyMap<string, number>, level: Cefr): LevelReport {
  let total = 0;
  let beyond = 0;
  let unranked = 0;
  const hard = new Map<string, number>();
  for (const [word, count] of words) {
    const rank = rankOf.get(word);
    if (rank === undefined) {
      unranked += count;
      continue;
    }
    total += count;
    if (levelIndex(cefrForRank(rank)) > levelIndex(level)) {
      beyond += count;
      hard.set(word, count);
    }
  }
  return { beyond: total ? beyond / total : 0, hard: [...hard.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w).slice(0, 12), unranked };
}

/** A text is "at the level" when at most this share of its words is beyond it. */
export const LEVEL_BEYOND_LIMIT: Record<GeneratedKind, number> = { story: 0.12, sentences: 0.15, dialogue: 0.12, rewrites: 0.15, wordlist: 0.3, quiz: 0.15, simplified: 0.12, difference: 0.3, drill: 0.15, pronunciation: 0.3, adventure: 0.12, course: 0.3, translations: 1 };

/** The cache key: the same request is answered from what was made before, and paid for once. */
export function cacheKey(req: { lang: string; kind: GeneratedKind; level: string; topic?: string; native?: string; task?: RewriteTask; source?: string; focus?: string; style?: string }): string {
  return hashString(['generated', req.lang, req.kind, req.task ?? '', req.level, (req.topic ?? '').trim().toLowerCase(), req.native ?? 'en', req.source ? hashString(req.source) : '', ...(req.focus || req.style ? [req.focus ?? '', req.style ?? ''] : [])].join('|'));
}

/** The quiet label shown beside everything generated: what it is, and what was checked. */
export function labelFor(row: Pick<GeneratedRow, 'checks' | 'unknownWords' | 'level'>): { text: string; detail: string } {
  const done = new Set(row.checks);
  const parts = [
    done.has('schema') ? 'built to a fixed shape' : null,
    done.has('dictionary') ? (row.unknownWords?.length ? `${row.unknownWords.length} words the dictionary doesn’t know` : 'every word is in the dictionary') : 'words not checked',
    done.has('level') ? `checked at ${row.level ?? 'its level'}` : 'level not confirmed',
    done.has('grammar') ? 'grammar double-checked' : null,
  ].filter(Boolean);
  return { text: 'Generated', detail: `Made by AI. ${parts.join(' · ')}.` };
}
