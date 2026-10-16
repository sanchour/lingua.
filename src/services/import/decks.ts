// Importing word lists into Thesaurus: CSV on the main thread (small), Anki packages in a worker.
import wasmUrl from 'sql.js/dist/sql-wasm-browser.wasm?url';
import type { CsvNote } from '@/core/parsers/deckCsv';
import { normalizeWord } from '@/core/text/normalize';
import { db } from '@/data/db';
import { createDeck, makeNote } from '@/data/decks';
import type { ApkgWorkerMessage } from '@/workers/apkg.worker';
import ApkgWorker from '@/workers/apkg.worker?worker';

export async function importCsvDeck(lang: string, name: string, folderId: string | null, rows: CsvNote[]): Promise<{ deckId: string; added: number }> {
  const deckId = await createDeck(lang, { name, folderId, kind: 'csv', description: 'Imported from a spreadsheet' });
  const deck = (await db.decks.get(deckId))!;
  const now = Date.now();
  const built = rows.map((row, i) => {
    const made = makeNote(deck, {
      ...row,
      source: 'csv',
      wordId: /\s/.test(row.term) ? undefined : `${lang}:${normalizeWord(row.term, lang)}`,
    }, now);
    for (const c of made.cards) c.due = now + i;
    return made;
  });
  await db.transaction('rw', db.notes, db.cards, async () => {
    await db.notes.bulkAdd(built.map((b) => b.note));
    await db.cards.bulkAdd(built.flatMap((b) => b.cards));
  });
  return { deckId, added: built.length };
}

export interface ApkgResult {
  deckIds: string[];
  notes: number;
  cards: number;
  media: number;
}

export function importApkg(lang: string, file: File, onProgress?: (pct: number) => void): Promise<ApkgResult> {
  return new Promise((resolve, reject) => {
    const worker = new ApkgWorker();
    worker.onmessage = (event: MessageEvent<ApkgWorkerMessage>) => {
      const msg = event.data;
      if (msg.type === 'progress') onProgress?.(msg.phase === 'read' ? 0.05 : msg.phase === 'media' ? 0.05 + msg.pct * 0.35 : 0.4 + msg.pct * 0.6);
      else {
        worker.terminate();
        if (msg.type === 'done') resolve(msg);
        else reject(new Error(msg.message));
      }
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || 'The Anki deck couldn’t be imported.'));
    };
    worker.postMessage({ lang, file, fileName: file.name, wasmUrl });
  });
}
