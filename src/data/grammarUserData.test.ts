import { describe, expect, it } from 'vitest';
import { createDb } from './db';
import { getGrammarBookmarks, getGrammarNote, saveGrammarNote, toggleGrammarBookmark } from './grammarUserData';

describe('grammarUserData', () => {
  it('toggles bookmarks in settings table', async () => {
    const testDb = createDb(`test-grammar-user-${Date.now()}`);
    expect(await getGrammarBookmarks('es', testDb)).toEqual(new Set());

    const added = await toggleGrammarBookmark('es', 'articles', testDb);
    expect(added).toBe(true);
    expect(await getGrammarBookmarks('es', testDb)).toEqual(new Set(['articles']));

    const removed = await toggleGrammarBookmark('es', 'articles', testDb);
    expect(removed).toBe(false);
    expect(await getGrammarBookmarks('es', testDb)).toEqual(new Set());
    await testDb.delete();
  });

  it('saves and reads personal notes', async () => {
    const testDb = createDb(`test-grammar-note-${Date.now()}`);
    expect(await getGrammarNote('es', 'ser-estar', testDb)).toBe('');

    await saveGrammarNote('es', 'ser-estar', 'Ser is permanent characteristics, estar is conditions.', testDb);
    expect(await getGrammarNote('es', 'ser-estar', testDb)).toBe('Ser is permanent characteristics, estar is conditions.');

    // Clear note
    await saveGrammarNote('es', 'ser-estar', '  ', testDb);
    expect(await getGrammarNote('es', 'ser-estar', testDb)).toBe('');
    await testDb.delete();
  });
});
