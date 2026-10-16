import { afterEach, describe, expect, it } from 'vitest';
import { recordSession } from './activity';
import { createDb } from './db';
import type { LinguaDB } from './db';
import { completeOnboarding } from './languages';
import { addText } from './library';
import { resetLanguageProgress } from './reset';
import { setWordState } from './words';

const open: LinguaDB[] = [];
function freshDb(): LinguaDB {
  const db = createDb(`reset-${Math.random().toString(36).slice(2)}`);
  open.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(open.splice(0).map((db) => db.delete()));
});

describe('resetLanguageProgress', () => {
  it('clears one language’s progress and keeps its books and other languages', async () => {
    const db = freshDb();
    await completeOnboarding({ target: 'es', native: 'en', level: 'A1', theme: 'paper', seedKnown: false }, db);
    await completeOnboarding({ target: 'de', native: 'en', level: 'A1', theme: 'paper', seedKnown: false }, db);
    await setWordState('es', 'perro', 2, { surface: 'perro', gloss: 'dog' }, db);
    await setWordState('de', 'hund', 2, { surface: 'Hund', gloss: 'dog' }, db);
    await recordSession({ lang: 'es', type: 'read', startedAt: Date.now() - 60_000, endedAt: Date.now(), activeMs: 60_000 }, db);
    const textId = await addText({ lang: 'es', title: 'Cuento', source: 'paste', kind: 'article', chapters: [{ blocks: [{ t: 'p', text: 'Hola perro.' }] }] }, db);

    const counts = await resetLanguageProgress('es', db);
    expect(counts).toMatchObject({ words: 1, cards: 1, sessions: 1 });
    expect(await db.words.where('lang').equals('es').count()).toBe(0);
    expect(await db.decks.where('lang').equals('es').count()).toBe(0);
    expect(await db.texts.get(textId)).toBeDefined();
    expect(await db.words.get('de:hund')).toBeDefined();
    expect(await db.decks.where('lang').equals('de').count()).toBe(1);
  });
});
