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
  | 'complete-dialogue'
  /** 6-9: hear a real line and type it (dictation), or type the word missing from it. */
  | 'listen-type'
  | 'listen-gap'
  /** 6-9: hear a word and choose its meaning or its picture. */
  | 'listen-choose'
  /** 6-9: a line or a word written without its breaks (spaces, syllables): mark where they go. */
  | 'listen-split';

export type ExerciseKind = ExistingExerciseKind | NewExerciseKind;

/** How a typed or built answer is judged. The first four are offline and free; 'ai' is Max's, and 'self' is what
 *  every free answer falls back to without Max: the model answer and a self-rating ("Was yours as good?"). */
export type AnswerRule =
  /** Case, punctuation, stress marks and a leading article never count (core/srs/answer.ts `normalizeAnswer`). */
  | { rule: 'exact'; expected: string }
  /** As 'exact', and a missing accent is "close", where the language has accents (`foldAccents`). `rejects` are other
   *  real forms that differ from the answer only by an accent or a letter (habló / hablo): never close, always wrong. */
  | { rule: 'accent-blind'; expected: string; rejects?: string[] }
  /** Any of these is right; the first is shown as the model answer. */
  | { rule: 'accepted'; accepted: string[] }
  /** A line heard and written down. Every word counts, an article too; case and accents are only close, and with `punctuation` so is a missing comma or full stop. */
  | { rule: 'dictation'; expected: string; punctuation?: boolean }
  /** One option of several, by index (multiple choice, true or false). */
  | { rule: 'choice'; answer: number }
  /** Tiles in order (build, translate, dictation, spell). */
  | { rule: 'order'; answer: string[] }
  /** Judged by meaning with Max and labelled as such. */
  | { rule: 'ai'; modelAnswer: string; criteria?: string }
  /** The learner rates their own: the model answer is shown. */
  | { rule: 'self'; modelAnswer: string };

/** The body of a 'transform' exercise (6-4): one form of a word to be changed into another form of the same word. */
export interface TransformBody {
  /** The table it comes from ("Present indicative"). */
  title: string;
  /** The word's dictionary form, when known. */
  lemma?: string;
  from: { form: string; label: string };
  to: { label: string };
}

/** The body of the matching kinds (6-4b): tap one side, then what goes with it. */
export interface MatchBody {
  /** What the pairs are: the kind of the spec says the same ('match-definition' ...). */
  what: 'definition' | 'synonym' | 'antonym' | 'sentence' | 'affix' | 'pos' | 'sound' | 'picture';
  /** `left` is in the language; `right` is what it goes with (a meaning, a word, a label). `say` is spoken for 'sound'; `image` is a picture's address. */
  pairs: Array<{ left: string; right: string; say?: string; image?: string }>;
}

/** 'correct-mistake': a sentence with one wrong form in it; the learner types the right form. */
export interface CorrectBody {
  /** The sentence as shown, with the mistake in it. */
  shown: string;
  /** The wrong form, marked in the sentence. */
  wrong: string;
  translation?: string;
}

/** The sentence tasks (6-4b): 'rewrite' (also active to passive, direct to reported, statement to question), 'combine', 'expand', 'simplify'. */
export interface TaskBody {
  task: 'fix' | 'passive' | 'reported' | 'question' | 'combine' | 'expand' | 'simplify';
  /** What is given: one sentence, or two to combine. */
  given: string[];
  /** Said once more above the box ("Say it in the passive"). */
  prompt: string;
  translation?: string;
}

/** 'predict-form': the forms so far, in order; the learner types the next one. */
export interface PredictBody {
  title: string;
  lemma?: string;
  given: Array<{ label: string; form: string }>;
  ask: { label: string };
}

/** 'complete-dialogue': a short exchange with one line missing; the learner types it. */
export interface DialogueBody {
  title?: string;
  lines: Array<{ speaker: string; text: string; missing?: boolean }>;
}

/** 'listen-choose': what to choose from (a meaning or a picture each), after hearing the word. */
export interface ChooseBody {
  prompt: string;
  options: Array<{ text?: string; image?: string }>;
}

/** 'drag-drop': tiles dragged into order (the same answer as a built sentence, made with the pointer). */
export interface DragBody {
  /** Shown above the tiles: what to build (a translation, or the instruction). */
  prompt: string;
  tiles: string[];
}

/** One hint, revealed by a tap. Hints grow step by step; a used hint makes the answer "assisted" (6-5). */
export interface Hint {
  text: string;
  /** What it gives away, so the engine can order them: 0 a nudge, 2 nearly the answer. */
  strength: 0 | 1 | 2;
}

/** What to play for an exercise that is heard (6-9): a stretch of the learner's own audio or video, or the line spoken by the device's voice. */
export interface ListenSource {
  /** The line, for the voice (and for the clip's fallback when the file is gone). */
  text: string;
  clip?: { mediaId: string; startMs: number; endMs: number };
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
  /** Heard before it is answered (6-9). */
  listen?: ListenSource;
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
