// Comics into Codex: a CBZ (or a CBR made as a zip), a folder or a handful of page pictures, or a
// PDF drawn page by page. Each page is kept as a picture on the device and becomes one chapter;
// its speech bubbles are read as the comic is read (services/comics/ocr.ts).
import { addText } from '@/data/library';
import { loadPdfJs } from './pdf';

export const COMIC_FILE_ACCEPT = '.cbz,.cbr,.zip,application/zip,application/vnd.comicbook+zip,application/vnd.comicbook-rar,.pdf,application/pdf,image/*';

const IMAGE = /\.(jpe?g|png|webp|gif|avif|bmp)$/i;
const MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif', bmp: 'image/bmp' };
export const mimeOf = (name: string) => MIME[name.split('.').pop()!.toLowerCase()] ?? 'image/jpeg';
const natural = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export class ComicError extends Error {}

export type ComicSource = 'archive' | 'pdf' | 'images';

export function comicSource(files: File[]): ComicSource | null {
  if (!files.length) return null;
  if (files.length === 1 && /\.(cbz|cbr|zip)$/i.test(files[0].name)) return 'archive';
  if (files.length === 1 && (/\.pdf$/i.test(files[0].name) || files[0].type === 'application/pdf')) return 'pdf';
  if (files.every((f) => IMAGE.test(f.name) || f.type.startsWith('image/'))) return 'images';
  return null;
}

/** "Astérix_01_-_Astérix_le_Gaulois.cbz" → "Astérix 01 - Astérix le Gaulois". */
export function comicTitle(name: string): string {
  return (
    name
      .replace(/\.[a-z0-9]{2,4}$/i, '')
      .replace(/[_.]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'Comic'
  );
}

/** Page pictures in reading order: by name, with numbers counted as numbers (2 before 10). */
export function pageOrder<T extends { name: string }>(entries: T[]): T[] {
  return entries.filter((e) => IMAGE.test(e.name) && !/(^|\/)(__MACOSX\/|\.)/.test(e.name)).sort((a, b) => natural.compare(a.name, b.name));
}

interface Page {
  blob: Blob;
  mime: string;
  w: number;
  h: number;
}

export async function page(blob: Blob, mime: string): Promise<Page | null> {
  try {
    const bitmap = await createImageBitmap(blob);
    const size = { w: bitmap.width, h: bitmap.height };
    bitmap.close();
    return { blob, mime, ...size };
  } catch {
    return null; // Not a picture this browser can show.
  }
}

async function fromArchive(file: File, onProgress?: (fraction: number) => void): Promise<Page[]> {
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (head[0] !== 0x50 || head[1] !== 0x4b) {
    if (head[0] === 0x52 && head[1] === 0x61 && head[2] === 0x72) {
      throw new ComicError('This CBR is a RAR archive, which a browser can’t open. Turn it into a CBZ first (Calibre or any archive app can), then add that.');
    }
    throw new ComicError('This file isn’t a comic archive Lingua can open.');
  }
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(file);
  const entries = pageOrder(Object.values(zip.files).filter((e) => !e.dir));
  const pages: Page[] = [];
  for (const [i, entry] of entries.entries()) {
    const mime = mimeOf(entry.name);
    const p = await page(new Blob([await entry.async('arraybuffer')], { type: mime }), mime);
    if (p) pages.push(p);
    onProgress?.((i + 1) / entries.length);
  }
  return pages;
}

async function fromImages(files: File[], onProgress?: (fraction: number) => void): Promise<Page[]> {
  const ordered = pageOrder(files.map((file) => ({ name: file.webkitRelativePath || file.name, file })));
  const pages: Page[] = [];
  for (const [i, { file }] of ordered.entries()) {
    const p = await page(file, file.type || mimeOf(file.name));
    if (p) pages.push(p);
    onProgress?.((i + 1) / ordered.length);
  }
  return pages;
}

/** Each page of a PDF drawn as a picture about 1600 pixels wide. */
async function fromPdf(file: File, onProgress?: (fraction: number) => void): Promise<Page[]> {
  const pdfjs = await loadPdfJs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: Page[] = [];
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const pdfPage = await doc.getPage(n);
      const width = pdfPage.getViewport({ scale: 1 }).width;
      const viewport = pdfPage.getViewport({ scale: Math.min(3, 1600 / width) });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await pdfPage.render({ canvas, viewport }).promise;
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new ComicError('A page of this PDF couldn’t be drawn.'))), 'image/jpeg', 0.86));
      pages.push({ blob, mime: 'image/jpeg', w: canvas.width, h: canvas.height });
      pdfPage.cleanup();
      onProgress?.(n / doc.numPages);
    }
  } finally {
    await doc.destroy();
  }
  return pages;
}

/** Adds a comic to the library: one chapter per page, the first page as its cover. */
export async function importComic(lang: string, files: File[], onProgress?: (fraction: number) => void): Promise<string> {
  const source = comicSource(files);
  if (!source) throw new ComicError('Lingua opens comics as CBZ (or CBR made as zip) files, PDFs, or the pages’ pictures.');
  const pages = source === 'archive' ? await fromArchive(files[0], onProgress) : source === 'pdf' ? await fromPdf(files[0], onProgress) : await fromImages(files, onProgress);
  if (!pages.length) throw new ComicError('No pages (pictures) were found to make a comic of.');
  const folder = files[0].webkitRelativePath.split('/')[0];
  const title = source === 'images' ? comicTitle(folder || files[0].name.replace(/[\s_-]*\d+(\.[a-z]+)$/i, '$1')) : comicTitle(files[0].name);
  const ids = pages.map(() => crypto.randomUUID());
  return addText({
    lang,
    title,
    kind: 'comic',
    source: 'comic',
    chapters: pages.map((p, i) => ({ title: `Page ${i + 1}`, blocks: [{ t: 'img' as const, blobId: ids[i], w: p.w, h: p.h }] })),
    images: pages.map((p, i) => ({ id: ids[i], blob: p.blob, mime: p.mime })),
    cover: { blob: pages[0].blob, mime: pages[0].mime },
  });
}
