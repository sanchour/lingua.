// Alphabets (Lingua 3.0-8, part 5): the letters of a language with a script of its own, in small
// groups taught in order, each letter with its sound and real words from the language's pack.

export interface ScriptWord {
  /** As written (Arabic fully vowelled; Mandarin in characters). */
  w: string;
  /** Its romanization (pinyin for Mandarin), from `romanize.ts` or the pack. */
  latin: string;
  en: string;
}

/** A language's mined words (`words/<lang>.ts`, made by scripts/script/words.ts). */
export interface ScriptWords {
  byLetter: Record<string, ScriptWord[]>;
  byGroup: Record<string, ScriptWord[]>;
}

export interface Letter {
  /** Stable within the language: the FSRS item's key. */
  id: string;
  /** The letter as shown big: the capital for Cyrillic and Greek, the isolated form for Arabic. */
  glyph: string;
  /** The small letter, for scripts with case. */
  lower?: string;
  /** Its name in the language (бэ, βήτα, bāʾ, 기역…), when it has one apart from its sound. */
  name?: string;
  /** Short, for choices: b, kh, ā, shi, eo, "rising"… */
  latin: string;
  /** How it sounds, in a line, for English speakers. */
  sound: string;
  /** Real words with this letter, from the language's pack (filled from `words/<lang>.ts`). */
  words: ScriptWord[];
  /** Mandarin's first characters and the like: shown in a serif, written as a whole. */
  character?: boolean;
}

export interface ScriptGroup {
  id: string;
  title: string;
  /** A line under the title: what the group has in common. */
  note?: string;
  /** The sub-alphabet, where a language has two (Hiragana, Katakana). */
  set?: string;
  letters: Letter[];
  /** Words to read once this group is learned: made only of its letters and earlier ones. */
  reading?: ScriptWord[];
  /** Letters that are drawn: false for groups like Greek letter pairs or Mandarin's tones. */
  writable?: boolean;
}

export interface Script {
  lang: string;
  /** Cyrillic, Greek, Arabic, Kana, Hangul, Pinyin. */
  name: string;
  summary: string;
  /** Right to left (Arabic). */
  rtl?: boolean;
  /** A letter changes shape with its place in a word (Arabic). */
  joins?: boolean;
  groups: ScriptGroup[];
  sources: Array<{ name: string; url?: string }>;
  /** What was left out, and why. */
  notes?: string[];
}

export const lettersOf = (script: Script): Letter[] => script.groups.flatMap((g) => g.letters);

/** Arabic letters that never join the letter after them: their start and middle shapes are their end shapes. */
const NON_JOINING = new Set(['ا', 'د', 'ذ', 'ر', 'ز', 'و', 'ء', 'ة', 'ى', 'آ', 'أ', 'إ', 'ؤ']);
const ZWJ = '‍';

export type Position = 'isolated' | 'initial' | 'medial' | 'final';
export const POSITIONS: Position[] = ['isolated', 'initial', 'medial', 'final'];
export const POSITION_LABEL: Record<Position, string> = {
  isolated: 'on its own',
  initial: 'at the start of a word',
  medial: 'in the middle',
  final: 'at the end',
};

/**
 * An Arabic letter as it is drawn in a place in a word. The font joins it, using zero-width
 * joiners on either side, so no table of presentation forms is needed.
 */
export function joinedForm(letter: string, position: Position): string {
  const joinsAfter = !NON_JOINING.has(letter);
  if (position === 'isolated') return letter;
  if (position === 'initial') return joinsAfter ? letter + ZWJ : letter;
  if (position === 'medial') return joinsAfter ? ZWJ + letter + ZWJ : ZWJ + letter;
  return ZWJ + letter;
}

/** Whether a letter changes its shape at the start and in the middle of a word. */
export const joinsAfter = (letter: string) => !NON_JOINING.has(letter);
