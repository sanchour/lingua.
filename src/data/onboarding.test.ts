// The first start's last step (5.1-2b): the languages spoken go into Tabula, and the plan counts as chosen.
import { afterEach, describe, expect, it } from 'vitest';
import { createDb } from './db';
import type { LinguaDB } from './db';
import { completeOnboarding } from './languages';
import { planOf } from './plan';
import { getSettings, patchSetting } from './settings';

const open: LinguaDB[] = [];
function freshDb(): LinguaDB {
  const db = createDb(`onboarding-${Math.random().toString(36).slice(2)}`);
  open.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(open.splice(0).map((db) => db.delete()));
});

describe('finishing onboarding', () => {
  it('writes the languages spoken and the one learned into Tabula', async () => {
    const db = freshDb();
    await completeOnboarding(
      {
        target: 'es',
        native: 'nl',
        level: 'A2',
        seedKnown: true,
        theme: 'system',
        spoken: [
          { id: 'nl', name: 'Dutch', level: 'C2', native: true },
          { id: 'x-galician', name: 'Galician', level: 'B1', native: false },
        ],
      },
      db,
    );
    const rows = await db.capabilities.orderBy('order').toArray();
    expect(rows.map((r) => [r.id, r.status, r.level])).toEqual([
      ['nl', 'native', 'C2'],
      ['x-galician', 'background', 'B1'],
      ['es', 'learning', 'A2'],
    ]);
  });

  it('keeps Tabula rows that are already there, and adds none when adding another language', async () => {
    const db = freshDb();
    await completeOnboarding({ target: 'es', native: 'en', level: 'A1', seedKnown: false, theme: 'paper', spoken: [{ id: 'en', name: 'English', level: 'C2', native: true }] }, db);
    await completeOnboarding({ target: 'fr', native: 'en', level: 'B1', seedKnown: false, theme: 'paper' }, db);
    expect((await db.capabilities.toArray()).map((r) => r.id).sort()).toEqual(['en', 'es']);
  });

  it('marks the plan as chosen, so test mode doesn’t act as Max for a new install', async () => {
    const db = freshDb();
    await completeOnboarding({ target: 'de', native: 'en', level: 'A0', seedKnown: false, theme: 'system' }, db);
    const { meta } = await getSettings(db);
    expect(meta.plan).toEqual({});
    expect(planOf(meta)).toBe('free');
  });

  it('keeps the goal on the language and the name with the learner', async () => {
    const db = freshDb();
    await completeOnboarding({ target: 'it', native: 'en', level: 'A2', seedKnown: false, theme: 'system', goal: 'B2', learner: { reasons: ['travel'], enjoys: ['reading'], name: 'Sam' } }, db);
    expect((await db.languages.get('it'))?.goal).toBe('B2');
    expect((await getSettings(db)).learner.name).toBe('Sam');
  });

  it('keeps a plan bought in the plans step', async () => {
    const db = freshDb();
    await patchSetting('meta', { plan: { plus: { since: 1 } } }, db);
    await completeOnboarding({ target: 'de', native: 'en', level: 'A0', seedKnown: false, theme: 'system' }, db);
    expect(planOf((await getSettings(db)).meta)).toBe('plus');
  });
});
