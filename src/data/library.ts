import { useLiveQuery } from 'dexie-react-hooks';
import type { GoodreadsBook } from '@/core/parsers/goodreads';
import { splitIntoParts } from '@/core/parsers/text';
import type { ChapterDraft } from '@/core/parsers/text';
import { countWords, tokenize } from '@/core/text/tokenizer';
import { db } from './db';
import type { LinguaDB } from './db';
import type { BlobRow, Chapter, ReadingProgress, Text, TextStats, TextVocab } from './types';
import { wordId } from './words';

const yieldToBrowser = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export interface NewText {
  lang: string;
  title: string;
  author?: string;
  kind: Text['kind'];
  source: Text['source'];
  chapters: ChapterDraft[];
  cover?: { blob: Blob; mime: string };
  /** A designed cover when there is no picture. */
  coverDesign?: Text['cover'];
  images?: Array<{ id: string; blob: Blob; mime: string }>;
  shelf?: Text['shelf'];
}

/** Counts distinct normalised forms across all text blocks (yields between chapters). */
async function buildVocab(textId: string, lang: string, chapters: Array<Pick<Chapter, 'blocks'>>): Promise<TextVocab> {
  const counts = new Map<string, number>();
  let tokens = 0;
  for (const chapter of chapters) {
    for (const block of chapter.blocks) {
      if (block.t === 'img') continue;
      for (const t of tokenize(block.text, lang)) {
        if (!t.isWord) continue;
        tokens++;
        counts.set(t.norm!, (counts.get(t.norm!) ?? 0) + 1);
      }
    }
    await yieldToBrowser();
  }
  return { textId, lang, norms: [...counts.keys()], counts: [...counts.values()], tokens };
}

/** Adds a book or text: chapters (split into parts), images, vocabulary. Returns the text id. */
export async function addText(input: NewText, database: LinguaDB = db): Promise<string> {
  const id = crypto.randomUUID();
  const now = Date.now();
  const count = (text: string) => countWords(text, input.lang);

  const chapters: Chapter[] = [];
  for (const draft of input.chapters) {
    const parts = splitIntoParts(draft, count);
    parts.forEach((part, i) => {
      chapters.push({
        id: crypto.randomUUID(),
        textId: id,
        index: chapters.length,
        title: part.title,
        part: parts.length > 1 ? [i + 1, parts.length] : undefined,
        wordCount: part.wordCount,
        blocks: part.blocks,
      });
    });
    await yieldToBrowser();
  }

  const blobs: BlobRow[] = (input.images ?? []).map((img) => ({ id: img.id, kind: 'image', mime: img.mime, size: img.blob.size, blob: img.blob, createdAt: now }));
  let coverBlobId: string | undefined;
  if (input.cover) {
    coverBlobId = crypto.randomUUID();
    blobs.push({ id: coverBlobId, kind: 'cover', mime: input.cover.mime, size: input.cover.blob.size, blob: input.cover.blob, createdAt: now });
  }

  const vocab = await buildVocab(id, input.lang, chapters);
  const text: Text = {
    id,
    lang: input.lang,
    kind: input.kind,
    source: input.source,
    title: input.title.trim() || 'Untitled',
    author: input.author?.trim() || undefined,
    coverBlobId,
    cover: input.coverDesign,
    shelf: input.shelf ?? 'reading',
    chapterCount: chapters.length,
    wordCount: chapters.reduce((sum, c) => sum + c.wordCount, 0),
    createdAt: now,
    updatedAt: now,
  };

  await database.transaction('rw', [database.texts, database.chapters, database.blobs, database.textVocab], async () => {
    await database.texts.add(text);
    await database.chapters.bulkAdd(chapters);
    if (blobs.length) await database.blobs.bulkAdd(blobs);
    await database.textVocab.put(vocab);
  });
  await refreshTextStats(id, database);
  return id;
}

/** Goodreads shelf rows become library entries without text; an EPUB can be attached later. */
export async function addShelfItems(lang: string, books: GoodreadsBook[], database: LinguaDB = db): Promise<number> {
  const existing = new Set((await database.texts.where('lang').equals(lang).toArray()).map((t) => t.goodreads?.bookId).filter(Boolean));
  const now = Date.now();
  const rows: Text[] = books
    .filter((b) => !b.bookId || !existing.has(b.bookId))
    .map((b, i) => ({
      id: crypto.randomUUID(),
      lang,
      kind: 'shelfItem',
      source: 'goodreads',
      title: b.title,
      author: b.author,
      shelf: b.shelf,
      goodreads: { bookId: b.bookId, isbn13: b.isbn13, rating: b.rating, dateRead: b.dateRead, shelves: b.shelves },
      chapterCount: 0,
      wordCount: 0,
      createdAt: now + i,
      updatedAt: now + i,
    }));
  await database.texts.bulkAdd(rows);
  return rows.length;
}

/** Comprehension of a text: share of running words already Known/Learning, and unseen forms left. */
export async function refreshTextStats(textId: string, database: LinguaDB = db): Promise<TextStats | undefined> {
  const text = await database.texts.get(textId);
  if (!text || text.kind === 'shelfItem') return undefined;
  let vocab = await database.textVocab.get(textId);
  if (!vocab) {
    vocab = await buildVocab(textId, text.lang, await database.chapters.where('[textId+index]').between([textId, 0], [textId, Infinity]).toArray());
    await database.textVocab.put(vocab);
  }
  const words = await database.words.bulkGet(vocab.norms.map((n) => wordId(text.lang, n)));
  let knownTokens = 0;
  let newWords = 0;
  words.forEach((w, i) => {
    if (w && !w.deletedAt && w.state) knownTokens += vocab!.counts[i];
    else newWords++;
  });
  const stats: TextStats = { uniqueWords: vocab.norms.length, knownShare: vocab.tokens ? knownTokens / vocab.tokens : 0, newWords, computedAt: Date.now() };
  await database.texts.update(textId, { stats });
  return stats;
}

export function useLibrary(lang: string): Text[] | undefined {
  return useLiveQuery(
    async () =>
      (await db.texts.where('lang').equals(lang).toArray())
        .filter((t) => !t.deletedAt)
        .sort((a, b) => (b.lastOpenedAt ?? b.createdAt) - (a.lastOpenedAt ?? a.createdAt)),
    [lang],
  );
}

export function useText(id: string | undefined): Text | null | undefined {
  return useLiveQuery(async () => (id ? ((await db.texts.get(id)) ?? null) : null), [id]);
}

export function getChapter(textId: string, index: number, database: LinguaDB = db): Promise<Chapter | undefined> {
  return database.chapters.where('[textId+index]').equals([textId, index]).first();
}

export function useProgress(textId: string | undefined): ReadingProgress | null | undefined {
  return useLiveQuery(async () => (textId ? ((await db.readingProgress.get(textId)) ?? null) : null), [textId]);
}

export function useAllProgress(): Map<string, ReadingProgress> | undefined {
  return useLiveQuery(async () => new Map((await db.readingProgress.toArray()).map((p) => [p.textId, p])), []);
}

export async function saveProgress(progress: Omit<ReadingProgress, 'updatedAt'>, database: LinguaDB = db): Promise<void> {
  await database.readingProgress.put({ ...progress, updatedAt: Date.now() });
}

export async function markOpened(textId: string, database: LinguaDB = db): Promise<void> {
  await database.texts.update(textId, { lastOpenedAt: Date.now(), updatedAt: Date.now(), shelf: 'reading' });
}

export async function updateText(textId: string, patch: Partial<Pick<Text, 'title' | 'author' | 'shelf' | 'finishedAt' | 'cover'>>, database: LinguaDB = db): Promise<void> {
  await database.texts.update(textId, { ...patch, updatedAt: Date.now() });
}

/** Gives a text a picture of its own as cover (replacing any earlier one). */
export async function setCoverImage(textId: string, image: Blob, database: LinguaDB = db): Promise<void> {
  await database.transaction('rw', database.texts, database.blobs, async () => {
    const text = await database.texts.get(textId);
    if (text?.coverBlobId) await database.blobs.delete(text.coverBlobId);
    const id = crypto.randomUUID();
    await database.blobs.add({ id, kind: 'cover', mime: image.type || 'image/jpeg', size: image.size, blob: image, createdAt: Date.now() });
    await database.texts.update(textId, { coverBlobId: id, updatedAt: Date.now() });
  });
}

/** Back to a designed cover. */
export async function removeCoverImage(textId: string, database: LinguaDB = db): Promise<void> {
  await database.transaction('rw', database.texts, database.blobs, async () => {
    const text = await database.texts.get(textId);
    if (text?.coverBlobId) await database.blobs.delete(text.coverBlobId);
    await database.texts.update(textId, { coverBlobId: undefined, updatedAt: Date.now() });
  });
}

/** Removes a text: the row is kept as a tombstone (so backups merge correctly); its content is deleted. */
export async function deleteText(textId: string, database: LinguaDB = db): Promise<void> {
  await database.transaction('rw', [database.texts, database.chapters, database.textVocab, database.readingProgress, database.blobs], async () => {
    const text = await database.texts.get(textId);
    const chapters = await database.chapters.where('[textId+index]').between([textId, 0], [textId, Infinity]).toArray();
    const imageIds = chapters.flatMap((c) => c.blocks.flatMap((b) => (b.t === 'img' ? [b.blobId] : [])));
    await database.blobs.bulkDelete([...imageIds, ...(text?.coverBlobId ? [text.coverBlobId] : [])]);
    await database.chapters.bulkDelete(chapters.map((c) => c.id));
    await database.textVocab.delete(textId);
    await database.readingProgress.delete(textId);
    await database.texts.update(textId, { deletedAt: Date.now(), updatedAt: Date.now() });
  });
}

/** Object URL for a stored image (revoked by the caller). */
export async function blobUrl(blobId: string, database: LinguaDB = db): Promise<string | null> {
  const row = await database.blobs.get(blobId);
  return row ? URL.createObjectURL(row.blob) : null;
}
