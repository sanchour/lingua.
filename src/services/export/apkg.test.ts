import JSZip from 'jszip';
import initSqlJs from 'sql.js';
import { describe, expect, it } from 'vitest';
import { ankiScheduling, imagesIn, mapFields, noteText, readApkg, soundsIn } from '@/core/parsers/apkg';
import type { Card, Deck, Note } from '@/data/types';
import { exportDeckToApkgBytes } from './apkg';

describe('services/export/apkg round-trip', () => {
  it('writes a valid .apkg that readApkg parses back with notes, examples, FSRS scheduling, and media', async () => {
    const SQL = await initSqlJs();
    const now = 1_760_000_000_000;
    const deck: Pick<Deck, 'id' | 'name' | 'lang' | 'description'> = {
      id: 'deck-es-1',
      name: 'Viaje a Madrid',
      lang: 'es',
      description: 'Travel phrases and words',
    };

    const notes: Note[] = [
      {
        id: 'note-1111111111',
        deckId: deck.id,
        lang: 'es',
        term: 'el billete',
        meaning: 'the ticket',
        example: { text: 'Compré el billete de tren.', translation: 'I bought the train ticket.' },
        tags: ['travel', 'train'],
        audioBlobId: 'blob-audio-1',
        imageBlobId: 'blob-img-1',
        source: 'manual',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'note-2222222222',
        deckId: deck.id,
        lang: 'es',
        term: 'la estación',
        meaning: 'the station',
        example: { text: 'La estación está cerca.', translation: 'The station is nearby.' },
        tags: ['travel'],
        source: 'manual',
        createdAt: now,
        updatedAt: now,
      },
    ];

    const cards: Card[] = [
      {
        id: 'card-1',
        noteId: 'note-1111111111',
        deckId: deck.id,
        direction: 'recognition',
        state: 2,
        due: now + 10 * 86_400_000,
        stability: 12.5,
        difficulty: 4.2,
        elapsedDays: 5,
        scheduledDays: 10,
        learningSteps: 0,
        reps: 4,
        lapses: 1,
        suspended: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'card-2',
        noteId: 'note-2222222222',
        deckId: deck.id,
        direction: 'recognition',
        state: 0,
        due: now,
        stability: 0,
        difficulty: 5,
        elapsedDays: 0,
        scheduledDays: 0,
        learningSteps: 0,
        reps: 0,
        lapses: 0,
        suspended: 0,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const blobs = new Map([
      ['blob-audio-1', { mime: 'audio/mpeg', bytes: new Uint8Array([0x49, 0x44, 0x33, 0x04]) }],
      ['blob-img-1', { mime: 'image/png', bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) }],
    ]);

    const bytes = await exportDeckToApkgBytes({ deck, notes, cards, blobs, now }, SQL);
    expect(bytes.byteLength).toBeGreaterThan(200);

    // Round-trip: parse back with readApkg from src/core/parsers/apkg.ts
    const zip = await JSZip.loadAsync(bytes);
    const col = await readApkg(zip, SQL, (x) => x);

    expect([...col.decks.values()]).toContain('Viaje a Madrid');
    expect(col.notes).toHaveLength(2);

    const type = [...col.types.values()][0];
    expect(type).toBeDefined();
    const map = mapFields(type);

    const parsed0 = noteText(col.notes[0], type, map);
    expect(parsed0.term).toContain('el billete');
    expect(parsed0.meaning).toContain('the ticket');
    expect(parsed0.example?.text).toBe('Compré el billete de tren.');
    expect(parsed0.example?.translation).toBe('I bought the train ticket.');
    expect(col.notes[0].tags).toEqual(['travel', 'train']);

    // Check embedded media references and binary payload in the zip
    const soundRefs = soundsIn(col.notes[0].fields.join(' '));
    const imageRefs = imagesIn(col.notes[0].fields.join(' '));
    expect(soundRefs).toEqual(['lingua-audio-blob-audio-1.mp3']);
    expect(imageRefs).toEqual(['lingua-img-blob-img-1.png']);
    expect(col.media.get('lingua-audio-blob-audio-1.mp3')).toBe('0');
    expect(col.media.get('lingua-img-blob-img-1.png')).toBe('1');
    const audioRoundTrip = await zip.file('0')!.async('uint8array');
    expect([...audioRoundTrip]).toEqual([0x49, 0x44, 0x33, 0x04]);

    // Check FSRS scheduling round-trip on the reviewed card
    const sched = ankiScheduling(col.notes[0].cards[0], col.crt, now, 0);
    expect(sched).not.toBeNull();
    expect(sched?.state).toBe(2);
    expect(sched?.stability).toBeCloseTo(12.5, 1);
    expect(sched?.difficulty).toBeCloseTo(4.2, 1);
    expect(sched?.reps).toBe(4);
    expect(sched?.lapses).toBe(1);
  });
});
