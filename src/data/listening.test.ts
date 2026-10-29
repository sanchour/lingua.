import { afterEach, describe, expect, it } from 'vitest';
import { createDb } from './db';
import type { LinguaDB } from './db';
import { heardLines } from './listening';
import { saveTranscript } from './media';
import type { Media } from './types';

const open: LinguaDB[] = [];
afterEach(async () => {
  await Promise.all(open.splice(0).map((d) => d.delete()));
});

describe('lines to listen to', () => {
  it('are the usable lines of a language’s transcripts, with where they are heard; the line near a hard place first', async () => {
    const db = createDb(`listening-${Math.random().toString(36).slice(2)}`);
    open.push(db);
    await db.media.add({ id: 'm', lang: 'es', kind: 'audio', title: 'T', remoteUrl: 'x', bookmarks: [{ at: 11000, hard: true }], createdAt: 1, updatedAt: 1 } as Media);
    await db.media.add({ id: 'other', lang: 'fr', kind: 'audio', title: 'F', remoteUrl: 'x', createdAt: 1, updatedAt: 1 } as Media);
    const cue = (i: number, text: string) => ({ startMs: i * 4000, endMs: i * 4000 + 3500, text });
    await saveTranscript('m', 'es', [cue(0, 'Hola.'), cue(1, 'Mi perro come pan todos los días.'), cue(2, 'Vivo en una casa pequeña y bonita.'), cue(3, '12345 6789')], 'srt', undefined, db);
    await saveTranscript('other', 'fr', [cue(0, 'Je mange du pain tous les jours.')], 'srt', undefined, db);
    const lines = await heardLines('es', 40, db);
    expect(lines.map((l) => l.text)).toEqual(['Vivo en una casa pequeña y bonita.', 'Mi perro come pan todos los días.']);
    expect(lines[1]).toMatchObject({ mediaId: 'm', startMs: 4000, endMs: 7500 });
  });
});
