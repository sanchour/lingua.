// Lines to practise listening on (6-9): sentences of the transcripts of what the learner listened to, each with where it is heard.
import { db } from './db';
import { getTranscript } from './media';
import type { LinguaDB } from './db';
import type { HeardLine } from '@/core/exercise';

const MIN_WORDS = 4;
const MAX_WORDS = 12;
const PER_ITEM = 8;

/** Up to `limit` lines (4 to 12 words) of the transcripts of a language's audio and video, a few from each, the hard ones first. */
export async function heardLines(lang: string, limit = 40, database: LinguaDB = db): Promise<HeardLine[]> {
  const media = (await database.media.where('lang').equals(lang).toArray()).filter((m) => !m.deletedAt && (m.blobId || m.remoteUrl));
  const out: HeardLine[] = [];
  for (const m of media) {
    const transcript = await getTranscript(m.id, database);
    if (!transcript) continue;
    const hard = (m.bookmarks ?? []).filter((b) => b.hard).map((b) => b.at);
    // A line near a place marked hard to hear comes first.
    const isHard = (c: { startMs: number; endMs: number }) => hard.some((h) => h >= c.startMs - 2000 && h <= c.endMs + 2000);
    const usable = transcript.cues
      .map((c) => ({ text: c.text.replace(/\s+/g, ' ').trim(), startMs: c.startMs + transcript.offsetMs, endMs: c.endMs + transcript.offsetMs }))
      .filter((c) => {
        const n = c.text.split(' ').length;
        return n >= MIN_WORDS && n <= MAX_WORDS && c.text.length <= 140 && /\p{L}/u.test(c.text);
      })
      .sort((a, b) => Number(isHard(b)) - Number(isHard(a)));
    for (const c of usable.slice(0, PER_ITEM)) out.push({ ...c, mediaId: m.id });
  }
  return out.slice(0, limit);
}
