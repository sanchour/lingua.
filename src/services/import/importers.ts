import { parseGoodreadsCsv } from '@/core/parsers/goodreads';
import { decodeText, textToChapters } from '@/core/parsers/text';
import { SAMPLES } from '@/core/lang/samples';
import { db } from '@/data/db';
import { addShelfItems, addText, deleteText } from '@/data/library';
import type { Text } from '@/data/types';
import { parseEpub } from './epub';

export interface PasteExtras {
  author?: string;
  coverDesign?: Text['cover'];
  coverImage?: Blob;
}

export async function importPasted(lang: string, title: string, body: string, extras: PasteExtras = {}): Promise<string> {
  const chapters = textToChapters(body, title);
  if (!chapters.length) throw new Error('There is no text to import.');
  return addText({
    lang,
    title: title || chapters[0].blocks.find((b) => b.t !== 'img')?.text.slice(0, 60) || 'Untitled',
    author: extras.author,
    kind: chapters.length > 1 ? 'book' : 'article',
    source: 'paste',
    chapters,
    coverDesign: extras.coverDesign,
    cover: extras.coverImage ? { blob: extras.coverImage, mime: extras.coverImage.type || 'image/jpeg' } : undefined,
  });
}

export async function importTxtFile(lang: string, file: File): Promise<string> {
  const text = decodeText(new Uint8Array(await file.arrayBuffer()), lang);
  const title = file.name.replace(/\.txt$/i, '');
  const chapters = textToChapters(text, title);
  if (!chapters.length) throw new Error('This file is empty.');
  return addText({ lang, title, kind: chapters.length > 1 ? 'book' : 'article', source: 'txt', chapters });
}

export async function importEpubFile(lang: string, file: File, onProgress?: (fraction: number) => void): Promise<string> {
  const book = await parseEpub(file, onProgress);
  return addText({ lang, title: book.title, author: book.author, kind: 'book', source: 'epub', chapters: book.chapters, cover: book.cover, images: book.images });
}

/** Gives a Goodreads shelf item its text: the EPUB becomes the book, keeping shelf and rating. */
export async function attachEpub(item: Text, file: File): Promise<string> {
  const id = await importEpubFile(item.lang, file);
  await db.texts.update(id, { goodreads: item.goodreads, shelf: item.shelf === 'read' ? 'read' : 'reading', updatedAt: Date.now() });
  await deleteText(item.id);
  return id;
}

export async function importGoodreads(lang: string, file: File): Promise<number> {
  const books = parseGoodreadsCsv(await file.text());
  return addShelfItems(lang, books);
}

export async function importSample(lang: string): Promise<string> {
  const sample = SAMPLES[lang] ?? SAMPLES.en;
  return addText({
    lang,
    title: sample.title,
    author: 'Lingua',
    kind: 'article',
    source: 'paste',
    chapters: [{ title: sample.title, blocks: [{ t: 'h', text: sample.title }, ...sample.paragraphs.map((text) => ({ t: 'p' as const, text }))] }],
  });
}
