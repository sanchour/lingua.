// Colloquium's chats: a conversation with the learner's own AI, kept so it can be read again or
// carried on. Backed up and synced like journal entries.
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { LinguaDB } from './db';
import type { Chat, ChatMessage } from './types';

const alive = (c: Chat | undefined): c is Chat => Boolean(c && !c.deletedAt);

/** A language's chats, the latest first. */
export function useChats(lang: string): Chat[] | undefined {
  return useLiveQuery(async () => (await db.chats.where('lang').equals(lang).toArray()).filter(alive).sort((a, b) => b.updatedAt - a.updatedAt), [lang]);
}

export function useChat(id: string | undefined): Chat | null | undefined {
  return useLiveQuery(async () => {
    const chat = id ? await db.chats.get(id) : undefined;
    return alive(chat) ? chat : null;
  }, [id]);
}

export async function createChat(lang: string, scene: string, title: string, prompt: string, database: LinguaDB = db): Promise<string> {
  const now = Date.now();
  const id = crypto.randomUUID();
  await database.chats.add({ id, lang, scene, title, prompt, messages: [], createdAt: now, updatedAt: now });
  return id;
}

/** Adds messages to the end of a chat. */
export async function appendMessages(id: string, messages: ChatMessage[], database: LinguaDB = db): Promise<void> {
  await database.transaction('rw', database.chats, async () => {
    const chat = await database.chats.get(id);
    if (!chat) return;
    await database.chats.update(id, { messages: [...chat.messages, ...messages], updatedAt: Date.now() });
  });
}

/** Changes the last message (the learner's line gets its corrections when the answer comes). */
export async function updateLastMessage(id: string, role: ChatMessage['role'], patch: Partial<ChatMessage>, database: LinguaDB = db): Promise<void> {
  await database.transaction('rw', database.chats, async () => {
    const chat = await database.chats.get(id);
    const at = chat ? chat.messages.findLastIndex((m) => m.role === role) : -1;
    if (!chat || at < 0) return;
    const messages = chat.messages.slice();
    messages[at] = { ...messages[at], ...patch };
    await database.chats.update(id, { messages, updatedAt: Date.now() });
  });
}

export async function deleteChat(id: string, database: LinguaDB = db): Promise<void> {
  await database.chats.update(id, { deletedAt: Date.now(), updatedAt: Date.now() });
}
