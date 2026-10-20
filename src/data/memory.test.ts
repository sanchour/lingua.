import { afterEach, describe, expect, it } from 'vitest';
import { createDb, TABLE_NAMES } from './db';
import type { LinguaDB } from './db';
import { recordSighting, sightingsOf, sourceOf, wordMemory } from './memory';
import { buildGapRound, cut, distractors, locate } from './sentences';
import { setWordState } from './words';

const open: LinguaDB[] = [];
function freshDb(): LinguaDB {
  const db = createDb(`memory-${Math.random().toString(36).slice(2)}`);
  open.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(open.splice(0).map((db) => db.delete()));
});

const text = async (db: LinguaDB, id: string, title: string, kind: 'book' | 'comic' = 'book') => {
  await db.texts.put({ id, lang: 'es', kind, title, createdAt: 1, updatedAt: 1 } as never);
};

describe('word memory', () => {
  it('has tables of its own at version 15', async () => {
    const db = freshDb();
    await db.open();
    expect(TABLE_NAMES).toEqual(expect.arrayContaining(['sightings', 'fullDict']));
    expect(db.verno).toBeGreaterThanOrEqual(15);
  });

  it('knows a text, a song, a programme or a conversation as where a word was met', async () => {
    const db = freshDb();
    await text(db, 't1', 'Marianela');
    await text(db, 'c1', 'Mortadelo', 'comic');
    expect(await sourceOf({ textId: 't1' }, db)).toEqual({ kind: 'book', id: 't1', title: 'Marianela' });
    expect(await sourceOf({ textId: 'c1' }, db)).toMatchObject({ kind: 'comic' });
    expect(await sourceOf({ where: { kind: 'chat', id: 'x', title: 'At a café' } }, db)).toEqual({ kind: 'chat', id: 'x', title: 'At a café' });
    expect(await sourceOf({}, db)).toBeNull();
  });

  it('keeps one row per word and place, counting meetings, and gathers forms under their lemma', async () => {
    const db = freshDb();
    await text(db, 't1', 'Marianela');
    await recordSighting('es', 'casas', { textId: 't1', lemma: 'casa', surface: 'casas', sentence: 'Las casas son blancas.' }, db);
    await recordSighting('es', 'casas', { textId: 't1', lemma: 'casa', surface: 'casas' }, db);
    await recordSighting('es', 'casa', { where: { kind: 'chat', id: 'c', title: 'At a café' }, sentence: 'Mi casa es tu casa.' }, db);
    const rows = await db.sightings.toArray();
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.kind === 'book')).toMatchObject({ count: 2, sentence: 'Las casas son blancas.' });
    // "casa" from the chat has no lemma of its own here, but is found by its form.
    expect((await sightingsOf('es', 'casa', 'casa', db)).map((s) => s.kind).sort()).toEqual(['book', 'chat']);
    // One word in the memory, met as two forms in two places.
    const memory = await wordMemory('es', db);
    expect(memory).toHaveLength(1);
    expect(memory[0].forms.sort()).toEqual(['casa', 'casas']);
    expect([...memory[0].kinds].sort()).toEqual(['book', 'chat']);
  });

  it('remembers where a word marked Learning was met', async () => {
    const db = freshDb();
    await text(db, 't1', 'Marianela');
    await setWordState('es', 'perro', 2, { textId: 't1', surface: 'perro', sentence: 'El perro duerme.' }, db);
    expect(await db.sightings.toArray()).toEqual([expect.objectContaining({ norm: 'perro', kind: 'book', title: 'Marianela', sentence: 'El perro duerme.' })]);
  });
});

describe('sentences with a gap', () => {
  it('cuts a sentence around one word, and not around a phrase or nothing', () => {
    expect(cut('El perro duerme.', 3, 8)).toEqual({ before: 'El ', answer: 'perro', after: ' duerme.' });
    expect(cut('El perro duerme.', 0, 8)).toBeNull();
    expect(cut('El perro duerme.', 5, 5)).toBeNull();
  });

  it('finds a word in a sentence whatever its case', () => {
    expect(locate('Casa grande, casa vacía.', 'casa', 'es')).toEqual([0, 4]);
    expect(locate('Nada aquí.', 'casa', 'es')).toBeNull();
  });

  it('offers three other words as choices, never the answer', () => {
    const pool = ['perro', 'gato', 'Perro', 'casa', 'sol', 'montaña'];
    const wrong = distractors('perro', pool, 'es', () => 0.5);
    expect(wrong).toHaveLength(3);
    expect(wrong.map((w) => w.toLowerCase())).not.toContain('perro');
  });

  it('plays a deck’s own cards first, from their example or the sentence they were met in', async () => {
    const db = freshDb();
    const note = (id: string, term: string, extra: object) => ({ id, deckId: 'd1', lang: 'es', term, meaning: term.toUpperCase(), createdAt: 1, updatedAt: 1, ...extra });
    await db.notes.bulkPut([
      note('n1', 'perro', { example: { text: 'Mi perro duerme.', translation: 'My dog sleeps.', cloze: [3, 8] } }),
      note('n2', 'gato', { context: { sentence: 'El Gato come pescado.' } }),
      note('n3', 'sol', {}),
      { ...note('n4', 'luna', { example: { text: 'La luna brilla.' } }), deckId: 'other' },
    ] as never);
    const round = await buildGapRound('es', 'A1', 'type', 5, 'd1', db);
    expect(round.map((r) => [r.answer, r.from, r.gloss])).toEqual(expect.arrayContaining([['perro', 'deck', 'PERRO'], ['Gato', 'deck', 'GATO']]));
    expect(round.find((r) => r.answer === 'perro')?.translation).toBe('My dog sleeps.');
    expect(round.some((r) => r.lemma === 'luna' || r.lemma === 'sol')).toBe(false);
  });
});
