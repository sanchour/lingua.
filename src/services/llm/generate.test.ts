import { afterEach, describe, expect, it } from 'vitest';
import { createDb } from '@/data/db';
import type { LinguaDB } from '@/data/db';
import { reportGenerated } from '@/data/generated';
import { LlmError } from './client';
import { generateMaterial, MAX_ATTEMPTS } from './generate';
import type { GenerateDeps, GenerateRequest, Lookup } from './generate';
import { labelFor } from '@/core/generate/generate';

const open: LinguaDB[] = [];
function freshDb(): LinguaDB {
  const db = createDb(`generate-${Math.random().toString(36).slice(2)}`);
  open.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(open.splice(0).map((db) => db.delete()));
});

const REQ: GenerateRequest = { lang: 'fr', kind: 'story', level: 'A2', topic: 'le marché' };

const EASY = { title: 'Au marché', text: 'Marie va au marché. Elle achète du pain et du lait.\n\nElle rentre à la maison.', translation: 'Marie goes to the market. She buys bread and milk.\n\nShe goes home.' };
const HARD = { title: 'Au marché', text: 'Marie arpente le marché. Elle acquiert des victuailles somptueuses et des denrées.\n\nElle regagne sa demeure.', translation: 'Marie strolls the market. She acquires sumptuous provisions and food.\n\nShe returns to her dwelling.' };

/** A pack in which the common words are A1 and the grand ones are far beyond A2, and "marie" is a name nobody lists. */
const COMMON = ['au', 'marché', 'va', 'elle', 'achète', 'du', 'pain', 'et', 'lait', 'rentre', 'à', 'la', 'maison', 'le', 'des'];
const GRAND = ['arpente', 'acquiert', 'victuailles', 'somptueuses', 'denrées', 'regagne', 'sa', 'demeure'];
const pack = (): Lookup => ({
  known: new Set([...COMMON, ...GRAND]),
  ranks: new Map([...COMMON.map((w, i) => [w, 50 + i] as [string, number]), ...GRAND.map((w, i) => [w, 7000 + i] as [string, number])]),
});

function deps(db: LinguaDB, answers: unknown[], lookup: Lookup | null = pack()) {
  const prompts: Array<{ system: string; user: string }> = [];
  const d: GenerateDeps = {
    ask: async (system, user) => {
      prompts.push({ system, user });
      return answers[Math.min(prompts.length - 1, answers.length - 1)];
    },
    lookup: async (_lang, norms) => (lookup ? { known: new Set(norms.filter((n) => lookup.known.has(n))), ranks: new Map(norms.flatMap((n) => (lookup.ranks.has(n) ? [[n, lookup.ranks.get(n)!] as [string, number]] : []))) } : { known: new Set(), ranks: new Map() }),
    database: db,
    model: 'test-model',
    now: () => 1_000,
  };
  return { d, prompts };
}

describe('making a story, checked', () => {
  it('a French A2 story passes its checks, is labelled, and the second time comes from the cache', async () => {
    const db = freshDb();
    const { d, prompts } = deps(db, [EASY]);
    const first = await generateMaterial(REQ, d);
    expect(first.cached).toBe(false);
    expect(first.row).toMatchObject({ lang: 'fr', kind: 'story', level: 'A2', checks: ['schema', 'dictionary', 'level'], model: 'test-model', content: EASY });
    // The name nobody lists is flagged, not hidden.
    expect(first.row.unknownWords).toEqual(['marie']);
    expect(labelFor(first.row).detail).toContain('checked at A2');
    expect(prompts).toHaveLength(1);
    expect(prompts[0].system).toContain('CEFR level A2');
    expect(prompts[0].system).toContain('French');

    const second = await generateMaterial(REQ, d);
    expect(second.cached).toBe(true);
    expect(second.row.id).toBe(first.row.id);
    expect(prompts).toHaveLength(1);
    expect(await db.generated.count()).toBe(1);
  });

  it('makes a text again when it goes beyond the level, naming the hard words, and keeps the one that fits', async () => {
    const db = freshDb();
    const { d, prompts } = deps(db, [HARD, EASY]);
    const { row } = await generateMaterial(REQ, d);
    expect(prompts).toHaveLength(2);
    expect(prompts[1].system).toContain('too difficult');
    expect(prompts[1].system).toMatch(/victuailles|somptueuses|arpente/);
    expect(row.content).toEqual(EASY);
    expect(row.checks).toContain('level');
  });

  it('after three tries keeps the best, and says the level is not confirmed instead of claiming it', async () => {
    const db = freshDb();
    const { d, prompts } = deps(db, [HARD]);
    const { row } = await generateMaterial(REQ, d);
    expect(prompts).toHaveLength(MAX_ATTEMPTS);
    expect(row.checks).toEqual(['schema', 'dictionary']);
    expect(labelFor(row).detail).toContain('level not confirmed');
  });

  it('throws away an answer without its shape and asks again; with no usable answer it says so', async () => {
    const db = freshDb();
    const bad = await deps(db, [{ title: 'x' }, EASY]);
    expect((await generateMaterial(REQ, bad.d)).row.content).toEqual(EASY);
    expect(bad.prompts).toHaveLength(2);

    const none = deps(db, [{ nonsense: true }], pack());
    await expect(generateMaterial({ ...REQ, topic: 'autre' }, none.d)).rejects.toBeInstanceOf(LlmError);
    expect(none.prompts).toHaveLength(MAX_ATTEMPTS);
    expect(await db.generated.count()).toBe(1);
  });

  it('claims only the shape when the language pack is not on the device', async () => {
    const db = freshDb();
    const { d, prompts } = deps(db, [HARD], null);
    const { row } = await generateMaterial(REQ, d);
    expect(prompts).toHaveLength(1);
    expect(row.checks).toEqual(['schema']);
    expect(row.unknownWords).toBeUndefined();
    expect(labelFor(row).detail).toContain('words not checked');
  });

  it('what the learner reported is not offered again: the same request is made anew', async () => {
    const db = freshDb();
    const { d, prompts } = deps(db, [EASY]);
    const first = await generateMaterial(REQ, d);
    await reportGenerated(first.row.id, db);
    const again = await generateMaterial(REQ, d);
    expect(again.cached).toBe(false);
    expect(again.row.id).not.toBe(first.row.id);
    expect(prompts).toHaveLength(2);
    expect((await db.generated.get(first.row.id))?.reported).toBe(true);
  });

  it('makes example sentences the same way, in a cache of their own', async () => {
    const db = freshDb();
    const sentences = { sentences: [{ text: 'Elle achète du pain.', translation: 'She buys bread.' }, { text: 'Il va au marché.', translation: 'He goes to the market.' }, { text: 'Le lait est bon.', translation: 'The milk is good.' }] };
    const { d } = deps(db, [sentences]);
    const a = await generateMaterial({ ...REQ, kind: 'sentences' }, d);
    expect(a.row.kind).toBe('sentences');
    expect(a.row.checks).toContain('level');
    expect((await generateMaterial(REQ, deps(db, [EASY]).d)).cached).toBe(false);
  });
});

describe('dialogues and rewrites, checked and kept', () => {
  const dialogue = { title: 'Au marché', lines: [{ speaker: 'Marie', text: 'Je vais au marché.', translation: 'I go to the market.' }, { speaker: 'Luc', text: 'Tu achètes du pain ?', translation: 'Do you buy bread?' }, { speaker: 'Marie', text: 'Oui, et du lait.', translation: 'Yes, and milk.' }, { speaker: 'Luc', text: 'Elle rentre à la maison.', translation: 'She goes home.' }] };

  it('makes a dialogue that passes its checks, and gives it back from the cache', async () => {
    const db = freshDb();
    const { d, prompts } = deps(db, [dialogue]);
    const first = await generateMaterial({ ...REQ, kind: 'dialogue' }, d);
    expect(first.row).toMatchObject({ kind: 'dialogue', content: dialogue });
    expect(first.row.checks).toContain('schema');
    expect(prompts[0].system).toContain('dialogues');
    expect((await generateMaterial({ ...REQ, kind: 'dialogue' }, d)).cached).toBe(true);
  });

  it('asks for the task it was given, keeps one cache for each, and refuses an answer for another task', async () => {
    const db = freshDb();
    const items = (n: number) => ({ items: Array.from({ length: n }, (_, i) => ({ given: [`Elle achète du pain ${i}.`], answer: `Le pain est acheté par elle ${i}.` })) });
    const { d, prompts } = deps(db, [items(3)]);
    const passive = await generateMaterial({ ...REQ, kind: 'rewrites', task: 'passive' }, d);
    expect(prompts[0].system).toContain('passive');
    expect(passive.row.content).toMatchObject({ task: 'passive' });
    const other = await generateMaterial({ ...REQ, kind: 'rewrites', task: 'question' }, d);
    expect(other.cached).toBe(false);
    expect(prompts[1].system).toContain('question');
    // "combine" needs two sentences to start from: this answer has one, so there is nothing usable.
    await expect(generateMaterial({ ...REQ, kind: 'rewrites', task: 'combine' }, deps(db, [items(3)]).d)).rejects.toBeInstanceOf(LlmError);
  });
});
