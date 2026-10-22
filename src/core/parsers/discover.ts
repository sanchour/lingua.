// Discover (5.1-3a): free texts from the web made into Lingua's chapters. Project Gutenberg books come
// as Markdown from Jina Reader (the HTML edition, which keeps the chapter headings); Wikipedia articles
// as plain text from the TextExtracts API, with "== Section ==" headings.
import type { Block } from '@/data/types';
import { inline } from './article';
import type { ChapterDraft } from './text';

/** "Cervantes Saavedra, Miguel de" → "Miguel de Cervantes Saavedra"; dates and roles dropped. */
export function gutenbergAuthor(name: string): string {
  const clean = name.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/,?\s*\d{3,4}\??-\d{0,4}\??/g, '').trim();
  const [last, ...rest] = clean.split(',').map((s) => s.trim());
  const first = rest.join(' ').trim();
  return first ? `${first} ${last}` : last;
}

/** Letters that are words on their own ("Y entonces", "В доме"): never a drop capital. */
const ONE_LETTER_WORDS = new Set(['a', 'à', 'y', 'o', 'e', 'u', 'i', 'в', 'с', 'к', 'и', 'а', 'о', 'у', 'я']);

/** A chapter's drop capital set apart from its word: "N UNCA podrá" → "Nunca podrá". */
export function mendDropCap(text: string): string {
  const m = /^(\p{Lu})\s(\p{Lu}+)(?=[\s,;.!?]|$)(.*)$/u.exec(text);
  if (!m || ONE_LETTER_WORDS.has(m[1].toLocaleLowerCase())) return text;
  const word = m[1] + m[2];
  // A word in small capitals before ordinary text is written as an ordinary word.
  return (/^\s+\p{Ll}/u.test(m[3]) ? word[0] + word.slice(1).toLocaleLowerCase() : word) + m[3];
}

/** A table of contents, in the core languages and a few more: not a chapter to read. */
const CONTENTS = /^(índice( general)?|indice|index|contents|table of contents|table des matières|table|sommaire|inhalt|inhaltsverzeichnis|содержание|оглавление|目录|目錄|فهرس|المحتويات|indice generale|sumário)\.?$/i;

/**
 * A book's Markdown (Jina Reader) as chapters: a heading starts one. Of headings in a row, the last
 * two make its title ("LIBRO I · CAPÍTULO XXII"), or the last alone when that grows long; the ones
 * before (a title page's lines) are left out. A heading the book's contents link to (Jina writes it as
 * a link) is a chapter's: plain ones just before it belong to the title page.
 */
export function gutenbergMarkdownToChapters(answer: string, title: string): ChapterDraft[] {
  const marker = '\nMarkdown Content:\n';
  const body = answer.includes(marker) ? answer.slice(answer.indexOf(marker) + marker.length) : answer;
  const chapters: ChapterDraft[] = [];
  let current: ChapterDraft | null = null;
  let headings: Array<{ text: string; linked: boolean }> = [];
  for (const raw of body.replace(/\r\n?/g, '\n').split(/\n\s*\n/)) {
    const chunk = raw.trim();
    if (!chunk || /^([-*_=•·]\s*){3,}$/.test(chunk)) continue;
    const heading = /^#{1,6}\s+([\s\S]*)$/.exec(chunk);
    if (heading) {
      const text = inline(heading[1].replace(/\n/g, ' '));
      if (text) headings.push({ text, linked: heading[1].trim().startsWith('[') });
      continue;
    }
    const quote = chunk.startsWith('>');
    // Lines of verse are joined like the lines of a paragraph.
    const text = inline((quote ? chunk.replace(/^>\s?/gm, '') : chunk).replace(/\n/g, ' '));
    if (!text) continue;
    if (headings.length) {
      const fromLinked = headings.findIndex((h) => h.linked);
      const last = headings.slice(Math.max(fromLinked, headings.length - 2, 0)).map((h) => h.text);
      const kept = last.join(' · ').length <= 60 ? last : last.slice(-1);
      chapters.push((current = { title: kept.join(' · '), blocks: kept.map((h): Block => ({ t: 'h', text: h })) }));
      headings = [];
    } else if (!current) chapters.push((current = { title, blocks: [] }));
    current.blocks.push({ t: quote ? 'quote' : 'p', text: mendDropCap(text) });
  }
  // Tables of contents aren't read.
  return chapters.filter((c) => !CONTENTS.test(c.title ?? ''));
}

/** Sections at the end of an article that are lists of sources and links, not reading. */
const NOT_READING = new Set(
  [
    'references', 'see also', 'external links', 'further reading', 'notes', 'bibliography', 'sources',
    'referencias', 'véase también', 'enlaces externos', 'bibliografía', 'notas', 'fuentes',
    'notes et références', 'références', 'voir aussi', 'liens externes', 'bibliographie', 'articles connexes',
    'literatur', 'weblinks', 'einzelnachweise', 'anmerkungen', 'siehe auch', 'quellen',
    'примечания', 'литература', 'ссылки', 'см. также', 'источники',
    'مراجع', 'المراجع', 'وصلات خارجية', 'انظر أيضا', 'انظر أيضًا', 'مصادر', 'هوامش',
    '参考文献', '參考文獻', '外部链接', '外部連結', '参见', '參見', '注释', '註釋', '延伸阅读', '延伸閱讀',
  ].map((s) => s.toLocaleLowerCase()),
);

/** A Wikipedia article's plain text (TextExtracts, "== Heading ==") as blocks, without its lists of sources. */
export function wikiExtractToBlocks(extract: string): Block[] {
  const blocks: Block[] = [];
  let skipping = false;
  for (const raw of extract.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const heading = /^(=+)\s*(.*?)\s*\1$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2];
      // A source list's own subsections are skipped with it.
      if (level <= 2) skipping = NOT_READING.has(text.toLocaleLowerCase());
      if (!skipping && text) blocks.push({ t: 'h', text });
      continue;
    }
    if (!skipping) blocks.push({ t: 'p', text: line.replace(/\s+/g, ' ') });
  }
  // A heading with nothing under it (its section was only a table or a gallery).
  return blocks.filter((b, i) => b.t !== 'h' || (blocks[i + 1] && blocks[i + 1].t !== 'h') || false);
}

export interface GutenbergResult {
  id: number;
  title: string;
  author?: string;
  cover: string;
}

/**
 * Gutenberg's search page (as Markdown from Jina Reader) as books: "[![cover](…)Don Quijote
 * (Spanish)Miguel de Cervantes Saavedra 20145 downloads](…/ebooks/2000)". Books in more than one
 * language (dictionaries, bilingual editions) are left out.
 */
export function gutenbergSearchResults(markdown: string): GutenbergResult[] {
  const out: GutenbergResult[] = [];
  for (const line of markdown.split('\n')) {
    const item = /\[!\[[^\]]*\]\(([^)\s]+)\)(.+?)\s*[\d,]+ downloads\]\(https?:\/\/www\.gutenberg\.org\/ebooks\/(\d+)\)/.exec(line);
    if (!item) continue;
    const parts = /^(.*?)\s*((?:\([A-Z][a-z]+(?: [A-Z][a-z]+)?\)\s?)+)([^()]*)$/.exec(item[2].trim());
    if (!parts || (parts[2].match(/\(/g) ?? []).length !== 1) continue;
    const id = Number(item[3]);
    const author = parts[3].trim();
    out.push({ id, title: parts[1].trim(), author: author || undefined, cover: item[1].replace('.cover.small.', '.cover.medium.') });
  }
  return out;
}
