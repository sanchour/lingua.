// Lingua 6 contract: the API of `core/exercise` (6-4). An exercise kind is plain data (a prompt, how an answer is
// checked, hints, feedback, what it trains) drawn by shared components, so a new kind works in every room at once.
// Types only: nothing in the app imports this yet. Today's kinds (`ExerciseKind` in core/srs/ludus.ts) move into
// the engine without changing what learners see; they keep their ids, so saved Ludus setups still read.
import type { Lang } from '@/data/types';
import type { AnswerCheck } from '@/core/srs/answer';
import type { EvidenceItem, Outcome, Skill } from './learner';

/** The kinds that exist today (core/srs/ludus.ts), unchanged. */
export type ExistingExerciseKind = 'choose-meaning' | 'choose-term' | 'match' | 'cloze' | 'build' | 'type' | 'translate' | 'article' | 'speak' | 'listen' | 'dictation' | 'spell' | 'truefalse';

/** The kinds 6-4 adds. */
export type NewExerciseKind =
  | 'drag-drop'
  | 'match-definition'
  | 'match-picture'
  | 'match-sentence'
  | 'match-sound'
  | 'match-synonym'
  | 'match-antonym'
  | 'match-affix'
  | 'match-pos'
  | 'correct-mistake'
  | 'rewrite'
  | 'transform'
  | 'combine'
  | 'expand'
  | 'simplify'
  | 'predict-form'
  | 'complete-dialogue';

export type ExerciseKind = ExistingExerciseKind | NewExerciseKind;

/** How a typed or built answer is judged. The first four are offline and free; 'ai' is Max's, and 'self' is what
 *  every free answer falls back to without Max: the model answer and a self-rating ("Was yours as good?"). */
export type AnswerRule =
  /** Case, punctuation, stress marks and a leading article never count (core/srs/answer.ts `normalizeAnswer`). */
  | { rule: 'exact'; expected: string }
  /** As 'exact', and a missing accent is "close", where the language has accents (`foldAccents`). */
  | { rule: 'accent-blind'; expected: string }
  /** Any of these is right; the first is shown as the model answer. */
  | { rule: 'accepted'; accepted: string[] }
  /** One option of several, by index (multiple choice, true or false). */
  | { rule: 'choice'; answer: number }
  /** Tiles in order (build, translate, dictation, spell). */
  | { rule: 'order'; answer: string[] }
  /** Judged by meaning with Max and labelled as such. */
  | { rule: 'ai'; modelAnswer: string; criteria?: string }
  /** The learner rates their own: the model answer is shown. */
  | { rule: 'self'; modelAnswer: string };

/** One hint, revealed by a tap. Hints grow step by step; a used hint makes the answer "assisted" (6-5). */
export interface Hint {
  text: string;
  /** What it gives away, so the engine can order them: 0 a nudge, 2 nearly the answer. */
  strength: 0 | 1 | 2;
}

/** An exercise: data, no rendering. Every kind-specific field lives in `body`, typed by the kind. */
export interface ExerciseSpec<K extends ExerciseKind = ExerciseKind, B = unknown> {
  /** Unique within a session. */
  key: string;
  kind: K;
  lang: Lang;
  /** The line above the exercise ("Fill in the gap"). */
  instruction: string;
  body: B;
  check: AnswerRule;
  hints?: Hint[];
  /** What the answer says about the learner, written to `evidence` (6-5). */
  trains: { skill: Skill; item: EvidenceItem };
  /** Shown after answering: why it is right, and for a near miss which part was wrong ("right word, wrong ending"). */
  feedback?: { why?: string; nearMiss?: string };
  /** Another example of the same thing, used by "retry with a different example". */
  retry?: ExerciseSpec<K, B>;
}

/** What a session does with answers. Rooms choose; the engine obeys. */
export interface SessionOptions {
  /** Hints available by a tap. Default true. */
  hints: boolean;
  /** Ask "how sure are you?" after each answer. Default false. */
  confidence: boolean;
  /** Show every verdict at the end instead of after each answer (exam-like). Default false. */
  delayedFeedback: boolean;
  /** Offer "try another example" after a wrong answer. Default true. */
  retryWithNewExample: boolean;
}

/** The result of one answer, handed back to the room and recorded as evidence. */
export interface ExerciseResult {
  key: string;
  kind: ExerciseKind;
  /** The offline check's verdict; 'ungraded' for 'self' and for 'ai' without Max, until the learner rates it. */
  verdict: AnswerCheck['verdict'] | 'ungraded';
  /** Set when the learner rated their own answer. */
  selfRating?: 'good' | 'partly' | 'not';
  /** 'accent' or 'typo' for a close answer (core/srs/answer.ts). */
  note?: AnswerCheck['note'];
  outcome: Outcome;
  /** Hints used, 0 when none: more than 0 makes the answer assisted. */
  hintsUsed: number;
  /** "I guessed" or a low confidence rating. */
  confidence?: 1 | 2 | 3;
  guessed?: boolean;
  /** What the learner gave: a string, tiles, or an option index. */
  given: string | string[] | number;
  durationMs: number;
  /** True when the AI judged it (Max), so the screen can label it. */
  judgedByAi?: boolean;
}

/** What every shared exercise screen takes, whichever room it sits in. A kind's screen is picked by `spec.kind`. */
export interface ExerciseScreenProps<S extends ExerciseSpec = ExerciseSpec> {
  spec: S;
  options: SessionOptions;
  /** Called once per exercise, with the result. The room decides what to do next (a card's grade, a lesson's step). */
  onResult: (result: ExerciseResult) => void;
  /** Reads the sentence or word aloud, where the device can (core/audio). */
  speak?: (text: string, lang: Lang) => void;
}

/** A room asks the engine for a sequence, not for one exercise: items in, specs out. Pure and deterministic for a
 *  given random source, as `core/srs/ludus.ts` is today, so sessions can be tested. */
export interface ExerciseBuilder<I = unknown> {
  /** The kinds this builder can make from an item. */
  kinds: ExerciseKind[];
  build: (items: I[], kinds: ExerciseKind[], random: () => number) => ExerciseSpec[];
}
