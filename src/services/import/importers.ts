import { parseGoodreadsCsv } from '@/core/parsers/goodreads';
import { groupKindleByBook, looksLikeKindleClippings, parseKindleClippings } from '@/core/parsers/kindle';
import { parseMarkdownDocument } from '@/core/parsers/markdownImport';
import { looksTimed, parseSubtitles } from '@/core/parsers/subtitles';
import { decodeText, textToChapters } from '@/core/parsers/text';
import type { ChapterDraft } from '@/core/parsers/text';
import { SAMPLES } from '@/core/lang/samples';
import { db } from '@/data/db';
import { addShelfItems, addText, deleteText } from '@/data/library';
import type { NewText } from '@/data/library';
import type { Text } from '@/data/types';
import { parseEpub } from './epub';
import { parsePdf } from './pdf';

/** The books Lingua can read from a file. */
export const BOOK_FILE_ACCEPT = '.epub,application/epub+zip,.pdf,application/pdf,.txt,.md,.srt,.vtt,text/plain,text/markdown,text/vtt';

export function bookFileKind(file: File): 'epub' | 'pdf' | 'txt' | null {
  if (/\.epub$/i.test(file.name) || file.type === 'application/epub+zip') return 'epub';
  if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') return 'pdf';
  if (/\.(txt|md|markdown|srt|vtt)$/i.test(file.name) || file.type.startsWith('text/')) return 'txt';
  return null;
}

export interface PasteExtras {
  author?: string;
  level?: Text['level'];
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
    level: extras.level,
    coverDesign: extras.coverDesign,
    cover: extras.coverImage ? { blob: extras.coverImage, mime: extras.coverImage.type || 'image/jpeg' } : undefined,
  });
}

export function parseRichTextChapters(text: string, fallbackTitle: string, isMarkdown = false): { title: string; kind: Text['kind']; chapters: ChapterDraft[] } {
  if (looksLikeKindleClippings(text)) {
    const groups = groupKindleByBook(parseKindleClippings(text));
    if (groups.length > 0) {
      const chapters: ChapterDraft[] = groups.map((g) => ({
        title: g.author ? `${g.bookTitle} (${g.author})` : g.bookTitle,
        blocks: [
          { t: 'h' as const, text: g.author ? `${g.bookTitle} — ${g.author}` : g.bookTitle },
          ...g.clippings.map((c) => ({ t: (c.kind === 'note' ? 'p' : 'quote') as 'p' | 'quote', text: c.text })),
        ],
      }));
      return { title: groups.length === 1 ? groups[0].bookTitle : 'Kindle Clippings', kind: chapters.length > 1 ? 'book' : 'article', chapters };
    }
  }
  if (looksTimed(text)) {
    const cues = parseSubtitles(text);
    if (cues.length > 0) {
      return {
        title: fallbackTitle,
        kind: 'transcript',
        chapters: [{ title: fallbackTitle, blocks: cues.map((c, idx) => ({ t: 'p' as const, text: c.text, cue: idx })) }],
      };
    }
  }
  if (isMarkdown || /^---\r?\n/.test(text) || /\[\[[^[\]]+\]\]/.test(text)) {
    const md = parseMarkdownDocument(text, fallbackTitle);
    if (md.chapters.length > 0) {
      return { title: md.title || fallbackTitle, kind: md.chapters.length > 1 ? 'book' : 'article', chapters: md.chapters };
    }
  }
  const chapters = textToChapters(text, fallbackTitle);
  return { title: fallbackTitle, kind: chapters.length > 1 ? 'book' : 'article', chapters };
}

export async function importTxtFile(lang: string, file: File): Promise<string> {
  const text = decodeText(new Uint8Array(await file.arrayBuffer()), lang);
  const rawTitle = file.name.replace(/\.(txt|md|markdown|srt|vtt)$/i, '');
  const isMd = /\.(md|markdown)$/i.test(file.name);
  const parsed = parseRichTextChapters(text, rawTitle, isMd);
  if (!parsed.chapters.length) throw new Error('This file is empty.');
  return addText({ lang, title: parsed.title, kind: parsed.kind, source: 'txt', chapters: parsed.chapters });
}

export async function importEpubFile(lang: string, file: File, onProgress?: (fraction: number) => void): Promise<string> {
  const book = await parseEpub(file, onProgress);
  return addText({ lang, title: book.title, author: book.author, kind: 'book', source: 'epub', chapters: book.chapters, cover: book.cover, images: book.images });
}

export async function importPdfFile(lang: string, file: File, onProgress?: (fraction: number) => void, level?: Text['level']): Promise<string> {
  const pdf = await parsePdf(file, onProgress);
  if (!pdf.chapters.length) throw new Error('No text was found in this PDF. If it’s a comic or a scan, add it with “Choose a comic”: Lingua reads its pages.');
  return addText({ lang, title: pdf.title, author: pdf.author, kind: 'book', source: 'pdf', chapters: pdf.chapters, level });
}

/** Any supported book file. */
export async function importBookFile(lang: string, file: File, onProgress?: (fraction: number) => void): Promise<string> {
  const kind = bookFileKind(file);
  if (kind === 'epub') return importEpubFile(lang, file, onProgress);
  if (kind === 'pdf') return importPdfFile(lang, file, onProgress);
  if (kind === 'txt') return importTxtFile(lang, file);
  throw new Error('Lingua reads DRM-free EPUB books, PDFs with text, and plain text files.');
}

/** A file's chapters (and pictures), to add to a text that already exists. */
export async function readFileChapters(lang: string, file: File, onProgress?: (fraction: number) => void): Promise<{ chapters: ChapterDraft[]; images: NonNullable<NewText['images']> }> {
  const kind = bookFileKind(file);
  if (kind === 'epub') {
    const book = await parseEpub(file, onProgress);
    return { chapters: book.chapters, images: book.images ?? [] };
  }
  if (kind === 'pdf') return { chapters: (await parsePdf(file, onProgress)).chapters, images: [] };
  if (kind === 'txt') return { chapters: textToChapters(decodeText(new Uint8Array(await file.arrayBuffer()), lang), file.name.replace(/\.txt$/i, '')), images: [] };
  throw new Error('Lingua reads DRM-free EPUB books, PDFs with text, and plain text files.');
}

/** A Goodreads shelf item's book has come in (an EPUB, a free edition): it keeps the shelf, rating and cover, and the item goes. */
export async function adoptShelfItem(item: Text, id: string): Promise<void> {
  const book = await db.texts.get(id);
  const cover = !book?.coverBlobId && !book?.coverUrl && item.coverUrl ? { coverUrl: item.coverUrl } : {};
  await db.texts.update(id, { goodreads: item.goodreads, shelf: item.shelf === 'read' ? 'read' : 'reading', author: book?.author ?? item.author, ...cover, updatedAt: Date.now() });
  await deleteText(item.id);
}

/** Gives a Goodreads shelf item its text: the EPUB becomes the book. */
export async function attachEpub(item: Text, file: File): Promise<string> {
  const id = await importEpubFile(item.lang, file);
  await adoptShelfItem(item, id);
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
