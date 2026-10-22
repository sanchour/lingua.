// News: a feed's latest articles (RSS 2.0 or Atom), and an article page as read by the reader
// service (Markdown) turned into paragraphs.
import type { Block } from '@/data/types';
import { plainText } from './rss';

export interface NewsItem {
  title: string;
  link: string;
  published?: number;
  summary?: string;
}

const first = (el: Element, names: string[]) => {
  for (const name of names) {
    const found = Array.from(el.children).find((c) => c.localName === name);
    if (found) return found;
  }
  return undefined;
};

/** The newest articles of a feed, newest first. */
export function parseNewsFeed(xml: string, max = 30): NewsItem[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const items = Array.from(doc.querySelectorAll('item, entry'));
  const out: NewsItem[] = [];
  for (const item of items) {
    const title = plainText(first(item, ['title'])?.textContent ?? '', 200);
    const linkEl = first(item, ['link']);
    const link = (linkEl?.getAttribute('href') || linkEl?.textContent || first(item, ['guid'])?.textContent || '').trim();
    if (!title || !/^https?:\/\//.test(link)) continue;
    const date = first(item, ['pubDate', 'published', 'updated', 'date'])?.textContent;
    const published = date ? Date.parse(date) : NaN;
    out.push({ title, link, published: Number.isNaN(published) ? undefined : published, summary: plainText(first(item, ['description', 'summary'])?.textContent ?? undefined, 220) });
  }
  return out.sort((a, b) => (b.published ?? 0) - (a.published ?? 0)).slice(0, max);
}

export interface ReadArticle {
  title: string;
  site?: string;
  published?: number;
  blocks: Block[];
}

/** Links, pictures and emphasis out of a line of Markdown, keeping the words. */
export function inline(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\((?:[^()]|\([^)]*\))*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|[\s(])[*_](\S(?:.*?\S)?)[*_](?=[\s).,;:!?]|$)/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

const SENTENCE = /[\p{L}\p{N}][^\n]*[.!?…»"”:)]$/u;

/** Cookie banners, newsletter and notification prompts, sharing bars: not part of the article. */
const BOILERPLATE =
  /cookie|opt[- ]out|consent|privacy policy|newsletter|notific|abonn|suscr[ií]b|subscri|iscriviti|anmelden|registrier|compart(ir|e)|condividi|partager|share this|leia também|lea también|lesen sie auch|leggi anche|lire aussi|read more|adatkezel|süti|feliratkoz|подпис|ακολουθήστε|αποδεχ/i;
const isBoilerplate = (text: string) => /cookie|opt[- ]out|\bconsent/i.test(text) || (text.length < 320 && BOILERPLATE.test(text));
/** "44 min ago", "16.10.2026 14:03" and the like. */
const isTimestamp = (text: string) => text.length < 40 && /^[\d\s.:,/-]*(\p{L}+\.?\s*){0,3}$/u.test(text) && /\d/.test(text);

const prose = (b: Block) => b.t !== 'img' && b.t !== 'h' && b.text.length > 60 && SENTENCE.test(b.text);

/**
 * The article among the page's leftovers: the run of prose paragraphs with the most text, where up
 * to two other blocks may interrupt it (a subheading, a caption, "Listen to this article"), plus the
 * heading just before it. Menus, related stories and comment threads fall outside the run.
 */
function mainRun(blocks: Block[], title: string): Block[] {
  // The headline, when the page repeats it: the article usually starts right after it.
  const key = title.slice(0, 24).toLocaleLowerCase();
  const headline = key ? blocks.findIndex((b) => b.t === 'h' && b.text.toLocaleLowerCase().startsWith(key)) : -1;
  const score = (r: { start: number; chars: number }) => r.chars * (headline >= 0 && r.start > headline && r.start - headline <= 8 ? 2 : 1);
  let best = { start: -1, end: -1, chars: 0 };
  let run = { start: -1, end: -1, chars: 0 };
  let gap = 0;
  blocks.forEach((b, i) => {
    if (prose(b)) {
      if (run.start < 0) run = { start: i, end: i, chars: 0 };
      run.end = i;
      run.chars += 'text' in b ? b.text.length : 0;
      gap = 0;
      if (score(run) > score(best)) best = { ...run };
    } else if (run.start >= 0 && ++gap > 2) {
      run = { start: -1, end: -1, chars: 0 };
    }
  });
  if (best.start < 0) return blocks;
  const before = blocks.slice(Math.max(0, best.start - 3), best.start);
  const heading = [...before].reverse().find((b) => b.t === 'h');
  const inside = blocks.slice(best.start, best.end + 1).filter((b) => b.t !== 'p' || b.text.length >= 40 || SENTENCE.test(b.text));
  return heading ? [heading, ...inside] : inside;
}

/**
 * The reader service's answer ("Title: …", "Published Time: …", "Markdown Content:" and the article)
 * into blocks. Navigation leftovers are dropped: link lists, lines that are only links, and short
 * fragments that aren't sentences, before the first and after the last real paragraph.
 */
export function readerMarkdownToArticle(answer: string, url: string): ReadArticle {
  const header = answer.split(/\nMarkdown Content:\n/)[0] ?? '';
  const body = answer.includes('\nMarkdown Content:\n') ? answer.slice(answer.indexOf('\nMarkdown Content:\n') + 19) : answer;
  const title = /^Title:\s*(.*)$/m.exec(header)?.[1]?.trim() ?? '';
  const when = /^Published Time:\s*(.*)$/m.exec(header)?.[1]?.trim();
  const published = when ? Date.parse(when) : NaN;

  const blocks: Block[] = [];
  for (const raw of body.replace(/\r\n?/g, '\n').split(/\n\s*\n/)) {
    const chunk = raw.trim();
    if (!chunk || /^[-*_=]{3,}$/.test(chunk)) continue;
    const lines = chunk.split('\n');
    // A block that is mostly links is a menu or a list of related stories.
    const linkLines = lines.filter((l) => /^\s*([-*+]|\d+\.)?\s*\[[^\]]*\]\([^)]*\)\s*$/.test(l)).length;
    if (linkLines >= Math.max(1, lines.length / 2)) continue;
    if (/^#{1,6}\s/.test(chunk)) {
      const text = inline(chunk.replace(/^#{1,6}\s+/, ''));
      if (text) blocks.push({ t: 'h', text });
      continue;
    }
    if (chunk.startsWith('>')) {
      const text = inline(lines.map((l) => l.replace(/^>\s?/, '')).join(' '));
      if (text && !/^—/.test(text)) blocks.push({ t: 'quote', text });
      continue;
    }
    for (const line of /^\s*([-*+]|\d+\.)\s/.test(lines[0]) ? lines : [lines.join(' ')]) {
      const text = inline(line.replace(/^\s*([-*+]|\d+\.)\s+/, ''));
      if (text && !isBoilerplate(text) && !isTimestamp(text)) blocks.push({ t: 'p', text });
    }
  }

  const kept = mainRun(blocks, title);
  const site = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return undefined;
    }
  })();
  const heading = kept.find((b) => b.t === 'h');
  return {
    title: title || (heading && 'text' in heading ? heading.text : '') || site || 'Article',
    site,
    published: Number.isNaN(published) ? undefined : published,
    blocks: kept,
  };
}
