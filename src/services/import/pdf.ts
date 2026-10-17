// PDFs read like books: pdf.js (loaded only when a PDF is opened) gives each page's text with its
// position; core/parsers/pdfText.ts rebuilds the paragraphs and chapters.
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { bodySizeOf, joinAcrossPages, linesToBlocks, pagesToChapters, piecesToLines, repeatedLines } from '@/core/parsers/pdfText';
import type { PdfPiece } from '@/core/parsers/pdfText';
import type { ChapterDraft } from '@/core/parsers/text';

export class PdfError extends Error {}

export interface ParsedPdf {
  title: string;
  author?: string;
  chapters: ChapterDraft[];
}

async function loadPdfJs() {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs;
}

/** The bookmarks' first level (or the level below a single "book" bookmark), as page starts. */
async function outlineStarts(doc: PDFDocumentProxy): Promise<Array<{ title: string; page: number }>> {
  let items = (await doc.getOutline().catch(() => null)) ?? [];
  if (items.length === 1 && items[0].items.length > 1) items = items[0].items;
  const starts: Array<{ title: string; page: number }> = [];
  for (const item of items) {
    try {
      const dest = typeof item.dest === 'string' ? await doc.getDestination(item.dest) : item.dest;
      const ref = dest?.[0];
      if (!ref) continue;
      const page = typeof ref === 'number' ? ref : await doc.getPageIndex(ref);
      starts.push({ title: item.title.trim(), page });
    } catch {
      // A broken bookmark is skipped.
    }
  }
  return starts.sort((a, b) => a.page - b.page);
}

const cleanTitle = (t: unknown) => (typeof t === 'string' ? t.replace(/^Microsoft Word - /i, '').replace(/\.(docx?|pdf)$/i, '').trim() : '');

export async function parsePdf(file: File, onProgress?: (fraction: number) => void): Promise<ParsedPdf> {
  const pdfjs = await loadPdfJs();
  let doc: PDFDocumentProxy;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  } catch (error) {
    if (error instanceof Error && error.name === 'PasswordException') throw new PdfError('This PDF is locked with a password. Open it elsewhere, save a copy without one, and try again.');
    throw new PdfError('This file couldn’t be read as a PDF.');
  }

  try {
    const pageLines = [];
    let characters = 0;
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      const pieces: PdfPiece[] = [];
      for (const item of content.items) {
        if (!('str' in item)) continue;
        const [, , c, d, x, y] = item.transform as number[];
        pieces.push({ str: item.str, x, y, width: item.width, size: Math.hypot(c, d) || item.height, eol: item.hasEOL });
        characters += item.str.trim().length;
      }
      pageLines.push(piecesToLines(pieces));
      page.cleanup();
      onProgress?.(n / doc.numPages);
    }
    if (characters < doc.numPages * 40) {
      throw new PdfError('This PDF is made of scanned pictures of pages, so there is no text in it to read. A PDF with real text (one where you can select words) works.');
    }

    const body = bodySizeOf(pageLines);
    const skip = repeatedLines(pageLines);
    const pages = joinAcrossPages(pageLines.map((lines) => linesToBlocks(lines, body, skip)));
    const chapters = pagesToChapters(pages, await outlineStarts(doc));
    const meta = (await doc.getMetadata().catch(() => null))?.info as { Title?: unknown; Author?: unknown } | undefined;
    return {
      title: cleanTitle(meta?.Title) || file.name.replace(/\.pdf$/i, ''),
      author: cleanTitle(meta?.Author) || undefined,
      chapters,
    };
  } finally {
    void doc.destroy();
  }
}
