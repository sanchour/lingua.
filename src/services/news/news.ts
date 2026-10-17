// News in Codex: a source's latest articles, and reading an article from its link. Pages are read
// through Jina Reader (r.jina.ai), which fetches the page and keeps only the article as Markdown;
// it sees the link and nothing else. Without it, news sites don't let apps read their pages.
import { parseNewsFeed, readerMarkdownToArticle } from '@/core/parsers/article';
import type { NewsItem, ReadArticle } from '@/core/parsers/article';
import type { NewsSource } from '@/core/lang/news';
import { countWords } from '@/core/text/tokenizer';
import { addText } from '@/data/library';
import type { Text } from '@/data/types';
import { fetchText } from '@/services/sonus/net';

export class NewsError extends Error {}

const READER = 'https://r.jina.ai/';
const latest = new Map<string, { at: number; items: NewsItem[] }>();

/** A source's newest articles (kept for ten minutes). */
export async function latestNews(source: NewsSource): Promise<NewsItem[]> {
  const cached = latest.get(source.id);
  if (cached && Date.now() - cached.at < 10 * 60_000) return cached.items;
  let xml: string;
  try {
    xml = await fetchText(source.feed);
  } catch {
    throw new NewsError(`${source.name} couldn’t be reached. Check the connection and try again.`);
  }
  const items = parseNewsFeed(xml);
  latest.set(source.id, { at: Date.now(), items });
  return items;
}

export function isArticleLink(text: string): boolean {
  try {
    const url = new URL(text.trim());
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/** The article at a link, as paragraphs. */
export async function readArticle(url: string, lang: string): Promise<ReadArticle> {
  if (!navigator.onLine) throw new NewsError('You’re offline. Paste the article’s text instead.');
  const words = (a: ReadArticle) => a.blocks.reduce((n, b) => n + ('text' in b ? countWords(b.text, lang) : 0), 0);
  // The page's <article> first (cleanest); the whole page when it has none.
  for (const selector of ['article', '']) {
    let res: Response;
    try {
      const headers: Record<string, string> = { 'X-Retain-Images': 'none' };
      if (selector) headers['X-Target-Selector'] = selector;
      res = await fetch(READER + url.trim(), { headers, signal: AbortSignal.timeout(30_000) });
    } catch {
      throw new NewsError('The page couldn’t be read just now. Paste the article’s text instead.');
    }
    if (res.status === 429) throw new NewsError('The reader service is busy. Try again in a minute, or paste the text.');
    if (!res.ok) {
      if (selector) continue;
      throw new NewsError('That page couldn’t be read (it may need a login or a subscription). Paste its text instead.');
    }
    const answer = await res.text();
    if (/^Title: Just a moment/m.test(answer)) throw new NewsError('That site only shows its pages to browsers. Paste the article’s text instead.');
    const article = readerMarkdownToArticle(answer, url);
    if (words(article) >= 80 || (!selector && words(article) >= 40)) return article;
  }
  throw new NewsError('No article text was found on that page. Paste its text instead.');
}

/** Saves a read article to the library as a text; returns its id. */
export async function addArticle(lang: string, article: ReadArticle, url: string, level?: Text['level']): Promise<string> {
  return addText({
    lang,
    title: article.title,
    author: article.site,
    kind: 'article',
    source: 'article',
    sourceUrl: url.trim(),
    level,
    chapters: [{ title: article.title, blocks: article.blocks[0]?.t === 'h' ? article.blocks : [{ t: 'h', text: article.title }, ...article.blocks] }],
  });
}
