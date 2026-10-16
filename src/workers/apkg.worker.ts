/// <reference lib="webworker" />
// Imports an Anki package off the main thread: unzip → SQLite (sql.js) → notes, cards with their
// scheduling, and audio/images → IndexedDB. One Lingua deck per Anki deck, in a folder when there are several.
import JSZip from 'jszip';
import initSqlJs from 'sql.js';
import { decompress } from 'fzstd';
import { ankiDeckName, ankiScheduling, imagesIn, mapFields, noteText, readApkg, soundsIn } from '@/core/parsers/apkg';
import { normalizeWord } from '@/core/text/normalize';
import { DEFAULT_DECK_CONFIG, makeNote } from '@/data/cardFactory';
import { createDb } from '@/data/db';
import type { BlobRow, Card, Deck, Folder, Note } from '@/data/types';

export type ApkgWorkerRequest = { lang: string; file: File; fileName: string; wasmUrl: string };
export type ApkgWorkerMessage =
  | { type: 'progress'; phase: 'read' | 'media' | 'store'; pct: number }
  | { type: 'done'; deckIds: string[]; notes: number; cards: number; media: number }
  | { type: 'error'; message: string };

const post = (message: ApkgWorkerMessage) => (self as DedicatedWorkerGlobalScope).postMessage(message);

const MIME: Record<string, string> = { mp3: 'audio/mpeg', m4a: 'audio/mp4', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', wav: 'audio/wav', webm: 'audio/webm', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };
const mimeOf = (name: string) => MIME[name.split('.').pop()?.toLowerCase() ?? ''];
const CHUNK = 2000;

async function run({ lang, file, fileName, wasmUrl }: ApkgWorkerRequest): Promise<void> {
  post({ type: 'progress', phase: 'read', pct: 0 });
  const [SQL, zip] = await Promise.all([initSqlJs({ locateFile: () => wasmUrl }), JSZip.loadAsync(file)]);
  const col = await readApkg(zip, SQL, decompress);
  if (!col.notes.length) throw new Error('This Anki deck has no cards.');

  const db = createDb();
  await db.open();
  const now = Date.now();
  const study = ((await db.settings.get('study'))?.value ?? {}) as Partial<Deck['config']> & { newPerDay?: number; maxReviews?: number; desiredRetention?: number };

  // One Lingua deck per Anki deck that holds cards; several go into a folder named after the file.
  const usedDecks = [...new Set(col.notes.flatMap((n) => n.cards.map((c) => c.deckId)))];
  let folder: Folder | null = null;
  if (usedDecks.length > 1) {
    folder = { id: crypto.randomUUID(), lang, parentId: null, name: fileName.replace(/\.apkg$/i, ''), order: await db.folders.where('lang').equals(lang).count(), createdAt: now, updatedAt: now };
  }
  const order = await db.decks.where('lang').equals(lang).count();
  const decks = new Map<number, Deck>();
  usedDecks.forEach((ankiId, i) => {
    const full = col.decks.get(ankiId) ?? fileName.replace(/\.apkg$/i, '');
    const reversed = col.notes.some((n) => n.cards.some((c) => c.deckId === ankiId && c.ord === 1));
    decks.set(ankiId, {
      id: crypto.randomUUID(),
      lang,
      folderId: folder?.id ?? null,
      name: ankiDeckName(full),
      description: `Imported from Anki (${full})`,
      order: order + i,
      kind: 'apkg',
      config: {
        ...DEFAULT_DECK_CONFIG,
        newPerDay: study.newPerDay ?? DEFAULT_DECK_CONFIG.newPerDay,
        maxReviews: study.maxReviews ?? DEFAULT_DECK_CONFIG.maxReviews,
        desiredRetention: study.desiredRetention ?? DEFAULT_DECK_CONFIG.desiredRetention,
        directions: reversed ? ['recognition', 'production'] : ['recognition'],
      },
      createdAt: now,
      updatedAt: now,
    });
  });

  // Media used by the notes (first sound and first image of each note).
  const blobs: BlobRow[] = [];
  const blobFor = new Map<string, string>();
  const wanted = new Set(col.notes.flatMap((n) => [soundsIn(n.fields.join(' '))[0], imagesIn(n.fields.join(' '))[0]].filter(Boolean)));
  let done = 0;
  for (const name of wanted) {
    const entry = col.media.get(name);
    const mime = mimeOf(name);
    const zipped = entry ? zip.file(entry) : null;
    if (zipped && mime) {
      let bytes = await zipped.async('uint8array');
      if (col.mediaCompressed) bytes = decompress(bytes);
      const id = crypto.randomUUID();
      blobs.push({ id, kind: mime.startsWith('audio') ? 'audio' : 'image', mime, size: bytes.length, blob: new Blob([bytes as BlobPart], { type: mime }), createdAt: now });
      blobFor.set(name, id);
    }
    if (++done % 25 === 0) post({ type: 'progress', phase: 'media', pct: done / wanted.size });
  }

  const notes: Note[] = [];
  const cards: Card[] = [];
  col.notes.forEach((anki, i) => {
    const type = col.types.get(anki.typeId);
    const text = noteText(anki, type, type ? mapFields(type) : { term: 0, meaning: 1, example: -1, exampleTranslation: -1 });
    if (!text.term) return;
    const deck = decks.get(anki.cards[0].deckId)!;
    const all = anki.fields.join(' ');
    const sound = soundsIn(all)[0];
    const image = imagesIn(all)[0];
    const single = !/\s/.test(text.term);
    const { note, cards: fresh } = makeNote(
      deck,
      {
        ...text,
        tags: anki.tags,
        source: 'apkg',
        wordId: single ? `${lang}:${normalizeWord(text.term, lang)}` : undefined,
        audioBlobId: sound ? blobFor.get(sound) : undefined,
        imageBlobId: image ? blobFor.get(image) : undefined,
        extra: type ? Object.fromEntries(type.fields.map((f, k) => [f, anki.fields[k] ?? ''])) : undefined,
      },
      now,
    );
    notes.push(note);
    // Keep Anki's progress where there is one; new cards keep Anki's order.
    for (const card of fresh) {
      const source = anki.cards.find((c) => c.ord === (card.direction === 'production' ? 1 : 0)) ?? anki.cards[0];
      const scheduled = ankiScheduling(source, col.crt, now, i);
      cards.push(scheduled ? { ...card, ...scheduled } : { ...card, due: now + i, suspended: source.queue === -1 ? 1 : 0 });
    }
  });

  const total = notes.length + cards.length + blobs.length;
  let stored = 0;
  const store = async <T>(table: { bulkAdd: (rows: T[]) => Promise<unknown> }, rows: T[]) => {
    for (let k = 0; k < rows.length; k += CHUNK) {
      await table.bulkAdd(rows.slice(k, k + CHUNK));
      stored += Math.min(CHUNK, rows.length - k);
      post({ type: 'progress', phase: 'store', pct: stored / total });
    }
  };
  await db.transaction('rw', [db.folders, db.decks, db.notes, db.cards, db.blobs], async () => {
    if (folder) await db.folders.add(folder);
    await db.decks.bulkAdd([...decks.values()]);
    await store(db.blobs, blobs);
    await store(db.notes, notes);
    await store(db.cards, cards);
  });
  db.close();
  post({ type: 'done', deckIds: [...decks.values()].map((d) => d.id), notes: notes.length, cards: cards.length, media: blobs.length });
}

self.onmessage = (event: MessageEvent<ApkgWorkerRequest>) => {
  run(event.data).catch((error: unknown) => post({ type: 'error', message: error instanceof Error ? error.message : String(error) }));
};
