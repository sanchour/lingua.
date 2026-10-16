// Reading Anki packages (.apkg). An .apkg is a zip with an SQLite collection — "collection.anki2"
// / "collection.anki21" (schema 11), or "collection.anki21b" (zstd-compressed, schema 18, Anki 2.1.50+)
// — plus numbered media files listed in "media" (JSON, or zstd-compressed protobuf in new exports).
// The SQLite engine (sql.js) and zstd decoder are passed in, so this module stays testable in Node.
import type JSZip from 'jszip';
import type { Database, SqlJsStatic } from 'sql.js';
import type { Card } from '@/data/types';
import { stripHtml } from './deckCsv';

export interface AnkiCard {
  /** Template number: 0 = front→back, 1 = the reverse card of "Basic (and reversed)". */
  ord: number;
  deckId: number;
  /** 0 new · 1 learning · 2 review · 3 relearning */
  type: number;
  /** -1 suspended, -2/-3 buried */
  queue: number;
  due: number;
  ivl: number;
  factor: number;
  reps: number;
  lapses: number;
  /** JSON; holds FSRS memory state ({"s":…,"d":…}) when the learner used FSRS in Anki. */
  data: string;
}

export interface AnkiNote {
  id: number;
  typeId: number;
  fields: string[];
  tags: string[];
  cards: AnkiCard[];
}

export interface AnkiNoteType {
  id: number;
  name: string;
  fields: string[];
  cloze: boolean;
}

export interface AnkiCollection {
  /** Collection creation (seconds): review due dates count days from it. */
  crt: number;
  decks: Map<number, string>;
  types: Map<number, AnkiNoteType>;
  notes: AnkiNote[];
  /** Media file name → zip entry name. */
  media: Map<string, string>;
  /** Media files are zstd-compressed in new-format packages. */
  mediaCompressed: boolean;
}

type Unzstd = (data: Uint8Array) => Uint8Array;

function rows<T>(db: Database, sql: string): T[] {
  const out: T[] = [];
  const stmt = db.prepare(sql);
  while (stmt.step()) out.push(stmt.getAsObject() as T);
  stmt.free();
  return out;
}

const hasTable = (db: Database, name: string) => rows<{ n: number }>(db, `SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name='${name}'`)[0]?.n > 0;

// ── Minimal protobuf reading (new-format media list) ────────────────────────

function readVarint(buf: Uint8Array, at: { i: number }): number {
  let result = 0;
  let shift = 0;
  for (;;) {
    const b = buf[at.i++];
    result += (b & 0x7f) * 2 ** shift;
    if (b < 0x80) return result;
    shift += 7;
  }
}

/** MediaEntries { repeated MediaEntry entries = 1 } · MediaEntry { string name = 1; …; optional uint32 legacy_zip_filename = 255 } */
export function parseMediaEntries(buf: Uint8Array): Map<string, string> {
  const out = new Map<string, string>();
  const at = { i: 0 };
  let index = 0;
  while (at.i < buf.length) {
    const key = readVarint(buf, at);
    if (key >> 3 !== 1 || (key & 7) !== 2) throw new Error('Unexpected media list format.');
    const len = readVarint(buf, at);
    const end = at.i + len;
    let name = '';
    let legacy: number | null = null;
    while (at.i < end) {
      const k = readVarint(buf, at);
      const field = k >> 3;
      const wire = k & 7;
      if (wire === 2) {
        const l = readVarint(buf, at);
        if (field === 1) name = new TextDecoder().decode(buf.subarray(at.i, at.i + l));
        at.i += l;
      } else if (wire === 0) {
        const v = readVarint(buf, at);
        if (field === 255) legacy = v;
      } else throw new Error('Unexpected media list format.');
    }
    if (name) out.set(name, String(legacy ?? index));
    index++;
  }
  return out;
}

export async function readApkg(zip: JSZip, SQL: SqlJsStatic, unzstd: Unzstd): Promise<AnkiCollection> {
  const pick = ['collection.anki21b', 'collection.anki21', 'collection.anki2'].find((n) => zip.file(n));
  if (!pick) throw new Error('This file isn’t an Anki deck (.apkg).');
  let bytes = await zip.file(pick)!.async('uint8array');
  const modern = pick.endsWith('b');
  if (modern) bytes = unzstd(bytes);
  const db = new SQL.Database(bytes);
  try {
    const col = rows<{ crt: number; models: string; decks: string }>(db, 'SELECT crt, models, decks FROM col')[0];
    const types = new Map<number, AnkiNoteType>();
    const decks = new Map<number, string>();
    if (hasTable(db, 'notetypes')) {
      for (const t of rows<{ id: number; name: string }>(db, 'SELECT id, name FROM notetypes')) types.set(t.id, { id: t.id, name: t.name, fields: [], cloze: /cloze/i.test(t.name) });
      for (const f of rows<{ ntid: number; ord: number; name: string }>(db, 'SELECT ntid, ord, name FROM fields ORDER BY ntid, ord')) types.get(f.ntid)?.fields.push(f.name);
      for (const d of rows<{ id: number; name: string }>(db, 'SELECT id, name FROM decks')) decks.set(d.id, d.name.split('\x1f').join('::'));
    } else {
      const models = JSON.parse(col.models || '{}') as Record<string, { name: string; type: number; flds: { name: string; ord: number }[] }>;
      for (const [id, m] of Object.entries(models)) {
        types.set(Number(id), { id: Number(id), name: m.name, fields: [...m.flds].sort((a, b) => a.ord - b.ord).map((f) => f.name), cloze: m.type === 1 });
      }
      for (const [id, d] of Object.entries(JSON.parse(col.decks || '{}') as Record<string, { name: string }>)) decks.set(Number(id), d.name);
    }

    const byNote = new Map<number, AnkiNote>();
    for (const n of rows<{ id: number; mid: number; flds: string; tags: string }>(db, 'SELECT id, mid, flds, tags FROM notes ORDER BY id')) {
      byNote.set(n.id, { id: n.id, typeId: n.mid, fields: n.flds.split('\x1f'), tags: n.tags.trim().split(/\s+/).filter(Boolean), cards: [] });
    }
    for (const c of rows<AnkiCard & { nid: number; did: number }>(db, 'SELECT nid, did, ord, type, queue, due, ivl, factor, reps, lapses, data FROM cards ORDER BY nid, ord')) {
      byNote.get(c.nid)?.cards.push({ ord: c.ord, deckId: c.did, type: c.type, queue: c.queue, due: c.due, ivl: c.ivl, factor: c.factor, reps: c.reps, lapses: c.lapses, data: c.data ?? '' });
    }

    let media = new Map<string, string>();
    const mediaFile = zip.file('media');
    if (mediaFile) {
      const raw = await mediaFile.async('uint8array');
      if (modern) media = parseMediaEntries(unzstd(raw));
      else for (const [entry, name] of Object.entries(JSON.parse(new TextDecoder().decode(raw) || '{}') as Record<string, string>)) media.set(name, entry);
    }

    // New exports also carry an old-format collection holding a single "please update" note.
    const notes = [...byNote.values()].filter((n) => n.cards.length);
    return { crt: col.crt, decks, types, notes, media, mediaCompressed: modern };
  } finally {
    db.close();
  }
}

// ── Mapping to Lingua ───────────────────────────────────────────────────────

export interface FieldMap {
  term: number;
  meaning: number;
  example: number;
  exampleTranslation: number;
}

const find = (names: string[], test: RegExp, taken: number[]) => names.findIndex((n, i) => !taken.includes(i) && test.test(n));

/** Which field of a note type is the word, the meaning, the example… (by name, else by position). */
export function mapFields(type: AnkiNoteType): FieldMap {
  const names = type.fields.map((f) => f.trim().toLowerCase());
  const taken: number[] = [];
  const claim = (test: RegExp) => {
    const i = find(names, test, taken);
    if (i >= 0) taken.push(i);
    return i;
  };
  const exampleTranslation = claim(/(sentence|example).*(translation|english|meaning)|translation.*(sentence|example)/);
  let term = claim(/^(front|word|term|expression|vocab|vocabulary|target|question|text|wort|palabra|mot|parola|слово|λέξη|ord|szó)\b/);
  let meaning = claim(/(back|meaning|definition|translation|english|answer|gloss|extra|bedeutung|significado|перевод)/);
  const example = claim(/(example|sentence|context|usage|beispiel|ejemplo|exemple)/);
  if (term < 0) term = [0, 1, 2].find((i) => i < names.length && !taken.includes(i)) ?? 0;
  if (!taken.includes(term)) taken.push(term);
  if (meaning < 0) meaning = names.findIndex((_, i) => !taken.includes(i));
  return { term, meaning, example, exampleTranslation };
}

export const soundsIn = (html: string) => [...html.matchAll(/\[sound:([^\]]+)\]/g)].map((m) => m[1]);
export const imagesIn = (html: string) => [...html.matchAll(/<img[^>]+src=["']?([^"'>\s]+)/gi)].map((m) => decodeURIComponent(m[1]));

/** "Ella tiene un {{c1::perro::animal}}." → answer, sentence with the answer, and its span. */
export function readCloze(text: string): { answer: string; sentence: string; span: [number, number] } | null {
  const m = /\{\{c\d+::(.*?)(?:::(.*?))?\}\}/.exec(text);
  if (!m) return null;
  const before = text.slice(0, m.index).replace(/\{\{c\d+::(.*?)(?:::.*?)?\}\}/g, '$1');
  const after = text.slice(m.index + m[0].length).replace(/\{\{c\d+::(.*?)(?:::.*?)?\}\}/g, '$1');
  return { answer: m[1], sentence: before + m[1] + after, span: [before.length, before.length + m[1].length] };
}

/** The fields of an Anki note as Lingua text. */
export function noteText(note: AnkiNote, type: AnkiNoteType | undefined, map: FieldMap) {
  const field = (i: number) => (i >= 0 ? (note.fields[i] ?? '') : '');
  if (type?.cloze) {
    const plain = stripHtml(field(0));
    const cloze = readCloze(plain);
    if (cloze) {
      return {
        term: cloze.answer,
        meaning: stripHtml(field(1)).replace(/\n+/g, '; '),
        example: { text: cloze.sentence, cloze: cloze.span },
      };
    }
  }
  const exampleText = stripHtml(field(map.example));
  return {
    term: stripHtml(field(map.term)).replace(/\n+/g, ' '),
    meaning: stripHtml(field(map.meaning)).replace(/\n+/g, '; '),
    example: exampleText ? { text: exampleText, translation: stripHtml(field(map.exampleTranslation)) || undefined } : undefined,
  };
}

type Scheduling = Pick<Card, 'due' | 'stability' | 'difficulty' | 'elapsedDays' | 'scheduledDays' | 'learningSteps' | 'reps' | 'lapses' | 'state' | 'lastReview' | 'suspended'>;

const DAY = 86_400_000;

/**
 * Carries an Anki card's progress over to FSRS. Cards Anki already scheduled with FSRS keep their
 * memory state; otherwise the interval stands in for stability and the ease factor for difficulty
 * (ease 250% ≈ difficulty 5). New cards stay new, in Anki's order.
 */
export function ankiScheduling(card: AnkiCard, crt: number, now: number, order: number): Scheduling | null {
  const suspended = card.queue === -1 ? 1 : 0;
  if (card.type === 0) return null; // new: Lingua creates a fresh card (ordered by `order`)
  let memory: { s?: number; d?: number } = {};
  try {
    memory = card.data ? (JSON.parse(card.data) as { s?: number; d?: number }) : {};
  } catch {
    memory = {};
  }
  const ivl = Math.max(1, card.ivl);
  const difficulty = memory.d ?? Math.min(10, Math.max(1, 5 + (2500 - (card.factor || 2500)) / 300));
  if (card.type === 2) {
    const due = (crt + card.due * 86_400) * 1000;
    return {
      state: 2,
      due,
      stability: memory.s ?? ivl,
      difficulty,
      scheduledDays: ivl,
      elapsedDays: 0,
      learningSteps: 0,
      reps: card.reps,
      lapses: card.lapses,
      lastReview: due - ivl * DAY,
      suspended,
    };
  }
  // Learning or relearning in Anki: comes back soon in Lingua too.
  return {
    state: card.type === 3 ? 3 : 1,
    due: now + order,
    stability: memory.s ?? (card.type === 3 ? Math.max(0.5, ivl / 4) : 0.5),
    difficulty,
    scheduledDays: 0,
    elapsedDays: 0,
    learningSteps: 0,
    reps: card.reps,
    lapses: card.lapses,
    lastReview: now - DAY,
    suspended,
  };
}

export const ankiDeckName = (full: string) => full.split('::').pop()!.trim() || full;
