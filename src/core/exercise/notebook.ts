import type { ExerciseSpec, TaskBody } from '@/core/contracts/exercise';
export function notebookSpecs(lang: string, noteId: string, answer: { exercises: Array<{ question: string; quote: string }> }): ExerciseSpec<'translate', TaskBody>[] {
  return answer.exercises.map((q, i) => ({ key: `notebook:${noteId}:${i}`, kind: 'translate', lang, instruction: 'Answer from your notes, then compare with the source quote.', body: { task: 'fix', given: [], prompt: q.question, translation: q.question }, check: { rule: 'self', modelAnswer: q.quote }, trains: { skill: 'reading', item: { type: 'pattern', patternId: `notebook:${noteId}` } } }));
}
