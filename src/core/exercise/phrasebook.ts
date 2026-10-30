import type { ExerciseSpec, TaskBody } from '@/core/contracts/exercise';
import { templateSlots } from '@/core/notebook/library';
import type { SavedPhrase } from '@/core/notebook/library';
export function phrasebookSpecs(phrases: SavedPhrase[]): ExerciseSpec<'translate', TaskBody>[] {
  return phrases.filter((p) => !p.deletedAt && p.translation.trim() && !templateSlots(p.text).length).slice(0, 30).map((p) => ({
    key: `phrasebook:${p.id}`, kind: 'translate', lang: p.lang, instruction: 'Recall the phrase in the language you are learning.',
    body: { task: 'fix', given: [], prompt: p.translation, translation: p.translation },
    check: { rule: 'accepted', accepted: [p.text, p.formal, p.informal].filter((s) => s.trim() && !templateSlots(s).length) },
    trains: { skill: 'translating', item: { type: 'pattern', patternId: `phrasebook:${p.id}` } },
  }));
}
