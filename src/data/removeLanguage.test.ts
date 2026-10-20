import { afterEach, describe, expect, it } from 'vitest';
import { createDb } from './db';
import type { LinguaDB } from './db';
import { completeOnboarding } from './languages';
import { removeLanguage } from './removeLanguage';
import type { Word } from './types';

const open: LinguaDB[] = [];
function freshDb(): LinguaDB {
  const db = createDb(`remove-lang-${Math.random().toString(36).slice(2)}`);
  open.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(open.splice(0).map((db) => db.delete()));
});

const word = (lang: string, norm: string): Word => ({ id: `${lang}:${norm}`, lang, norm, state: 2, stateChangedAt: 1, createdAt: 1, updatedAt: 1 });
const start = (db: LinguaDB, target: string) => completeOnboarding({ target, native: 'en', level: 'A1', theme: 'paper', seedKnown: false } as Parameters<typeof completeOnboarding>[0], db);

describe('removeLanguage', () => {
  it('removes the language and what was learnt in it, and keeps the others', async () => {
    const db = freshDb();
    await start(db, 'es');
    await start(db, 'ru');
    await db.words.bulkPut([word('ru', 'да'), word('ru', 'нет'), word('es', 'sí')]);

    await removeLanguage('ru', db);

    expect((await db.words.toArray()).map((w) => w.id)).toEqual(['es:sí']);
    expect((await db.languages.get('ru'))?.deletedAt).toBeGreaterThan(0);
    // It was being studied: Spanish is now.
    expect((await db.languages.get('es'))?.isActive).toBe(1);
  });

  it('keeps the last language', async () => {
    const db = freshDb();
    await start(db, 'es');
    await expect(removeLanguage('es', db)).rejects.toThrow(/add another/);
  });

  it('can be added again afterwards, afresh', async () => {
    const db = freshDb();
    await start(db, 'es');
    await start(db, 'ru');
    await removeLanguage('ru', db);
    await start(db, 'ru');
    expect((await db.languages.get('ru'))?.deletedAt).toBeUndefined();
  });
});
