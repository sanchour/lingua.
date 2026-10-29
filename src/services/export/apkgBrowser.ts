// Browser helper that loads sql.js WASM and exports a deck (or all decks for a language) to an .apkg file.
import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm-browser.wasm?url';
import { db } from '@/data/db';
import type { BlobRow } from '@/data/types';
import { exportDeckToApkgBytes } from './apkg';
import { saveFile } from './index';

export async function downloadDeckApkg(deckId: string): Promise<void> {
  const deck = await db.decks.get(deckId);
  if (!deck) throw new Error('Deck not found.');
  const [notes, cards, SQL] = await Promise.all([
    db.notes.where('deckId').equals(deckId).toArray(),
    db.cards.where('deckId').equals(deckId).toArray(),
    initSqlJs({ locateFile: () => wasmUrl }),
  ]);

  const blobIds = new Set<string>();
  for (const n of notes) {
    if (n.audioBlobId) blobIds.add(n.audioBlobId);
    if (n.imageBlobId) blobIds.add(n.imageBlobId);
  }
  const blobs = new Map<string, BlobRow>();
  if (blobIds.size > 0) {
    const rows = await db.blobs.bulkGet([...blobIds]);
    for (const r of rows) {
      if (r) blobs.set(r.id, r);
    }
  }

  const bytes = await exportDeckToApkgBytes({ deck, notes, cards, blobs }, SQL);
  const safeName = deck.name.toLowerCase().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '') || 'lingua-deck';
  saveFile(`${safeName}.apkg`, bytes, 'application/octet-stream');
}
