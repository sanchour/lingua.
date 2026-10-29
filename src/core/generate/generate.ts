// What Max makes (6-6), and what is checked before it is shown. "Language learners can easily internalize a confident but
// incorrect explanation": so nothing generated is shown unchecked. Pure: the model and the dictionary come in from outside.
import type { GeneratedRow } from '@/core/contracts/db';
import { hashString } from '@/core/hash';
import { CEFR_LEVELS, cefrForRank } from '@/core/lang/levels';
import type { Cefr } from '@/core/lang/levels';
import { normalizeWord } from '@/core/text/normalize';

export type GeneratedKind = 'story' | 'sentences';
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

export type GeneratedBody = StoryBody | SentencesBody;

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

export function readGenerated(kind: GeneratedKind, raw: unknown): GeneratedBody | null {
  return kind === 'story' ? readStory(raw) : readSentences(raw);
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
  return kind === 'story' ? (body as StoryBody).text : (body as SentencesBody).sentences.map((s) => s.text).join('\n');
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
export const LEVEL_BEYOND_LIMIT: Record<GeneratedKind, number> = { story: 0.12, sentences: 0.15 };

/** The cache key: the same request is answered from what was made before, and paid for once. */
export function cacheKey(req: { lang: string; kind: GeneratedKind; level: string; topic?: string; native?: string }): string {
  return hashString(['generated', req.lang, req.kind, req.level, (req.topic ?? '').trim().toLowerCase(), req.native ?? 'en'].join('|'));
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
