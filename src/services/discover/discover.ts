// Discover (5.1-3a): free and legal reading from the web, one click into the library. Checked for
// CORS and licences when built (2026-10-21):
// - Wikipedia (CC BY-SA): the API lets apps read it; the most-viewed articles in every language, and
//   the article of the day where the wiki's feed has one.
// - Project Gutenberg (public domain in the US): Gutendex, the catalogue's JSON copy, lets apps read it
//   but often didn't answer; then Gutenberg's own search page is read through Jina Reader. Gutenberg's
//   files don't let apps read them, so a book's HTML edition (which keeps the chapter headings) is read
//   through Jina Reader too, as news articles are.
// - Wikisource (public domain and CC BY-SA): the API lets apps read it; a work's chapters are its
//   subpages, in the order its main page links them.
// Left out: Wikinews (no new stories in months), and the picture-book and comic libraries
// (StoryWeaver, African Storybook, Bloom, Pepper&Carrot), which don't let apps read their files; the
// page links to them, and their downloads can be added as files.
import { gutenbergAuthor, gutenbergMarkdownToChapters, gutenbergSearchResults, wikiExtractToBlocks } from '@/core/parsers/discover';
import type { ChapterDraft } from '@/core/parsers/text';
import { addText } from '@/data/library';
import type { Block } from '@/data/types';

export class DiscoverError extends Error {}

const READER = 'https://r.jina.ai/';

/** Wikimedia's name for a language where it differs from Lingua's. */
const WIKI: Record<string, string> = { nb: 'no', yue: 'zh-yue', sh: 'sh' };
export const wikiHost = (lang: string, project: 'wikipedia' | 'wikisource') => `https://${WIKI[lang] ?? lang}.${project}.org`;

async function getJson<T>(url: string, timeout = 20_000): Promise<T> {
  if (!navigator.onLine) throw new DiscoverError('You’re offline.');
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(timeout) });
  } catch {
    throw new DiscoverError('That couldn’t be reached just now. Try again in a moment.');
  }
  if (!res.ok) throw new DiscoverError(`The server answered ${res.status}.`);
  return (await res.json()) as T;
}

/** Lists are kept for half an hour, so moving between tabs is instant. */
const kept = new Map<string, { at: number; value: Promise<unknown> }>();
function remember<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = kept.get(key);
  if (hit && Date.now() - hit.at < 30 * 60_000) return hit.value as Promise<T>;
  const value = load();
  kept.set(key, { at: Date.now(), value });
  value.catch(() => kept.delete(key));
  return value;
}

// ── Wikipedia ───────────────────────────────────────────────────────────────

export interface WikiArticle {
  title: string;
  extract: string;
  thumbnail?: string;
  url: string;
  /** The wiki's article of the day. */
  featured?: boolean;
}

interface QueryPage {
  title: string;
  ns: number;
  extract?: string;
  thumbnail?: { source: string };
  missing?: boolean;
}

interface FeedArticle {
  titles?: { normalized?: string };
  extract?: string;
  thumbnail?: { source?: string };
  content_urls?: { desktop?: { page?: string } };
  namespace?: { id?: number };
}

const fromFeed = (a: FeedArticle, featured = false): WikiArticle[] => {
  const title = a.titles?.normalized;
  const url = a.content_urls?.desktop?.page;
  if (!title || !url || !a.extract || (a.namespace?.id ?? 0) !== 0) return [];
  return [{ title, extract: a.extract, thumbnail: a.thumbnail?.source, url, featured }];
};

/**
 * The most-read articles on the language's Wikipedia, the article of the day first where there is
 * one. Both of Wikimedia's lists come and go by the day (each was empty for some languages while
 * testing), so the feed is asked for yesterday, then the day before, then the API's own list.
 */
export function wikipediaToday(lang: string): Promise<WikiArticle[]> {
  return remember(`wp:${lang}`, async () => {
    const host = wikiHost(lang, 'wikipedia');
    for (const daysAgo of [1, 2]) {
      const day = new Date(Date.now() - daysAgo * 86_400_000);
      const ymd = `${day.getUTCFullYear()}/${String(day.getUTCMonth() + 1).padStart(2, '0')}/${String(day.getUTCDate()).padStart(2, '0')}`;
      const feed = await getJson<{ tfa?: FeedArticle; mostread?: { articles?: FeedArticle[] } }>(`${host}/api/rest_v1/feed/featured/${ymd}`).catch(() => null);
      const read = (feed?.mostread?.articles ?? []).flatMap((a) => fromFeed(a));
      if (read.length) {
        const featured = feed?.tfa ? fromFeed(feed.tfa, true) : [];
        return [...featured, ...read.filter((a) => a.title !== featured[0]?.title)].slice(0, 13);
      }
    }
    const viewed = await getJson<{ query?: { mostviewed?: Array<{ title: string; ns: number }>; general?: { mainpage?: string } } }>(
      `${host}/w/api.php?action=query&list=mostviewed&pvimlimit=40&meta=siteinfo&siprop=general&format=json&formatversion=2&origin=*`,
    );
    const main = viewed.query?.general?.mainpage;
    const wanted = (viewed.query?.mostviewed ?? []).filter((p) => p.ns === 0 && p.title !== main).map((p) => p.title).slice(0, 13);
    if (!wanted.length) return [];
    const details = await getJson<{ query?: { pages?: QueryPage[] } }>(
      `${host}/w/api.php?action=query&prop=extracts%7Cpageimages&exintro=1&explaintext=1&exsentences=2&exlimit=20&piprop=thumbnail&pithumbsize=480&redirects=1&titles=${wanted.map(encodeURIComponent).join('%7C')}&format=json&formatversion=2&origin=*`,
    );
    const pages = new Map((details.query?.pages ?? []).filter((p) => !p.missing).map((p) => [p.title, p]));
    return wanted.flatMap((title) => {
      const page = pages.get(title);
      if (!page?.extract) return [];
      return [{ title, extract: page.extract, thumbnail: page.thumbnail?.source, url: `${host}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}` }];
    });
  });
}

/** An article into the library, read in full from the API (sources and links left out). */
export async function importWikipedia(lang: string, article: Pick<WikiArticle, 'title' | 'url'>): Promise<string> {
  const host = wikiHost(lang, 'wikipedia');
  const data = await getJson<{ query?: { pages?: QueryPage[] } }>(
    `${host}/w/api.php?action=query&prop=extracts&explaintext=1&exsectionformat=wiki&redirects=1&titles=${encodeURIComponent(article.title)}&format=json&formatversion=2&origin=*`,
    30_000,
  );
  const blocks = wikiExtractToBlocks(data.query?.pages?.[0]?.extract ?? '');
  if (!blocks.some((b) => b.t === 'p')) throw new DiscoverError('That article has no text to read.');
  return addText({ lang, title: article.title, author: 'Wikipedia', kind: 'article', source: 'wiki', sourceUrl: article.url, chapters: [{ title: article.title, blocks: [{ t: 'h', text: article.title }, ...blocks] }] });
}

// ── Project Gutenberg ───────────────────────────────────────────────────────

export interface FreeBook {
  id: number;
  title: string;
  author?: string;
  cover?: string;
  /** The HTML edition, with its chapter headings. */
  html: string;
  url: string;
}

/**
 * Reads a page on a site that doesn't let apps read it, through Jina Reader (as news articles are).
 * `pictures`: keep the pictures' links (the search page's covers carry its books).
 */
async function viaReader(url: string, timeout: number, pictures = false): Promise<string> {
  if (!navigator.onLine) throw new DiscoverError('You’re offline.');
  let res: Response;
  try {
    res = await fetch(READER + url, { headers: pictures ? {} : { 'X-Retain-Images': 'none' }, signal: AbortSignal.timeout(timeout) });
  } catch {
    throw new DiscoverError('That couldn’t be fetched just now. Try again in a moment.');
  }
  if (res.status === 429) throw new DiscoverError('The reader service is busy. Try again in a minute.');
  if (!res.ok) throw new DiscoverError(`That couldn’t be fetched (the server answered ${res.status}).`);
  const text = await res.text();
  // Jina passes on the site's own error page, with a warning above it.
  if (/^Warning: Target URL returned error \d+/m.test(text)) throw new DiscoverError('That page isn’t there any more.');
  return text;
}

interface GutendexBook {
  id: number;
  title: string;
  authors: Array<{ name: string }>;
  formats: Record<string, string>;
  copyright: boolean | null;
  languages: string[];
  media_type: string;
}

/** Gutenberg's books in the language, the most downloaded first; or those matching `search`. */
export function gutenbergBooks(lang: string, search = ''): Promise<FreeBook[]> {
  const q = search.trim();
  return remember(`pg:${lang}:${q.toLocaleLowerCase()}`, async () => {
    const url = (id: number) => `https://www.gutenberg.org/ebooks/${id}`;
    // Gutendex knows each book's editions and languages, so audio books, bilingual books (dictionaries)
    // and books still under copyright stay out.
    try {
      const data = await getJson<{ results: GutendexBook[] }>(`https://gutendex.com/books/?languages=${encodeURIComponent(lang)}${q ? `&search=${encodeURIComponent(q)}` : ''}`, 8_000);
      return data.results.flatMap((b) => {
        const html = Object.entries(b.formats).find(([type]) => type.startsWith('text/html'))?.[1];
        if (b.copyright !== false || !html || b.media_type !== 'Text' || b.languages.length !== 1) return [];
        return [{ id: b.id, title: b.title.split(/[;:]\s/)[0].trim(), author: b.authors[0] ? gutenbergAuthor(b.authors[0].name) : undefined, cover: b.formats['image/jpeg'], html, url: url(b.id) }];
      });
    } catch {
      // Gutenberg's own search ("l.es" is the language), the most downloaded first.
      const query = encodeURIComponent(q ? `${q} l.${lang}` : `l.${lang}`);
      const page = await viaReader(`https://www.gutenberg.org/ebooks/search/?query=${query}&sort_order=downloads`, 30_000, true);
      return gutenbergSearchResults(page).map((b) => ({ ...b, html: `https://www.gutenberg.org/ebooks/${b.id}.html.images`, url: url(b.id) }));
    }
  });
}

/** A Gutenberg book into the library, its chapters from the HTML edition's headings. */
export async function importGutenberg(lang: string, book: FreeBook): Promise<string> {
  let page: string;
  try {
    page = await viaReader(book.html, 90_000);
  } catch (error) {
    if (error instanceof DiscoverError && /isn’t there/.test(error.message)) throw new DiscoverError('This one has no text to read (it may be an audio book).');
    throw error;
  }
  const chapters = gutenbergMarkdownToChapters(page, book.title);
  if (!chapters.some((c) => c.blocks.filter((b) => b.t !== 'h').length > 3)) throw new DiscoverError('No text was found in that book.');
  return addText({ lang, title: book.title, author: book.author, kind: 'book', source: 'gutenberg', sourceUrl: book.url, coverUrl: book.cover, chapters });
}

// ── Wikisource ──────────────────────────────────────────────────────────────

export interface SourceWork {
  title: string;
  snippet: string;
  url: string;
}

/** Works on the language's Wikisource matching `search` (whole works, not their chapters). */
export function wikisourceSearch(lang: string, search: string): Promise<SourceWork[]> {
  const q = search.trim();
  return remember(`ws:${lang}:${q.toLocaleLowerCase()}`, async () => {
    if (!q) return [];
    const host = wikiHost(lang, 'wikisource');
    const data = await getJson<{ query?: { search?: Array<{ title: string; snippet: string }> } }>(
      `${host}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srnamespace=0&srlimit=20&format=json&formatversion=2&origin=*`,
    );
    return (data.query?.search ?? [])
      .filter((r) => !r.title.includes('/'))
      .slice(0, 8)
      .map((r) => ({ title: r.title, snippet: r.snippet.replace(/<[^>]+>/g, ''), url: `${host}/wiki/${encodeURIComponent(r.title.replace(/ /g, '_'))}` }));
  });
}

/** Wikisource's page furniture: headers, notes, page numbers, navigation. */
const NOT_TEXT = '.mw-editsection, sup, .reference, .references, .mw-references-wrap, table, style, script, .noprint, .ws-noexport, #headertemplate, .headertemplate, .ws-header, .header_template, .navbox, .pagenum, .ws-pagenum, .mw-empty-elt, .catlinks, figure, .thumb';

/** A Wikisource page's text as blocks, in order. */
export function sourceHtmlToBlocks(html: string): Block[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll(NOT_TEXT).forEach((el) => el.remove());
  const blocks: Block[] = [];
  for (const el of doc.body.querySelectorAll('h2, h3, h4, p, blockquote, dd, .poem')) {
    // Each piece of text once: a paragraph inside a quote or a poem is taken with it.
    if (el.parentElement?.closest('blockquote, dd, .poem')) continue;
    el.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
    const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    blocks.push(/^H\d$/.test(el.tagName) ? { t: 'h', text } : el.tagName === 'BLOCKQUOTE' ? { t: 'quote', text } : { t: 'p', text });
  }
  return blocks;
}

/**
 * A Wikisource work into the library: its chapters (subpages) in the order its main page links them.
 * A page that only lists a work's editions leads to the first of them.
 */
export async function importWikisource(lang: string, work: SourceWork, onProgress?: (fraction: number) => void, followed = false): Promise<string> {
  const host = wikiHost(lang, 'wikisource');
  const parse = (page: string) =>
    getJson<{ parse?: { title: string; text: string } }>(`${host}/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=text&redirects=1&disableeditsection=1&format=json&formatversion=2&origin=*`, 30_000);
  const main = (await parse(work.title)).parse;
  if (!main) throw new DiscoverError('That work couldn’t be found.');
  // The pages it links to, by title, in the order they appear.
  const doc = new DOMParser().parseFromString(main.text, 'text/html');
  const links = [
    ...new Map(
      [...doc.querySelectorAll('a[href^="/wiki/"]')].flatMap((a) => {
        try {
          const page = decodeURIComponent((a.getAttribute('href') ?? '').slice('/wiki/'.length).split('#')[0]).replace(/_/g, ' ');
          return page ? [[page, { page, label: (a.textContent ?? '').trim() }] as const] : [];
        } catch {
          return [];
        }
      }),
    ).values(),
  ];
  const parts = links.filter((l) => l.page.startsWith(`${main.title}/`)).slice(0, 200);

  const chapters: ChapterDraft[] = [];
  if (parts.length < 2) {
    const blocks = sourceHtmlToBlocks(main.text);
    const edition = links.find((l) => l.page !== main.title && !l.page.includes(':') && !l.page.includes('/'));
    if (!followed && edition && blocks.filter((b) => b.t === 'p').length < 3) {
      return importWikisource(lang, { title: edition.page, snippet: '', url: `${host}/wiki/${encodeURIComponent(edition.page.replace(/ /g, '_'))}` }, onProgress, true);
    }
    chapters.push({ title: main.title, blocks });
  } else {
    for (const [i, { page, label }] of parts.entries()) {
      onProgress?.(i / parts.length);
      const text = (await parse(page)).parse?.text;
      const blocks = text ? sourceHtmlToBlocks(text) : [];
      if (blocks.some((b) => b.t !== 'h')) chapters.push({ title: label || page.slice(main.title.length + 1), blocks });
    }
  }
  if (!chapters.some((c) => c.blocks.some((b) => b.t !== 'h'))) throw new DiscoverError('No text was found in that work.');
  return addText({ lang, title: main.title, kind: chapters.length > 1 ? 'book' : 'article', source: 'wiki', sourceUrl: work.url, chapters });
}
