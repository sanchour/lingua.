import { afterEach, describe, expect, it } from 'vitest';
import { createDb } from './db';
import type { LinguaDB } from './db';
import { saveSpeakers, saveTranscript, shiftTranscript, getTranscript } from './media';

const open: LinguaDB[] = [];
afterEach(async () => {
  await Promise.all(open.splice(0).map((d) => d.delete()));
});

const cues = ['Hola.', '¿Cómo estás?', 'Bien.'].map((text, i) => ({ startMs: i * 1000, endMs: i * 1000 + 900, text }));
const labelled = cues.map((c, i) => ({ ...c, speaker: i === 1 ? 'B' : 'A' }));

async function withTranscript() {
  const db = createDb(`speakers-${Math.random()}`);
  open.push(db);
  await saveTranscript('m1', 'es', cues, 'srt', undefined, db);
  return db;
}

describe('saveSpeakers', () => {
  it('labels the transcript as it is now, so a transcript moved meanwhile keeps its timing', async () => {
    const db = await withTranscript();
    await shiftTranscript('m1', 500, db);
    const saved = await saveSpeakers('m1', labelled, db);
    expect(saved?.map((c) => c.speaker)).toEqual(['A', 'B', 'A']);
    expect((await getTranscript('m1', db))?.cues[0].startMs).toBe(500);
  });

  it('leaves a transcript that was made again alone, and says so', async () => {
    const db = await withTranscript();
    await saveTranscript('m1', 'es', [{ startMs: 0, endMs: 900, text: 'Otra cosa.' }], 'srt', undefined, db);
    expect(await saveSpeakers('m1', labelled, db)).toBeNull();
    expect((await getTranscript('m1', db))?.cues[0].speaker).toBeUndefined();
  });
});
