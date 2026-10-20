import { afterEach, describe, expect, it } from 'vitest';
import { appendMessages, createChat, deleteChat, updateLastMessage } from './chats';
import { createDb, TABLE_NAMES } from './db';
import type { LinguaDB } from './db';

const open: LinguaDB[] = [];
function freshDb(): LinguaDB {
  const db = createDb(`chats-${Math.random().toString(36).slice(2)}`);
  open.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(open.splice(0).map((db) => db.delete()));
});

describe('chats', () => {
  it('is a table of its own, at a version after Grammatica’s', async () => {
    const db = freshDb();
    await db.open();
    expect(TABLE_NAMES).toContain('chats');
    expect(db.verno).toBeGreaterThanOrEqual(14);
  });

  it('starts empty with its scene and prompt', async () => {
    const db = freshDb();
    const id = await createChat('es', 'cafe', 'At a café', 'Hablemos.', db);
    expect(await db.chats.get(id)).toMatchObject({ lang: 'es', scene: 'cafe', title: 'At a café', prompt: 'Hablemos.', messages: [] });
  });

  it('adds messages in order and moves the chat to the front', async () => {
    const db = freshDb();
    const id = await createChat('es', 'cafe', 'At a café', 'Hablemos.', db);
    const before = (await db.chats.get(id))!.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    await appendMessages(id, [{ role: 'ai', text: 'Hola', at: 1 }], db);
    await appendMessages(id, [{ role: 'me', text: 'Hola, yo es Ana', at: 2 }], db);
    const chat = (await db.chats.get(id))!;
    expect(chat.messages.map((m) => m.text)).toEqual(['Hola', 'Hola, yo es Ana']);
    expect(chat.updatedAt).toBeGreaterThan(before);
  });

  it('gives the learner’s last line its corrections', async () => {
    const db = freshDb();
    const id = await createChat('es', 'cafe', 'At a café', 'Hablemos.', db);
    await appendMessages(
      id,
      [
        { role: 'me', text: 'uno', at: 1 },
        { role: 'ai', text: 'dos', at: 2 },
        { role: 'me', text: 'yo es', at: 3 },
      ],
      db,
    );
    await updateLastMessage(id, 'me', { corrections: [{ original: 'yo es', suggestion: 'yo soy', explanation: '' }] }, db);
    const [first, , last] = (await db.chats.get(id))!.messages;
    expect(first.corrections).toBeUndefined();
    expect(last.corrections?.[0].suggestion).toBe('yo soy');
  });

  it('does nothing for a chat that isn’t there, and removes with a mark that syncs', async () => {
    const db = freshDb();
    await appendMessages('missing', [{ role: 'me', text: 'x', at: 1 }], db);
    await updateLastMessage('missing', 'me', { text: 'y' }, db);
    expect(await db.chats.count()).toBe(0);
    const id = await createChat('es', 'cafe', 'At a café', 'Hablemos.', db);
    await deleteChat(id, db);
    expect((await db.chats.get(id))!.deletedAt).toBeGreaterThan(0);
  });
});
