import { afterEach, describe, expect, it } from 'vitest';
import { createDb } from './db';
import type { LinguaDB } from './db';
import { completeOnboarding } from './languages';
import { addVideo, keepSubtitlesOnly, saveLine, saveTrack, shiftTrack } from './video';

const open: LinguaDB[] = [];
function freshDb(): LinguaDB {
  const db = createDb(`video-${Math.random().toString(36).slice(2)}`);
  open.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(open.splice(0).map((db) => db.delete()));
});

describe('Visio data', () => {
  it('saves a line once, as a card that remembers its clip', async () => {
    const db = freshDb();
    await completeOnboarding({ target: 'es', native: 'en', level: 'A1', theme: 'paper', seedKnown: false }, db);
    const id = await addVideo({ lang: 'es', title: 'Episodio 1', blob: new Blob(['x'], { type: 'video/mp4' }) }, db);
    const media = (await db.media.get(id))!;
    const cue = { startMs: 61_000, endMs: 63_500, text: '¿Dónde está la estación?' };
    expect(await saveLine(media, cue, 'Where is the station?', db)).toBe(true);
    expect(await saveLine(media, cue, 'Where is the station?', db)).toBe(false);
    const notes = await db.notes.toArray();
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ term: cue.text, meaning: 'Where is the station?', source: 'visio', tags: ['line'], context: { mediaId: id, startMs: 61_000, endMs: 63_500 } });
    const deck = await db.decks.get(notes[0].deckId);
    expect(deck?.kind).toBe('visio');
    expect(await db.cards.where('noteId').equals(notes[0].id).count()).toBe(1);
  });

  it('shifts tracks and can drop the video but keep its subtitles', async () => {
    const db = freshDb();
    const id = await addVideo({ lang: 'es', title: 'Película', blob: new Blob(['abc'], { type: 'video/mp4' }) }, db);
    await saveTrack(id, 'es', 'target', [{ startMs: 1000, endMs: 2000, text: 'Hola', words: [{ w: 'Hola', startMs: 1000, endMs: 1500 }] }], 'srt', db);
    await shiftTrack(id, 'target', -1500, db);
    const t = (await db.transcripts.get(`${id}:target`))!;
    expect(t.cues[0]).toMatchObject({ startMs: 0, endMs: 500 });
    expect(t.cues[0].words![0].startMs).toBe(0);
    expect(t.offsetMs).toBe(-1500);

    await keepSubtitlesOnly(id, db);
    const media = (await db.media.get(id))!;
    expect(media.blobId).toBeUndefined();
    expect(await db.blobs.count()).toBe(0);
    expect(await db.transcripts.get(`${id}:target`)).toBeTruthy();
  });
});
