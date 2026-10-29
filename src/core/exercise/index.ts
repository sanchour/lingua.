// core/exercise: Lingua 6's one exercise engine (6-4). An exercise is plain data (contracts/exercise.ts), made by a
// builder, drawn by shared screens (features/exercise) and judged here, so a new kind works in every room at once.
export { gridOfFormTable, gridOfGrammarTable, usableForm } from './grid';
export type { FormGrid } from './grid';
export { judge, solutionOf } from './judge';
export type { Given, Judgement } from './judge';
export { pairsOfGrid, planTransforms, transformSpec } from './transform';
export type { FormPair, TransformSpec } from './transform';
export { attachRetries, completeDialogue, correctMistake, dragSentence, matchAffixes, matchAntonyms, matchDefinitions, matchPartsOfSpeech, matchPictures, matchSentences, matchSounds, matchSynonyms, pairsAcrossGrids, predictForms, rewriteFix, sentenceTask, tenseTransforms, useInSentence } from './kinds';
export { listenGap, listenOrder, listenType } from './kinds';
export type { HeardLine, WordFacts } from './kinds';
export { TRANSLATION_PAIRS, buildTranslationExercise, getTranslationTasks, validateRequirements } from './translate';
export type { DialogueExchange, TranslateBody, TranslationCategory, TranslationTask } from './translate';
export { ALIGNMENT_PAIRS, analyzeBackTranslation, checkReconstruction, getAlignmentPairs, scrambleWords } from './translateViews';
export type { AlignmentPair, TokenLink } from './translateViews';
export { readingSpec, selfReadingSpecs, readReadingQuestions } from './reading';
