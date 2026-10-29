// One place that makes what the catalogue wants made (6-6) and checks it before anything is shown: a strict shape, every word
// looked up in the offline dictionary, the level measured and the text made again when it is off, and the result kept so the
// same request is never paid for twice. Max only (the learner's own key, Settings › AI).
import type { GeneratedRow } from '@/core/contracts/db';
import { cacheKey, LEVEL_BEYOND_LIMIT, levelReport, readGenerated, textOf, unknownWords, wordsOf } from '@/core/generate/generate';
import type { GeneratedBody, GeneratedKind, RewriteTask } from '@/core/generate/generate';
import { getLanguage } from '@/core/lang/languages';
import type { Cefr } from '@/core/lang/levels';
import { packId } from '@/core/packs/format';
import { db } from '@/data/db';
import type { LinguaDB } from '@/data/db';
import { findGenerated, saveGenerated } from '@/data/generated';
import { getSettings } from '@/data/settings';
import { chatJson, LlmError } from './client';

export interface GenerateRequest {
  lang: string;
  kind: GeneratedKind;
  level: Cefr;
  /** What it is about; optional. */
  topic?: string;
  /** The learner's own language, for translations. Default English. */
  native?: string;
  /** For 'rewrites': what the sentences are to be turned into. */
  task?: RewriteTask;
  /** For 'simplified': the text to be made easier. For 'quiz': the text (or the list of mistakes) the questions are about. For 'difference': the two words, "a | b". */
  source?: string;
  /** For 'quiz': what the questions are about (the main idea, who speaks, how they feel…). For 'drill': the grammar topic. For 'pronunciation': the sound. */
  focus?: string;
  /** For 'story': a speech, a lecture, documentary narration, a casual monologue. */
  style?: string;
}

/** What the offline dictionary says about some forms: which it knows, and how common each is (rank 1 is the most common). */
export interface Lookup {
  known: Set<string>;
  ranks: Map<string, number>;
}

export interface GenerateDeps {
  /** One answer from the model, as parsed JSON. */
  ask: (system: string, user: string) => Promise<unknown>;
  lookup: (lang: string, norms: string[]) => Promise<Lookup>;
  database: LinguaDB;
  model: string;
  now: () => number;
}

/** Tries a text, then makes it again (at most this many times in all) when it goes beyond the level. */
export const MAX_ATTEMPTS = 3;

const WORDS: Record<Cefr, number> = { A1: 60, A2: 100, B1: 150, B2: 220, C1: 300, C2: 300 };

/** The prompts of the kinds that came with 6-6b's later parts, each its own so the long chain below stays as it was. */
function morePrompt(req: GenerateRequest, name: string, native: string, level: string, retry: string): string | null {
  switch (req.kind) {
    case 'difference':
      return `You explain to a learner of ${name} (CEFR ${level}) how two easily confused words differ. Answer only with JSON: {"summary": string, "rows": [{"word": string, "use": string, "example": string}, {"word": string, "use": string, "example": string}]}. ` + `"summary" is one sentence in ${native} saying the difference. Each row is one of the two words in the user message: "use" says in ${native}, in a sentence, when it is used; "example" is one short natural sentence in ${name} with it. Be exact; if the two words are not really confusable, still answer for what they mean.${retry}`;
    case 'drill':
      return `You write grammar drills in ${name} for learners at ${level}. Answer only with JSON: {"topic": string, "items": [{"before": string, "answer": string, "after": string, "hint": string}]}. ` + `Eight sentences on the grammar topic in the user message, each with one gap: "before" is the sentence up to the gap, "answer" is the one word or form that fills it (the only correct one), "after" is the rest, "hint" is a short ${native} clue (the dictionary form, or the tense wanted). Only the most common words a ${level} learner meets.${retry}`;
    case 'pronunciation':
      return `You write pronunciation practice in ${name} for learners at ${level}. Answer only with JSON: {"sound": string, "items": [{"text": string, "note": string}]}. ` + `For the sound or contrast in the user message: ten items, from single words, then pairs of words that differ by that sound, to two or three short phrases, ending with one tongue twister if the language has a well-known one. "note" says in ${native} what to listen for or do with the mouth, briefly.${retry}`;
    case 'adventure':
      return `You write interactive stories in ${name} for learners at ${level}. Answer only with JSON: {"title": string, "start": string, "scenes": {"<id>": {"text": string, "choices": [{"label": string, "to": string}]}}}. ` + `Six to ten short scenes (two to four sentences each), each with an id like "s1"; "start" is the id of the first. A scene has two choices that lead to other scenes ("to" is an id that exists); a scene with an empty "choices" list is an ending, and there are at least two endings. Simple tenses, only the most common words a ${level} learner meets, no notes.${retry}`;
    case 'course':
      return `You plan short courses in ${name} for learners at ${level}. Answer only with JSON: {"title": string, "lessons": [{"title": string, "goal": string, "words": [{"term": string, "meaning": string}], "sentence": string}]}. ` + `Six lessons on the topic in the user message, in a sensible order. Each lesson: a title, a goal in one ${native} sentence ("You will be able to…"), eight words (dictionary form, with their ${native} meaning) and one sentence in ${name} using several of them.${retry}`;
    default:
      return null;
  }
}

function prompt(req: GenerateRequest, avoid: string[]): { system: string; user: string } {
  const name = getLanguage(req.lang)?.name ?? req.lang;
  const native = getLanguage(req.native ?? 'en')?.name ?? 'English';
  const level = `CEFR level ${req.level}`;
  const retry = avoid.length ? ` Your last text used words that are too difficult for the level (${avoid.join(', ')}): write it again with simpler, more common words instead.` : '';
  const TASK_PROMPT: Record<RewriteTask, string> = {
    passive: 'Each item is one active sentence and the same sentence in the passive voice.',
    reported: 'Each item is one sentence of direct speech (with the speaker) and the same said in reported speech.',
    question: 'Each item is one statement and the question that asks about the same thing.',
    combine: 'Each item is two short sentences and one sentence that joins them well (a relative clause, a conjunction).',
    expand: 'Each item is one short sentence and a fuller sentence that adds one piece of information (where, when, why or how).',
    simplify: 'Each item is one long or complex sentence and a simpler sentence with the same meaning.',
  };
  const extra = morePrompt(req, name, native, level, retry);
  const system =
    extra ??
    (req.kind === 'simplified'
      ? `You rewrite texts in ${name} for learners at ${level}, keeping the meaning and the facts. Answer only with JSON: {"title": string, "text": string, "translation": string}. ` +
        `"text" is the text rewritten with shorter sentences and only the most common words a ${level} learner meets, in short paragraphs separated by a blank line; "translation" is its ${native} translation, paragraph by paragraph.${retry}`
      : req.kind === 'quiz'
        ? `You write multiple-choice quizzes in ${name} for learners at ${level}. Answer only with JSON: {"title": string, "questions": [{"question": string, "options": [string], "answer": number, "why": string}]}. ` +
          `${req.source ? (req.topic === 'my mistakes' ? 'The user message lists words and grammar the learner keeps getting wrong, with what they wrote where known: write questions that practise exactly those. ' : 'The questions must be about the text in the user message (its facts, its words), not about anything else. ') : ''}Five questions${req.source ? '' : ' on the topic'}, each with four different options in ${name} and "answer" the index (0 to 3) of the one right option; "why" is one short ${native} sentence saying why. Only the most common words a ${level} learner meets.${retry}`
        : req.kind === 'wordlist'
      ? `You choose useful vocabulary in ${name} for learners at ${level}. Answer only with JSON: {"words": [{"term": string, "meaning": string, "example": string}]}. ` +
        `Twelve words or short phrases a ${level} learner would really use about the topic, each in its dictionary form; "meaning" is its ${native} meaning in a few words; "example" is one short natural sentence in ${name}.${retry}`
      : req.kind === 'dialogue'
      ? `You write short everyday dialogues in ${name} for learners at ${level}. Answer only with JSON: {"title": string, "lines": [{"speaker": string, "text": string, "translation": string}]}. ` +
        `Six to eight lines between two people (use two first names), only the most common words a ${level} learner meets, and each line's ${native} translation.${retry}`
      : req.kind === 'rewrites' && req.task
        ? `You write sentence exercises in ${name} for learners at ${level}. Answer only with JSON: {"items": [{"given": [string], "answer": string}]}. Six items. ${TASK_PROMPT[req.task]} ` +
          `"given" is a list of the sentence or sentences to start from; "answer" is the one correct result. Only the most common words a ${level} learner meets.${retry}`
        : req.kind === 'story'
      ? `You write short graded-reader stories in ${name} for learners at ${level}. Answer only with JSON: {"title": string, "text": string, "translation": string}. ` +
        `"text" is the story in ${name}, about ${WORDS[req.level]} words, in short paragraphs separated by a blank line, using only the most common words a ${level} learner meets and simple tenses. No notes, no glossary. ` +
        `"translation" is its ${native} translation, paragraph by paragraph.${retry}`
      : `You write natural example sentences in ${name} for learners at ${level}. Answer only with JSON: {"sentences": [{"text": string, "translation": string}]}. ` +
        `Eight short sentences, each using only the most common words a ${level} learner meets; "translation" is ${native}.${retry}`);
  return { system: system + (req.kind === 'quiz' && req.focus ? ` The questions are about ${req.focus}.` : '') + (req.kind === 'story' && req.style ? ` Write it as ${req.style}, not as a story.` : ''), user: JSON.stringify(
      req.kind === 'simplified' || (req.kind === 'quiz' && req.source)
        ? { text: req.source, language: name, level: req.level }
        : req.kind === 'difference'
          ? { words: req.source, language: name, level: req.level }
          : req.kind === 'drill'
            ? { grammarTopic: req.focus ?? req.topic ?? 'the present tense', language: name, level: req.level }
            : req.kind === 'pronunciation'
              ? { sound: req.focus ?? req.topic ?? 'the sounds of the language', language: name, level: req.level }
              : { topic: req.topic?.trim() || 'everyday life', language: name, level: req.level },
    ),
  };
}

/** The dictionary's view of some forms, from the language pack on this device (empty when it is not installed). */
async function packLookup(lang: string, norms: string[], database: LinguaDB): Promise<Lookup> {
  const pack = packId(lang);
  const [forms, freq] = await Promise.all([database.dictForms.bulkGet(norms.map((n) => [pack, n] as [string, string])), database.frequency.bulkGet(norms.map((n) => `${lang}:${n}`))]);
  const known = new Set<string>();
  const ranks = new Map<string, number>();
  norms.forEach((n, i) => {
    if (forms[i]) known.add(n);
    const row = freq[i];
    if (row) ranks.set(n, row.rank);
  });
  return { known, ranks };
}

async function defaultDeps(): Promise<GenerateDeps> {
  const settings = await getSettings();
  return {
    ask: (system, user) => chatJson<unknown>(system, [{ role: 'user', content: user }]),
    lookup: (lang, norms) => packLookup(lang, norms, db),
    database: db,
    model: settings.llm.model,
    now: Date.now,
  };
}

/**
 * Makes what was asked for, or gives back what was made before. A text that doesn't have its shape is thrown away and asked
 * for again; one that goes beyond the level is made again with the hard words named, up to three tries in all, and the best
 * try is kept with only the checks it passed (so its label says "level not confirmed" rather than claiming it).
 */
export async function generateMaterial(req: GenerateRequest, deps?: GenerateDeps): Promise<{ row: GeneratedRow; cached: boolean }> {
  const d = deps ?? (await defaultDeps());
  const hash = cacheKey(req);
  const cached = await findGenerated(hash, d.database);
  if (cached) return { row: cached, cached: true };

  let best: { body: GeneratedBody; checks: GeneratedRow['checks']; unknown?: string[]; beyond: number } | null = null;
  let avoid: string[] = [];
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { system, user } = prompt(req, avoid);
    const body = readGenerated(req.kind, await d.ask(system, user), req.task);
    if (!body) continue;

    const words = wordsOf(textOf(req.kind, body), req.lang);
    const { known, ranks } = await d.lookup(req.lang, [...words.keys()]);
    const checks: GeneratedRow['checks'] = ['schema'];
    // The dictionary and the frequency list come with the language pack: without it, those checks are not claimed.
    const hasDictionary = known.size > 0;
    if (hasDictionary) checks.push('dictionary');
    let beyond = Infinity;
    if (ranks.size > 0) {
      const report = levelReport(words, ranks, req.level);
      beyond = report.beyond;
      avoid = report.hard;
      if (beyond <= LEVEL_BEYOND_LIMIT[req.kind]) checks.push('level');
    }
    const candidate = { body, checks, unknown: hasDictionary ? unknownWords(words, known) : undefined, beyond };
    if (!best || beyond < best.beyond || (checks.length > best.checks.length && beyond === best.beyond)) best = candidate;
    // At the level, or no way to measure it: nothing to improve.
    if (checks.includes('level') || ranks.size === 0) break;
  }
  if (!best) throw new LlmError('The AI answer could not be read. Try again.', 'bad-response');

  const row: GeneratedRow = {
    id: crypto.randomUUID(),
    lang: req.lang,
    kind: req.kind,
    hash,
    level: req.level,
    content: best.body,
    checks: best.checks,
    unknownWords: best.unknown,
    model: d.model,
    createdAt: d.now(),
  };
  await saveGenerated(row, d.database);
  return { row, cached: false };
}
