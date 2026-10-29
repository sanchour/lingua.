import { afterEach, describe, expect, it } from 'vitest';
import { DAY } from '@/core/srs/scheduler';
import { createDb } from './db';
import type { LinguaDB } from './db';
import { addNote, createDeck } from './decks';
import { answerGrammarItem } from './grammar';
import { forgetEvidence, learnerRecord, recordEvidence } from './learner';
import { answerCard, undoAnswer } from './study';
import { localDateKey } from '@/lib/format';

const open: LinguaDB[] = [];
function freshDb(): LinguaDB {
  const db = createDb(`learner-${Math.random().toString(36).slice(2)}`);
  open.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(open.splice(0).map((db) => db.delete()));
});

const NOW = new Date(2026, 9, 29, 12).getTime();
const base = { lang: 'es', skill: 'grammar', room: 'grammatica', item: { type: 'grammar', topicId: 'present' }, outcome: 'wrong', assisted: false } as const;

describe('the learner’s record', () => {
  it('keeps a row with its day and item key, and asks of it the same questions as everyone', async () => {
    const db = freshDb();
    const record = learnerRecord(db, () => NOW);
    for (let i = 0; i < 3; i++) await record.record({ ...base, at: NOW - i * DAY, contextId: 'lesson' });
    await record.record({ ...base, outcome: 'right', at: NOW });
    const rows = await db.evidence.toArray();
    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({ itemKey: 'grammar:present' });
    expect(rows.every((r) => /^\d{4}-\d\d-\d\d$/.test(r.day))).toBe(true);
    expect(await record.weakSpots('es')).toMatchObject([{ wrong: 3, days: 3, persistent: true }]);
    expect(await record.weakSpots('fr')).toEqual([]);
    expect((await record.history('es', base.item)).map((r) => r.at)).toEqual([NOW, NOW, NOW - DAY, NOW - 2 * DAY].sort((a, b) => b - a));
    expect((await record.quietSkills('es'))[0]).not.toBe('grammar');
  });

  it('works out each day once finished days are cached, today not', async () => {
    const db = freshDb();
    const record = learnerRecord(db, () => NOW);
    await record.record({ ...base, at: NOW - 2 * DAY });
    await record.record({ ...base, at: NOW - 2 * DAY + 1000, outcome: 'right' });
    await record.record({ ...base, at: NOW });
    const from = localDateKey(NOW - 3 * DAY);
    const to = localDateKey(NOW);
    const days = await record.days('es', from, to);
    expect(days.map((d) => d.day)).toEqual([localDateKey(NOW - 2 * DAY), localDateKey(NOW)]);
    expect(days[0].bySkill.grammar).toEqual({ right: 1, wrong: 1, assisted: 0 });
    expect(await db.evidenceDays.count()).toBe(1);
    // A new answer on a finished day drops that day's summary, and it is worked out again.
    await recordEvidence({ ...base, at: NOW - 2 * DAY + 2000 }, db);
    expect(await db.evidenceDays.count()).toBe(0);
    expect((await record.days('es', from, to))[0].bySkill.grammar).toEqual({ right: 1, wrong: 2, assisted: 0 });
  });

  it('forgets a language and no other', async () => {
    const db = freshDb();
    await recordEvidence({ ...base, at: NOW }, db);
    await recordEvidence({ ...base, lang: 'fr', at: NOW }, db);
    await learnerRecord(db, () => NOW).days('es', localDateKey(NOW - DAY), localDateKey(NOW));
    await forgetEvidence('es', db);
    expect((await db.evidence.toArray()).map((r) => r.lang)).toEqual(['fr']);
    expect(await db.evidenceDays.count()).toBe(0);
  });
});

describe('where the record is written', () => {
  it('a card answered is a vocabulary row; a hint or a guess makes it assisted; an undo takes it back', async () => {
    const db = freshDb();
    const deckId = await createDeck('es', { name: 'D' }, db);
    const noteId = await addNote(deckId, { term: 'Casa', meaning: 'house' }, db);
    const card = (await db.cards.where('noteId').equals(noteId).first())!;
    const opts = { lang: 'es', mode: 'classic' as const, durationMs: 1000, now: NOW };
    const first = await answerCard(card, 1, opts, db);
    const second = await answerCard((await db.cards.get(card.id))!, 3, { ...opts, now: NOW + 1000, guessed: true, mode: 'type' }, db);
    const rows = (await db.evidence.toArray()).sort((a, b) => a.at - b.at);
    expect(rows).toMatchObject([
      { skill: 'vocabulary', room: 'thesaurus', itemKey: 'word:es:casa', outcome: 'wrong', assisted: false, kind: 'classic', contextId: deckId },
      { skill: 'vocabulary', room: 'ludus', itemKey: 'word:es:casa', outcome: 'right', assisted: true, kind: 'type' },
    ]);
    await undoAnswer(second.undo, db);
    expect(await db.evidence.count()).toBe(1);
    await undoAnswer(first.undo, db);
    expect(await db.evidence.count()).toBe(0);
  });

  it('a grammar item answered is a grammar row on its topic, in the course for a course topic', async () => {
    const db = freshDb();
    await answerGrammarItem({ lang: 'es', topic: 'present', key: 'k1', grade: 1, durationMs: 1000, now: NOW }, db);
    await answerGrammarItem({ lang: 'es', topic: 'course:u1:words', key: 'k2', grade: 3, durationMs: 1000, now: NOW + 1000 }, db);
    const rows = (await db.evidence.toArray()).sort((a, b) => a.at - b.at);
    expect(rows).toMatchObject([
      { skill: 'grammar', room: 'grammatica', itemKey: 'grammar:present', outcome: 'wrong', category: 'grammar' },
      { skill: 'grammar', room: 'cursus', itemKey: 'grammar:course:u1:words', outcome: 'right' },
    ]);
    expect(rows[1].category).toBeUndefined();
  });
});
