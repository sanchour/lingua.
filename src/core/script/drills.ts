// Alphabet lessons (Lingua 3.0-8, part 5), pure and seeded. A group's lesson meets each new letter
// (shape, name, sound, a word), asks for it both ways (its sound from the shape, the shape from its
// sound), matches pairs, reads real words, picks Arabic's joined shapes, then traces the letters
// and writes them from memory. Reviews and practice skip the meeting.
import { shuffle } from '@/core/srs/ludus';
import { joinedForm, joinsAfter, lettersOf } from './types';
import type { Letter, Position, Script, ScriptGroup, ScriptWord } from './types';

interface Base {
  key: string;
}
export type ScriptDrill =
  | (Base & { kind: 'meet'; letter: Letter })
  /** The shape shown: pick its sound. */
  | (Base & {
      kind: 'sound';
      letter: Letter;
      options: string[];
      answer: number;
    })
  /** The sound shown: pick its shape. */
  | (Base & {
      kind: 'letter';
      letter: Letter;
      options: string[];
      answer: number;
    })
  /** A real word: pick how it reads (Mandarin: which word the pinyin is). */
  | (Base & {
      kind: 'read';
      word: ScriptWord;
      options: string[];
      answer: number;
    })
  /** Hear a word: pick it written (Mandarin: its pinyin, for the tones). */
  | (Base & {
      kind: 'hear';
      word: ScriptWord;
      options: string[];
      answer: number;
    })
  | (Base & { kind: 'pairs'; pairs: Array<[string, string]> })
  /** Arabic: the letter's shape at the start, in the middle or at the end of a word. */
  | (Base & {
      kind: 'form';
      letter: Letter;
      position: Position;
      options: string[];
      answer: number;
    })
  | (Base & { kind: 'trace'; letter: Letter })
  | (Base & { kind: 'write'; letter: Letter });

export type ScriptDrillKind = ScriptDrill['kind'];

export const SCRIPT_DRILL_LABEL: Record<ScriptDrillKind, string> = {
  meet: 'New letter',
  sound: 'How does it sound?',
  letter: 'Which letter?',
  read: 'Read it',
  hear: 'What did you hear?',
  pairs: 'Match the pairs',
  form: 'Its shape in a word',
  trace: 'Trace it',
  write: 'Write it from memory',
};

/** Drills that grade the letter they show (the others are practice). */
export const gradedLetter = (d: ScriptDrill): Letter | null => ('letter' in d && d.kind !== 'meet' ? d.letter : null);

const label = (l: Letter) => (l.lower && l.lower !== l.glyph ? `${l.glyph} ${l.lower}` : l.glyph);

/** Up to three others, never one that reads the same as the answer (η, ι and υ all read i). */
function optionsFor<T>(right: T, pool: T[], show: (t: T) => string, random: () => number, n = 4): { options: string[]; answer: number } {
  const want = show(right);
  const others = shuffle([...new Map(pool.filter((p) => show(p) !== want).map((p) => [show(p), p])).values()], random).slice(0, n - 1);
  const options = shuffle([want, ...others.map(show)], random);
  return { options, answer: options.indexOf(want) };
}

/** Letters to take wrong options from: the group's own first, then any already met. */
function neighbours(script: Script, group: ScriptGroup | null, letter: Letter): Letter[] {
  const all = lettersOf(script);
  const own = (group ?? script.groups.find((g) => g.letters.includes(letter)))?.letters ?? [];
  const pool = own.length >= 4 ? own : [...own, ...all.slice(0, all.indexOf(letter) + 1), ...all];
  return pool.filter((l) => l.id !== letter.id);
}

export function letterDrill(kind: 'sound' | 'letter', letter: Letter, script: Script, group: ScriptGroup | null, random: () => number, key: string): ScriptDrill {
  const pool = neighbours(script, group, letter);
  return kind === 'sound' ? { kind, key, letter, ...optionsFor(letter, pool, (l) => l.latin, random) } : { kind, key, letter, ...optionsFor(letter, pool, label, random) };
}

/** Every word in the script's lessons, for wrong options. */
const allWords = (script: Script) => [...new Map(script.groups.flatMap((g) => [...g.letters.flatMap((l) => l.words), ...(g.reading ?? [])]).map((w) => [w.w, w])).values()];

export function readDrill(word: ScriptWord, script: Script, random: () => number, key: string): ScriptDrill {
  const pool = allWords(script);
  // Mandarin reads pinyin to a word (shown with its meaning); the others read a word to its romanization.
  return script.lang === 'zh'
    ? {
        kind: 'read',
        key,
        word,
        ...optionsFor(word, pool, (w) => `${w.w} · ${w.en}`, random),
      }
    : {
        kind: 'read',
        key,
        word,
        ...optionsFor(word, pool, (w) => w.latin, random),
      };
}

export function hearDrill(word: ScriptWord, script: Script, random: () => number, key: string): ScriptDrill {
  const pool = allWords(script);
  return {
    kind: 'hear',
    key,
    word,
    ...optionsFor(word, pool, (w) => (script.lang === 'zh' ? w.latin : w.w), random),
  };
}

export function formDrill(letter: Letter, script: Script, group: ScriptGroup | null, random: () => number, key: string): ScriptDrill {
  // Only letters that change shape are worth asking; the middle and start are where they differ most.
  const position: Position = shuffle(joinsAfter(letter.glyph) ? (['initial', 'medial', 'final'] as const) : (['final'] as const), random)[0];
  const pool = neighbours(script, group, letter).filter((l) => script.groups.find((g) => g.letters.includes(l))?.writable);
  return {
    kind: 'form',
    key,
    letter,
    position,
    ...optionsFor(letter, pool, (l) => joinedForm(l.glyph, position), random),
  };
}

export interface LessonOptions {
  random: () => number;
  /** A natural voice speaks the language. */
  canHear?: boolean;
  /** Writing practice on (off for, say, a lesson on the move). */
  writing?: boolean;
}

/** The lesson that teaches a group. */
export function planGroupLesson(script: Script, group: ScriptGroup, opts: LessonOptions): ScriptDrill[] {
  const { random } = opts;
  const letters = group.letters;
  const out: ScriptDrill[] = [];
  let n = 0;
  const key = (k: string) => `${k}-${n++}`;
  // Meet each letter, and ask for it once right away, alternating the direction.
  letters.forEach((l, i) => {
    out.push({ kind: 'meet', key: key('meet'), letter: l });
    out.push(letterDrill(i % 2 ? 'letter' : 'sound', l, script, group, random, key('first')));
    // Every third letter, and at the end, a round of pairs over the letters met so far.
    if (i >= 2 && (i % 3 === 2 || i === letters.length - 1)) out.push(pairsDrill(letters.slice(0, i + 1).slice(-5), random, key('pairs')));
  });
  // Then the other direction, mixed.
  const mixed: ScriptDrill[] = shuffle(letters, random)
    .slice(0, 5)
    .map((l) => letterDrill(letters.indexOf(l) % 2 ? 'sound' : 'letter', l, script, group, random, key('mix')));
  if (script.joins && group.writable) for (const l of shuffle(letters, random).slice(0, 2)) mixed.push(formDrill(l, script, group, random, key('form')));
  for (const w of shuffle(group.reading ?? [], random).slice(0, 3)) mixed.push(readDrill(w, script, random, key('read')));
  if (opts.canHear) {
    const heard = shuffle(
      letters.flatMap((l) => l.words),
      random,
    ).slice(0, 2);
    for (const w of heard) mixed.push(hearDrill(w, script, random, key('hear')));
  }
  out.push(...shuffle(mixed, random));
  if (group.writable && opts.writing !== false) {
    const drawn = shuffle(letters, random);
    for (const l of drawn.slice(0, 2)) out.push({ kind: 'trace', key: key('trace'), letter: l });
    // Write from memory two letters not just traced, when the group has them.
    for (const l of drawn.length >= 4 ? drawn.slice(2, 4) : drawn.slice(-2)) out.push({ kind: 'write', key: key('write'), letter: l });
  }
  return out;
}

export function pairsDrill(letters: Letter[], random: () => number, key: string): ScriptDrill {
  const unique = [...new Map(letters.map((l) => [l.latin, l])).values()];
  return {
    kind: 'pairs',
    key,
    pairs: shuffle(unique, random)
      .slice(0, 5)
      .map((l) => [l.latin, label(l)]),
  };
}

/**
 * Practice over letters already met (a learned group, or the letters due): both directions, pairs,
 * reading and writing from memory, about a dozen exercises.
 */
export function planPractice(script: Script, letters: Letter[], opts: LessonOptions & { size?: number }): ScriptDrill[] {
  const { random } = opts;
  const size = opts.size ?? 12;
  let n = 0;
  const key = (k: string) => `${k}-${n++}`;
  const groupOf = (l: Letter) => script.groups.find((g) => g.letters.includes(l)) ?? null;
  const picked = shuffle(letters, random).slice(0, size);
  const out: ScriptDrill[] = picked.map((l, i) => letterDrill(i % 2 ? 'letter' : 'sound', l, script, groupOf(l), random, key('p')));
  if (picked.length >= 3) out.push(pairsDrill(picked, random, key('pairs')));
  const ids = new Set(letters.map((l) => l.id));
  const groups = script.groups.filter((g) => g.letters.some((l) => ids.has(l.id)));
  for (const w of shuffle(
    groups.flatMap((g) => g.reading ?? []),
    random,
  ).slice(0, 3))
    out.push(readDrill(w, script, random, key('read')));
  if (script.joins) for (const l of picked.filter((l) => groupOf(l)?.writable).slice(0, 2)) out.push(formDrill(l, script, groupOf(l), random, key('form')));
  const mixed = shuffle(out, random);
  if (opts.writing !== false) for (const l of picked.filter((l) => groupOf(l)?.writable).slice(0, 2)) mixed.push({ kind: 'write', key: key('write'), letter: l });
  return mixed;
}

/** A missed exercise, asked again at the end with its options reshuffled. */
export function retryScriptDrill(d: ScriptDrill, random: () => number, n: number): ScriptDrill {
  const key = `${d.key}-r${n}`;
  if ('options' in d) {
    const right = d.options[d.answer];
    const options = shuffle(d.options, random);
    return { ...d, key, options, answer: options.indexOf(right) };
  }
  return { ...d, key };
}
