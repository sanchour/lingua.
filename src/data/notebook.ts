import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { LinguaDB } from './db';
import type { LibraryItem, NotebookNote, SavedPhrase } from '@/core/notebook/library';
import { NOTE_KINDS, PHRASE_KINDS } from '@/core/notebook/library';
import { addNote, createDeck } from './decks';

type Kind = 'phrasebook' | 'notebook';
type Item<K extends Kind> = K extends 'phrasebook' ? SavedPhrase : NotebookNote;
const prefix = (kind: Kind, lang: string) => `${kind}.item:${lang}:`;
function validBase(v: unknown, lang: string): v is LibraryItem {
  if (!v || typeof v !== 'object') return false;
  const r = v as LibraryItem;
  return typeof r.id === 'string' && r.id.length > 0 && r.id.length <= 100 && r.lang === lang && typeof r.title === 'string' && r.title.length <= 200 && typeof r.folder === 'string' && r.folder.length <= 120 && Array.isArray(r.tags) && r.tags.length <= 20 && r.tags.every((t) => typeof t === 'string' && t.length <= 80) && Number.isFinite(r.createdAt) && Number.isFinite(r.updatedAt) && (r.deletedAt === undefined || Number.isFinite(r.deletedAt));
}
function validate(kind: Kind, value: unknown, lang: string): void {
  if (!validBase(value, lang)) throw new Error('This saved item is invalid. It has not been changed.');
  if (kind === 'phrasebook') {
    const p = value as SavedPhrase;
    if (!PHRASE_KINDS.includes(p.kind) || !p.text?.trim() || p.text.length > 4000 || !['translation', 'situation', 'topic', 'formal', 'informal', 'notes', 'source'].every((k) => typeof p[k as keyof SavedPhrase] === 'string' && String(p[k as keyof SavedPhrase]).length <= 10000) || (p.audioBlobId !== undefined && typeof p.audioBlobId !== 'string')) throw new Error('Use a phrase under 4,000 characters and fields under 10,000.');
  } else {
    const n = value as NotebookNote;
    if (!NOTE_KINDS.includes(n.kind) || typeof n.body !== 'string' || n.body.length > 100000 || !Array.isArray(n.links) || n.links.length > 50 || n.links.some((l) => !l || !['word', 'grammar', 'lesson', 'text', 'note'].includes(l.kind) || typeof l.target !== 'string' || !l.target || l.target.length > 300 || typeof l.label !== 'string' || l.label.length > 200)) throw new Error('Use a note under 100,000 characters and at most 50 valid links.');
  }
}
export async function listLibrary<K extends Kind>(kind: K, lang: string, database: LinguaDB = db): Promise<Item<K>[]> {
  const rows = await database.settings.where('key').startsWith(prefix(kind, lang)).toArray();
  return rows.map((r) => { validate(kind, r.value, lang); return r.value as Item<K>; }).filter((r) => !r.deletedAt);
}
export async function saveLibrary<K extends Kind>(kind: K, item: Item<K>, audio?: Blob, database: LinguaDB = db): Promise<Item<K>> {
  validate(kind, item, item.lang);
  if (audio && (!audio.type.startsWith('audio/') || audio.size > 20 * 1024 * 1024)) throw new Error('Choose an audio file under 20 MB.');
  const saved = { ...item, updatedAt: Date.now() };
  if (audio && kind === 'phrasebook') (saved as SavedPhrase).audioBlobId = crypto.randomUUID();
  await database.transaction('rw', database.settings, database.blobs, async () => {
    if (audio && kind === 'phrasebook') await database.blobs.add({ id: (saved as SavedPhrase).audioBlobId!, kind: 'audio', mime: audio.type, size: audio.size, blob: audio, createdAt: saved.updatedAt });
    await database.settings.put({ key: prefix(kind, item.lang) + item.id, value: saved, updatedAt: saved.updatedAt });
  });
  return saved;
}
export async function removeLibrary<K extends Kind>(kind: K, item: Item<K>, database: LinguaDB = db): Promise<void> {
  await saveLibrary(kind, { ...item, deletedAt: Date.now() }, undefined, database);
}
export function newPhrase(lang: string, text = '', translation = '', source = ''): SavedPhrase {
  return { id: crypto.randomUUID(), lang, title: text.slice(0, 200), text, translation, source, kind: 'General', situation: '', topic: '', formal: '', informal: '', notes: '', folder: '', tags: [], createdAt: Date.now(), updatedAt: Date.now() };
}
export async function phraseToCard(phrase: SavedPhrase, database: LinguaDB = db): Promise<string> {
  const name = 'From my phrasebook';
  const deck = await database.decks.where('lang').equals(phrase.lang).filter((d) => !d.deletedAt && d.name === name).first();
  const deckId = deck?.id ?? await createDeck(phrase.lang, { name }, database);
  const existing = await database.notes.where('deckId').equals(deckId).filter((n) => !n.deletedAt && n.extra?.phrasebookId === phrase.id).first();
  if (existing) return deckId;
  await addNote(deckId, { term: phrase.text, meaning: phrase.translation, tags: ['phrase', ...phrase.tags], audioBlobId: phrase.audioBlobId, extra: { phrasebookId: phrase.id, source: phrase.source, notes: phrase.notes } }, database);
  return deckId;
}

export function useLibrary<K extends Kind>(kind: K, lang: string) {
  return useLiveQuery(async () => { try { return { items: await listLibrary(kind, lang), error: '' }; } catch (e) { return { items: [] as Item<K>[], error: e instanceof Error ? e.message : 'Could not read the saved library.' }; } }, [kind, lang]);
}

export function newNotebookNote(lang: string): NotebookNote {
  return { id: crypto.randomUUID(), lang, title: '', body: '', kind: 'Free note', folder: '', tags: [], links: [], createdAt: Date.now(), updatedAt: Date.now() };
}
