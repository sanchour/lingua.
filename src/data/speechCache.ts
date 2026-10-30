import { db } from './db';
import type { SpeechRow } from './types';

/** The spoken audio kept on this device (Gemini, Piper and Commons): the newest this many, so the cache can't fill the disk. */
export const SPEECH_KEEP = 500;

export async function putSpeech(row: SpeechRow): Promise<void> {
  await db.speech.put(row);
  const extra = (await db.speech.count()) - SPEECH_KEEP;
  if (extra > 0) await db.speech.bulkDelete(await db.speech.orderBy('createdAt').limit(extra).primaryKeys());
}
