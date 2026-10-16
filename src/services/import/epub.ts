// EPUB → chapters of plain blocks. Lingua renders its own text (word-level interactivity), so the
// book's HTML/CSS is reduced to headings, paragraphs, quotes and images.
import JSZip from 'jszip';
import type { ChapterDraft } from '@/core/parsers/text';
import type { Block } from '@/data/types';

export interface ParsedEpub {
  title: string;
  author?: string;
  cover?: { blob: Blob; mime: string };
  chapters: ChapterDraft[];
  images: Array<{ id: string; blob: Blob; mime: string }>;
}

export class EpubError extends Error {}

const HEADINGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);
const TEXT_BLOCKS = new Set(['P', 'LI', 'DT', 'DD', 'PRE', 'FIGCAPTION', 'CAPTION', 'TD', 'TH']);
const CONTAINERS = new Set(['DIV', 'SECTION', 'ARTICLE', 'MAIN', 'BODY', 'ASIDE', 'HEADER', 'FOOTER', 'FIGURE', 'UL', 'OL', 'DL', 'TABLE', 'TBODY', 'THEAD', 'TR', 'NAV', 'SPAN', 'A', 'CENTER']);
const SKIP = new Set(['SCRIPT', 'STYLE', 'HEAD', 'NOSCRIPT', 'SUP']);
const MAX_IMAGE_BYTES = 4_000_000;

const yieldToBrowser = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const clean = (text: string) => text.replace(/\s+/g, ' ').trim();

function resolvePath(base: string, href: string): string {
  const parts = base.split('/').slice(0, -1);
  for (const seg of decodeURIComponent(href.split('#')[0]).split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.' && seg !== '') parts.push(seg);
  }
  return parts.join('/');
}

function parseXml(text: string, type: DOMParserSupportedType): Document {
  const doc = new DOMParser().parseFromString(text, type);
  if (type !== 'text/html' && doc.querySelector('parsererror')) return new DOMParser().parseFromString(text, 'text/html');
  return doc;
}

const byLocalName = (root: ParentNode, name: string) => Array.from(root.querySelectorAll('*')).filter((el) => el.localName === name);

function hasBlockChild(el: Element): boolean {
  return Array.from(el.children).some((c) => HEADINGS.has(c.tagName.toUpperCase()) || TEXT_BLOCKS.has(c.tagName.toUpperCase()) || c.tagName.toUpperCase() === 'DIV' || c.tagName.toUpperCase() === 'BLOCKQUOTE');
}

/** Walks a chapter document and collects blocks in reading order. */
function extractBlocks(body: Element, onImage: (src: string) => string | null): Block[] {
  const blocks: Block[] = [];
  const walk = (el: Element) => {
    const tag = el.tagName.toUpperCase();
    if (SKIP.has(tag)) return;
    if (tag === 'IMG' || tag === 'IMAGE') {
      const src = el.getAttribute('src') ?? el.getAttribute('xlink:href') ?? el.getAttribute('href');
      const blobId = src ? onImage(src) : null;
      if (blobId) blocks.push({ t: 'img', blobId, alt: el.getAttribute('alt') ?? undefined });
      return;
    }
    if (HEADINGS.has(tag)) {
      const text = clean(el.textContent ?? '');
      if (text) blocks.push({ t: 'h', text });
      return;
    }
    if (tag === 'BLOCKQUOTE') {
      if (!hasBlockChild(el)) {
        const text = clean(el.textContent ?? '');
        if (text) blocks.push({ t: 'quote', text });
      } else {
        for (const child of Array.from(el.children)) {
          const text = clean(child.textContent ?? '');
          if (text) blocks.push({ t: 'quote', text });
        }
      }
      return;
    }
    if (TEXT_BLOCKS.has(tag) || (CONTAINERS.has(tag) && tag !== 'BODY' && !hasBlockChild(el) && !el.querySelector('img, image'))) {
      const text = clean(el.textContent ?? '');
      if (text) blocks.push({ t: 'p', text });
      // Images inside a paragraph still count.
      for (const img of Array.from(el.querySelectorAll('img, image'))) walk(img);
      return;
    }
    for (const child of Array.from(el.children)) walk(child);
  };
  walk(body);
  return blocks;
}

export async function parseEpub(file: Blob, onProgress?: (fraction: number) => void): Promise<ParsedEpub> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    throw new EpubError('This file is not a readable EPUB.');
  }
  if (zip.file('META-INF/encryption.xml')) {
    const enc = await zip.file('META-INF/encryption.xml')!.async('string');
    if (/EncryptedData/.test(enc) && !/obfuscation|font/i.test(enc)) throw new EpubError('This EPUB is DRM-protected, so it can’t be opened outside the store’s own app.');
  }

  const container = await zip.file('META-INF/container.xml')?.async('string');
  const opfPath = container ? parseXml(container, 'application/xml').querySelector('rootfile')?.getAttribute('full-path') : null;
  const opfText = opfPath ? await zip.file(opfPath)?.async('string') : null;
  if (!opfPath || !opfText) throw new EpubError('This EPUB is missing its table of contents.');
  const opf = parseXml(opfText, 'application/xml');

  const fileName = file instanceof File ? file.name.replace(/\.epub$/i, '') : '';
  const title = clean(byLocalName(opf, 'title')[0]?.textContent ?? '') || fileName || 'Untitled';
  const author = clean(byLocalName(opf, 'creator')[0]?.textContent ?? '') || undefined;

  const manifest = new Map<string, { href: string; type: string; props: string }>();
  for (const item of byLocalName(opf, 'item')) {
    manifest.set(item.getAttribute('id') ?? '', {
      href: resolvePath(opfPath, item.getAttribute('href') ?? ''),
      type: item.getAttribute('media-type') ?? '',
      props: item.getAttribute('properties') ?? '',
    });
  }
  const spine = byLocalName(opf, 'itemref')
    .map((ref) => manifest.get(ref.getAttribute('idref') ?? ''))
    .filter((item): item is { href: string; type: string; props: string } => Boolean(item) && /html/.test(item!.type));

  // Chapter titles from the EPUB 3 nav document or the EPUB 2 NCX.
  const tocTitles = new Map<string, string>();
  const nav = [...manifest.values()].find((m) => m.props.split(' ').includes('nav'));
  if (nav) {
    const doc = parseXml((await zip.file(nav.href)?.async('string')) ?? '', 'application/xhtml+xml');
    for (const a of Array.from(doc.querySelectorAll('nav a[href]'))) {
      const path = resolvePath(nav.href, a.getAttribute('href') ?? '');
      if (!tocTitles.has(path)) tocTitles.set(path, clean(a.textContent ?? ''));
    }
  } else {
    const ncx = [...manifest.values()].find((m) => m.type === 'application/x-dtbncx+xml');
    if (ncx) {
      const doc = parseXml((await zip.file(ncx.href)?.async('string')) ?? '', 'application/xml');
      for (const point of byLocalName(doc, 'navPoint')) {
        const src = byLocalName(point, 'content')[0]?.getAttribute('src');
        const label = clean(byLocalName(point, 'text')[0]?.textContent ?? '');
        if (src && label) {
          const path = resolvePath(ncx.href, src);
          if (!tocTitles.has(path)) tocTitles.set(path, label);
        }
      }
    }
  }

  // Cover: EPUB 3 "cover-image" property, or the EPUB 2 <meta name="cover">.
  const coverId = byLocalName(opf, 'meta').find((m) => m.getAttribute('name') === 'cover')?.getAttribute('content');
  const coverItem = [...manifest.values()].find((m) => m.props.split(' ').includes('cover-image')) ?? (coverId ? manifest.get(coverId) : undefined);
  let cover: ParsedEpub['cover'];
  if (coverItem && /^image\//.test(coverItem.type)) {
    const data = await zip.file(coverItem.href)?.async('uint8array');
    if (data) cover = { blob: new Blob([data as Uint8Array<ArrayBuffer>], { type: coverItem.type }), mime: coverItem.type };
  }

  const images: ParsedEpub['images'] = [];
  const imageIds = new Map<string, string>();
  const pendingImages: Array<{ path: string; id: string }> = [];
  const chapters: ChapterDraft[] = [];

  for (let i = 0; i < spine.length; i++) {
    const item = spine[i];
    const html = await zip.file(item.href)?.async('string');
    if (html) {
      const doc = parseXml(html, 'application/xhtml+xml');
      const body = doc.body ?? doc.documentElement;
      const blocks = extractBlocks(body, (src) => {
        const path = resolvePath(item.href, src);
        if (coverItem && path === coverItem.href) return null; // the cover is shown separately
        let id = imageIds.get(path);
        if (!id) {
          id = crypto.randomUUID();
          imageIds.set(path, id);
          pendingImages.push({ path, id });
        }
        return id;
      });
      if (blocks.some((b) => b.t !== 'img' && b.text.length > 0)) {
        const heading = blocks.find((b) => b.t === 'h');
        chapters.push({ title: tocTitles.get(item.href) || (heading && heading.t === 'h' ? heading.text : undefined), blocks });
      }
    }
    onProgress?.((i + 1) / spine.length);
    await yieldToBrowser(); // keep the page responsive on long books
  }

  for (const { path, id } of pendingImages) {
    const entry = zip.file(path);
    if (!entry) continue;
    const data = await entry.async('uint8array');
    if (data.byteLength > MAX_IMAGE_BYTES) continue;
    const mime = [...manifest.values()].find((m) => m.href === path)?.type ?? 'image/jpeg';
    images.push({ id, blob: new Blob([data as Uint8Array<ArrayBuffer>], { type: mime }), mime });
  }
  // Drop image blocks whose file was missing or too large.
  const kept = new Set(images.map((img) => img.id));
  for (const chapter of chapters) chapter.blocks = chapter.blocks.filter((b) => b.t !== 'img' || kept.has(b.blobId));

  if (!chapters.length) throw new EpubError('No readable text was found in this EPUB.');
  return { title, author, cover, chapters, images };
}
