import { expect, it } from 'vitest';
import { phrasebookSpecs } from './phrasebook';
import { newPhrase } from '@/data/notebook';
import { judge } from './judge';
it('recalls saved phrases with learner-authored alternatives and excludes unfilled templates', () => {
  const p = { ...newPhrase('es', 'Quisiera un café.', 'I would like a coffee.'), formal: 'Me gustaría un café.' };
  const specs = phrasebookSpecs([p, newPhrase('es', '{thing}', 'Thing'), newPhrase('es', 'Hola')]);
  expect(specs).toHaveLength(1); expect(specs[0].trains.item).toEqual({ type: 'pattern', patternId: 'phrasebook:' + p.id });
  expect(judge(specs[0].check, 'Me gustaría un café.', 'es').outcome).toBe('right');
});
