// Exporting a Lingua deck to an Anki package (.apkg, schema 11: collection.anki2 + media JSON).
// Accepts sql.js and JSZip so it runs in both browser and Node round-trip tests.
import JSZip from 'jszip';
import type { SqlJsStatic } from 'sql.js';
import type { BlobRow, Card, Deck, Note } from '@/data/types';

export interface ApkgExportInput {
  deck: Pick<Deck, 'id' | 'name' | 'lang' | 'description'>;
  notes: Note[];
  cards?: Card[];
  blobs?: Map<string, BlobRow | { mime: string; bytes: Uint8Array }>;
  /** Collection creation timestamp in epoch ms (defaults to Date.now()). */
  now?: number;
}

const EXT_FOR_MIME: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/webm': 'webm',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

function ankiChecksum(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function escapeHtmlField(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function buildApkgZip(input: ApkgExportInput, SQL: SqlJsStatic): Promise<JSZip> {
  const nowMs = input.now ?? Date.now();
  const crtSec = Math.floor(nowMs / 1000);
  const deckIdNum = 1700000000001;
  const modelIdNum = 1700000000002;

  const db = new SQL.Database();
  try {
    db.run(`
      CREATE TABLE col (
        id integer primary key,
        crt integer not null,
        mod integer not null,
        scm integer not null,
        ver integer not null,
        dty integer not null,
        usn integer not null,
        ls integer not null,
        conf text not null,
        models text not null,
        decks text not null,
        dconf text not null,
        tags text not null
      );
      CREATE TABLE notes (
        id integer primary key,
        guid text not null,
        mid integer not null,
        mod integer not null,
        usn integer not null,
        tags text not null,
        flds text not null,
        sfld text not null,
        csum integer not null,
        flags integer not null,
        data text not null
      );
      CREATE TABLE cards (
        id integer primary key,
        nid integer not null,
        did integer not null,
        ord integer not null,
        mod integer not null,
        usn integer not null,
        type integer not null,
        queue integer not null,
        due integer not null,
        ivl integer not null,
        factor integer not null,
        reps integer not null,
        lapses integer not null,
        left integer not null,
        odue integer not null,
        odid integer not null,
        flags integer not null,
        data text not null
      );
      CREATE TABLE revlog (
        id integer primary key,
        cid integer not null,
        usn integer not null,
        ease integer not null,
        ivl integer not null,
        lastIvl integer not null,
        factor integer not null,
        time integer not null,
        type integer not null
      );
      CREATE TABLE graves (
        usn integer not null,
        oid integer not null,
        type integer not null
      );
    `);

    const fieldNames = ['Front', 'Back', 'Example', 'ExampleTranslation'];
    const models = {
      [String(modelIdNum)]: {
        id: modelIdNum,
        name: 'Lingua Basic',
        type: 0,
        mod: crtSec,
        usn: -1,
        sortf: 0,
        did: deckIdNum,
        tmpls: [
          {
            name: 'Recognition',
            ord: 0,
            qfmt: '{{Front}}',
            afmt: '{{FrontSide}}<hr id="answer">{{Back}}<br>{{Example}}<br><i>{{ExampleTranslation}}</i>',
            bqfmt: '',
            bafmt: '',
            did: null,
          },
          {
            name: 'Production',
            ord: 1,
            qfmt: '{{Back}}',
            afmt: '{{FrontSide}}<hr id="answer">{{Front}}<br>{{Example}}',
            bqfmt: '',
            bafmt: '',
            did: null,
          },
        ],
        flds: fieldNames.map((name, ord) => ({
          name,
          ord,
          sticky: false,
          rtl: false,
          font: 'Arial',
          size: 20,
          media: [],
        })),
        css: '.card { font-family: Georgia, serif; font-size: 20px; text-align: center; color: #1f1e1b; background-color: #faf7f0; }',
        latexPre: '',
        latexPost: '',
        req: [[0, 'all', [0]]],
        tags: [],
        vers: [],
      },
    };

    const decks = {
      '1': { id: 1, name: 'Default', mod: crtSec, usn: -1, desc: '', dyn: 0, collapsed: false, conf: 1 },
      [String(deckIdNum)]: {
        id: deckIdNum,
        name: input.deck.name,
        mod: crtSec,
        usn: -1,
        desc: input.deck.description ?? '',
        dyn: 0,
        collapsed: false,
        conf: 1,
      },
    };

    const conf = {
      nextPos: 1,
      estTimes: true,
      activeDecks: [deckIdNum],
      sortType: 'noteFld',
      timeLim: 0,
      sortBackwards: false,
      addToCur: true,
      curDeck: deckIdNum,
      newBury: true,
      newSpread: 0,
      dueCounts: true,
      curModel: String(modelIdNum),
      collapseTime: 1200,
    };

    const dconf = {
      '1': {
        id: 1,
        name: 'Default',
        mod: 0,
        usn: 0,
        maxTaken: 60,
        timer: 0,
        autoplay: true,
        replayq: true,
        new: { bury: true, delays: [1, 10], initialFactor: 2500, ints: [1, 4, 7], order: 1, perDay: 20 },
        rev: { bury: true, ease4: 1.3, fuzz: 0.05, ivlFct: 1, maxIvl: 36500, perDay: 200, hardFactor: 1.2 },
        lapse: { delays: [10], leechAction: 0, leechFails: 8, minInt: 1, mult: 0 },
      },
    };

    db.run(
      `INSERT INTO col VALUES (1, ?, ?, ?, 11, 0, 0, 0, ?, ?, ?, ?, '{}')`,
      [crtSec, nowMs, nowMs, JSON.stringify(conf), JSON.stringify(models), JSON.stringify(decks), JSON.stringify(dconf)],
    );

    const zip = new JSZip();
    const mediaJson: Record<string, string> = {};
    let mediaIndex = 0;

    const addMediaBlob = async (blobId: string | undefined, prefix: 'audio' | 'img'): Promise<string | null> => {
      if (!blobId || !input.blobs) return null;
      const row = input.blobs.get(blobId);
      if (!row) return null;
      const ext = EXT_FOR_MIME[row.mime] ?? (prefix === 'audio' ? 'mp3' : 'png');
      const filename = `lingua-${prefix}-${blobId}.${ext}`;
      const bytes = 'bytes' in row ? row.bytes : new Uint8Array(await row.blob.arrayBuffer());
      const entryKey = String(mediaIndex++);
      zip.file(entryKey, bytes);
      mediaJson[entryKey] = filename;
      return filename;
    };

    const cardsByNote = new Map<string, Card[]>();
    for (const c of input.cards ?? []) {
      if (c.deletedAt) continue;
      const list = cardsByNote.get(c.noteId) ?? [];
      list.push(c);
      cardsByNote.set(c.noteId, list);
    }

    const activeNotes = input.notes.filter((n) => !n.deletedAt);
    const noteStmt = db.prepare(`INSERT INTO notes VALUES (?, ?, ?, ?, -1, ?, ?, ?, ?, 0, '')`);
    const cardStmt = db.prepare(`INSERT INTO cards VALUES (?, ?, ?, ?, ?, -1, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?)`);

    let nextId = crtSec * 1000;
    for (let i = 0; i < activeNotes.length; i++) {
      const note = activeNotes[i];
      const nid = nextId++;
      const audioFile = await addMediaBlob(note.audioBlobId, 'audio');
      const imageFile = await addMediaBlob(note.imageBlobId, 'img');

      let front = escapeHtmlField(note.term);
      if (audioFile) front += ` [sound:${audioFile}]`;
      let back = escapeHtmlField(note.meaning);
      if (imageFile) back += ` <img src="${imageFile}">`;
      const exText = escapeHtmlField(note.example?.text ?? note.context?.sentence ?? '');
      const exTrans = escapeHtmlField(note.example?.translation ?? '');

      const flds = [front, back, exText, exTrans].join('\x1f');
      const tags = note.tags?.length ? ` ${note.tags.map((t) => t.replace(/\s+/g, '_')).join(' ')} ` : '';

      noteStmt.run([
        nid,
        note.id.slice(0, 10) || String(nid),
        modelIdNum,
        crtSec,
        tags,
        flds,
        note.term,
        ankiChecksum(note.term),
      ]);

      const noteCards = cardsByNote.get(note.id);
      const cardsToWrite: Array<{ ord: number; card?: Card }> =
        noteCards && noteCards.length > 0
          ? noteCards.map((c) => ({ ord: c.direction === 'production' ? 1 : 0, card: c }))
          : [{ ord: 0 }];

      for (const { ord, card } of cardsToWrite) {
        const cid = nextId++;
        const state = card?.state ?? 0;
        const suspended = card?.suspended === 1;
        const type = state;
        const queue = suspended ? -1 : state;
        const ivl = state === 2 ? Math.max(1, Math.round(card?.scheduledDays || card?.stability || 1)) : 0;
        const dueDays =
          state === 2 && card?.due
            ? Math.max(0, Math.round((card.due / 1000 - crtSec) / 86_400))
            : i + 1;
        const difficulty = card?.difficulty ?? 5;
        const factor = Math.round(2500 - (difficulty - 5) * 300);
        const data = card && state > 0 ? JSON.stringify({ s: Number((card.stability || 1).toFixed(2)), d: Number(difficulty.toFixed(2)) }) : '';

        cardStmt.run([
          cid,
          nid,
          deckIdNum,
          ord,
          crtSec,
          type,
          queue,
          dueDays,
          ivl,
          factor,
          card?.reps ?? 0,
          card?.lapses ?? 0,
          data,
        ]);
      }
    }

    noteStmt.free();
    cardStmt.free();

    const sqliteBytes = db.export();
    zip.file('collection.anki2', sqliteBytes);
    zip.file('media', JSON.stringify(mediaJson));
    return zip;
  } finally {
    db.close();
  }
}

export async function exportDeckToApkgBytes(input: ApkgExportInput, SQL: SqlJsStatic): Promise<Uint8Array> {
  const zip = await buildApkgZip(input, SQL);
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}
