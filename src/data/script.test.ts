import { afterEach, describe, expect, it } from 'vitest';
import ru from '@/core/script/alphabets/ru';
import { createDb } from './db';
import type { LinguaDB } from './db';
import { grammarItems, grammarProgress } from './grammar';
import { answerLetter, dueLetters, finishLettersLesson, nextGroup, scriptItems, scriptProgress } from './script';

const open: LinguaDB[] = [];
function freshDb(): LinguaDB {
  const db = createDb(`script-${Math.random().toString(36).slice(2)}`);
  open.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(open.splice(0).map((db) => db.delete()));
});

describe('alphabet progress', () => {
  it('schedules letters as items of their own, out of grammar’s way', async () => {
    const db = freshDb();
    const now = Date.UTC(2026, 9, 20, 10);
    await answerLetter('ru', 'а', 3, 2000, false, db);
    expect((await scriptItems('ru', db)).map((r) => r.key)).toEqual(['а']);
    expect(await grammarItems('ru', db)).toEqual([]);
    const log = (await db.reviewLogs.toArray())[0];
    expect(log).toMatchObject({ deckId: 'grammar:ru', mode: 'grammar', cardId: 'ru:script:а' });
    // Due once its interval has passed.
    const [row] = await scriptItems('ru', db);
    expect(dueLetters(ru, [row], now)).toEqual([]);
    expect(dueLetters(ru, [row], row.due + 1).map((l) => l.id)).toEqual(['а']);
  });

  it('marks a group learned at 80 %, keeps it learned, and moves on to the next', async () => {
    const db = freshDb();
    expect(await finishLettersLesson('ru', 'friends', 0.6, db)).toEqual({ passed: false });
    expect(nextGroup(ru, await scriptProgress('ru', db))?.id).toBe('friends');
    expect(await finishLettersLesson('ru', 'friends', 0.9, db)).toEqual({ passed: true });
    expect(await finishLettersLesson('ru', 'friends', 0.2, db)).toEqual({ passed: false });
    const progress = await scriptProgress('ru', db);
    expect(progress.get('friends')).toMatchObject({ step: 6, lessons: 3 });
    expect(nextGroup(ru, progress)?.id).toBe('false');
    expect((await grammarProgress('ru', db)).size).toBe(0);
  });
});
