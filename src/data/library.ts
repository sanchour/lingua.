import { useLiveQuery } from 'dexie-react-hooks';
import { toGoodreadsCsv } from '@/core/parsers/goodreads';
import type { GoodreadsBook } from '@/core/parsers/goodreads';
import { estimateLevel } from '@/core/lang/levels';
import { splitIntoParts } from '@/core/parsers/text';
import type { ChapterDraft } from '@/core/parsers/text';
import { countWords, tokenize } from '@/core/text/tokenizer';
import { ensureLexicon } from '@/services/packs/lexicon';
import { localDateKey } from '@/lib/format';
import { db } from './db';
import type { LinguaDB } from './db';
import type { BlobRow, Block, Chapter, ReadingProgress, Text, TextStats, TextVocab } from './types';
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
  level?: Text['level'];
  sourceUrl?: string;
  coverUrl?: string;
}

/** A text's chapters in reading order, without removed ones. */
export async function textChapters(textId: string, database: LinguaDB = db): Promise<Chapter[]> {
  return (await database.chapters.where('[textId+index]').between([textId, 0], [textId, Infinity]).toArray()).filter((c) => !c.deletedAt);
}

/** Counts distinct normalised forms across all text blocks (yields between chapters). */
async function buildVocab(textId: string, lang: string, chapters: Array<Pick<Chapter, 'blocks'>>): Promise<TextVocab> {
  await ensureLexicon(lang);
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
  await ensureLexicon(input.lang);
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
    level: input.level,
    sourceUrl: input.sourceUrl,
    coverUrl: input.coverUrl,
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
    vocab = await buildVocab(textId, text.lang, await textChapters(textId, database));
    await database.textVocab.put(vocab);
  }
  const words = await database.words.bulkGet(vocab.norms.map((n) => wordId(text.lang, n)));
  const ranks = await database.frequency.bulkGet(vocab.norms.map((n) => `${text.lang}:${n}`));
  let knownTokens = 0;
  let newWords = 0;
  words.forEach((w, i) => {
    if (w && !w.deletedAt && w.state) knownTokens += vocab!.counts[i];
    else newWords++;
  });
  const level = estimateLevel(ranks.map((r, i) => [r?.rank, vocab!.counts[i]]));
  const stats: TextStats = { uniqueWords: vocab.norms.length, knownShare: vocab.tokens ? knownTokens / vocab.tokens : 0, newWords, level, computedAt: Date.now() };
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
  return database.chapters
    .where('[textId+index]')
    .equals([textId, index])
    .filter((c) => !c.deletedAt)
    .first();
}

/** A comic page's speech bubbles, once read, as its text: the page's picture first, then each bubble. */
export async function setPageBubbles(textId: string, index: number, bubbles: Array<{ text: string; box: [number, number, number, number] }>, database: LinguaDB = db): Promise<Chapter | undefined> {
  const text = await database.texts.get(textId);
  const chapter = await getChapter(textId, index, database);
  if (!text || !chapter) return undefined;
  await ensureLexicon(text.lang);
  const now = Date.now();
  const blocks: Block[] = [...chapter.blocks.filter((b) => b.t === 'img'), ...bubbles.map((b) => ({ t: 'p' as const, text: b.text, box: b.box }))];
  const wordCount = bubbles.reduce((n, b) => n + countWords(b.text, text.lang), 0);
  const next: Chapter = { ...chapter, blocks, wordCount, readAt: now, updatedAt: now };
  await database.transaction('rw', [database.texts, database.chapters, database.textVocab], async () => {
    await database.chapters.put(next);
    await database.texts.update(textId, { wordCount: Math.max(0, text.wordCount - chapter.wordCount) + wordCount, updatedAt: now });
    // The comic's words are counted again from its pages when next needed.
    await database.textVocab.delete(textId);
  });
  return next;
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

export async function updateText(textId: string, patch: Partial<Pick<Text, 'title' | 'author' | 'shelf' | 'finishedAt' | 'cover' | 'level'>>, database: LinguaDB = db): Promise<void> {
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

export interface ChapterEdit {
  /** The chapter being kept or edited; none for a new one. */
  id?: string;
  title?: string;
  blocks: Block[];
}

const sameBlocks = (a: Block[], b: Block[]) => JSON.stringify(a) === JSON.stringify(b);
const imagesOf = (blocks: Block[]) => blocks.flatMap((b) => (b.t === 'img' ? [b.blobId] : []));

/**
 * Replaces a text's chapters with `list`, in order: untouched chapters keep their row, edited ones are
 * updated in place, new ones are added (long ones split into parts, as on import) and the rest become
 * tombstones. Pictures nothing uses any more are deleted. Counts, vocabulary and stats follow, and a
 * reading position past the end moves to the last chapter.
 */
export async function rewriteChapters(textId: string, list: ChapterEdit[], images: NonNullable<NewText['images']> = [], database: LinguaDB = db): Promise<void> {
  const text = await database.texts.get(textId);
  if (!text) throw new Error('This text isn’t in your library.');
  const current = await textChapters(textId, database);
  const byId = new Map(current.map((c) => [c.id, c]));
  const count = (t: string) => countWords(t, text.lang);
  const now = Date.now();

  const next: Chapter[] = [];
  const writes: Chapter[] = [];
  for (const edit of list) {
    const old = edit.id ? byId.get(edit.id) : undefined;
    if (old && old.title === edit.title && sameBlocks(old.blocks, edit.blocks)) {
      const kept = { ...old, index: next.length };
      next.push(kept);
      if (old.index !== kept.index) writes.push({ ...kept, updatedAt: now });
      continue;
    }
    const parts = splitIntoParts({ title: edit.title, blocks: edit.blocks }, count);
    parts.forEach((part, i) => {
      const row: Chapter = {
        id: i === 0 && old ? old.id : crypto.randomUUID(),
        textId,
        index: next.length,
        title: part.title,
        part: parts.length > 1 ? [i + 1, parts.length] : undefined,
        wordCount: part.wordCount,
        blocks: part.blocks,
        updatedAt: now,
      };
      next.push(row);
      writes.push(row);
    });
  }
  const keptIds = new Set(next.map((c) => c.id));
  const removed = current.filter((c) => !keptIds.has(c.id));
  const stillUsed = new Set([...next.flatMap((c) => imagesOf(c.blocks)), ...images.map((i) => i.id)]);
  const unusedImages = [...new Set(current.flatMap((c) => imagesOf(c.blocks)))].filter((id) => !stillUsed.has(id));

  await database.transaction('rw', [database.texts, database.chapters, database.blobs, database.textVocab, database.readingProgress], async () => {
    await database.chapters.bulkPut([...writes, ...removed.map((c) => ({ ...c, blocks: [], wordCount: 0, deletedAt: now, updatedAt: now }))]);
    if (images.length) await database.blobs.bulkPut(images.map((img) => ({ id: img.id, kind: 'image' as const, mime: img.mime, size: img.blob.size, blob: img.blob, createdAt: now })));
    if (unusedImages.length) await database.blobs.bulkDelete(unusedImages);
    await database.texts.update(textId, { chapterCount: next.length, wordCount: next.reduce((n, c) => n + c.wordCount, 0), stats: undefined, updatedAt: now });
    await database.textVocab.delete(textId);
    const progress = await database.readingProgress.get(textId);
    if (progress && progress.chapterIndex >= next.length) {
      await database.readingProgress.put({ ...progress, chapterIndex: Math.max(0, next.length - 1), blockIndex: 0, updatedAt: now });
    }
  });
  await refreshTextStats(textId, database);
}

/** Adds chapters (from a pasted text or a file) after the last one. */
export async function appendChapters(textId: string, drafts: ChapterDraft[], images: NewText['images'] = [], database: LinguaDB = db): Promise<void> {
  const current = await textChapters(textId, database);
  await rewriteChapters(textId, [...current.map((c) => ({ id: c.id, title: c.title, blocks: c.blocks })), ...drafts], images, database);
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

/** Books finished in Lingua, as a CSV for Goodreads' importer. */
export async function finishedBooksCsv(database: LinguaDB = db): Promise<{ file: File; count: number }> {
  const texts = (await database.texts.toArray()).filter((t) => !t.deletedAt && t.finishedAt && t.kind !== 'shelfItem');
  const csv = toGoodreadsCsv(
    texts.map((t) => ({ title: t.title, author: t.author, isbn13: t.goodreads?.isbn13, bookId: t.goodreads?.bookId, rating: t.goodreads?.rating, finishedAt: t.finishedAt!, addedAt: t.createdAt, lang: t.lang })),
  );
  return { file: new File([csv], `lingua-finished-books-${localDateKey()}.csv`, { type: 'text/csv' }), count: texts.length };
}
