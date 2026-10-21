// Photos or scans of a printed book's pages (5.1-3a): each page is read on this device with the
// comics' OCR and becomes paragraphs of text, with the photo beside them to check against.
import type { Block } from '@/data/types';
import { addText } from '@/data/library';
import { readPageText, stopOcr } from '@/services/comics/ocr';
import { comicTitle, mimeOf, page, pageOrder } from './comic';

/** Pages per chapter, so a long book opens at the page you were on rather than one long scroll. */
const PAGES_PER_CHAPTER = 10;

export const isPicture = (file: File) => file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|heic|avif)$/i.test(file.name);

/** `onProgress`: the share of pages read, and what is happening ("Reading page 3 of 12"). */
export async function importPagePhotos(lang: string, files: File[], onProgress?: (fraction: number, note: string) => void): Promise<string> {
  const ordered = pageOrder(files.filter(isPicture).map((file) => ({ name: file.webkitRelativePath || file.name, file })));
  if (!ordered.length) throw new Error('No photos of pages were found. Choose JPEG, PNG or WebP pictures, one per page.');
  const pages: Array<{ id: string; blob: Blob; mime: string; w: number; h: number; paragraphs: string[] }> = [];
  try {
    for (const [i, { file }] of ordered.entries()) {
      const note = `Reading page ${i + 1} of ${ordered.length}`;
      onProgress?.(i / ordered.length, note);
      const picture = await page(file, file.type || mimeOf(file.name));
      if (!picture) continue;
      const paragraphs = await readPageText(picture.blob, lang, (status, f) => onProgress?.((i + (status === 'reading' ? f : 0)) / ordered.length, status === 'loading' ? 'Getting the reader ready' : note));
      pages.push({ id: crypto.randomUUID(), ...picture, paragraphs });
    }
  } finally {
    stopOcr();
  }
  if (!pages.some((p) => p.paragraphs.length)) throw new Error('No text could be read on these pages. Photos taken straight on, in good light, read best.');

  const chapters = [];
  for (let start = 0; start < pages.length; start += PAGES_PER_CHAPTER) {
    const part = pages.slice(start, start + PAGES_PER_CHAPTER);
    const end = start + part.length;
    chapters.push({
      title: pages.length <= PAGES_PER_CHAPTER ? undefined : end - start === 1 ? `Page ${end}` : `Pages ${start + 1}–${end}`,
      blocks: part.flatMap((p): Block[] => [{ t: 'img', blobId: p.id, w: p.w, h: p.h }, ...p.paragraphs.map((text): Block => ({ t: 'p', text }))]),
    });
  }
  const folder = files[0].webkitRelativePath.split('/')[0];
  return addText({
    lang,
    title: comicTitle(folder || ordered[0].file.name.replace(/[\s_-]*\d+(\.[a-z]+)$/i, '$1')),
    kind: chapters.length > 1 ? 'book' : 'article',
    source: 'photos',
    chapters,
    images: pages.map((p) => ({ id: p.id, blob: p.blob, mime: p.mime })),
    cover: { blob: pages[0].blob, mime: pages[0].mime },
  });
}
