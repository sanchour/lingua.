// Podcast RSS (with the iTunes namespace) → feed details and audio episodes. Uses DOMParser.
import type { FeedEpisode } from '@/data/types';

export interface ParsedFeed {
  title: string;
  author?: string;
  description?: string;
  imageUrl?: string;
  link?: string;
  language?: string;
  episodes: FeedEpisode[];
}

const AUDIO_EXT = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|mp4)(\?|$)/i;
const MAX_EPISODES = 300;

/** Direct children by local name ("itunes:image" matches "image" in any namespace too). */
function child(el: Element, ...names: string[]): Element | undefined {
  for (const name of names) {
    for (const c of Array.from(el.children)) if (c.nodeName === name || c.localName === name.split(':').pop()) return c;
  }
  return undefined;
}

const text = (el: Element | undefined) => el?.textContent?.trim() || undefined;

/** HTML show notes → plain text, shortened. */
export function plainText(html: string | undefined, max = 600): string | undefined {
  if (!html) return undefined;
  const flat = html
    .replace(/<br\s*\/?>|<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
  return flat.length > max ? `${flat.slice(0, max).replace(/\s+\S*$/, '')}…` : flat || undefined;
}

/** "1:02:03", "62:03", "3723" → milliseconds. */
export function parseDuration(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parts = value.trim().split(':').map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return undefined;
  const seconds = parts.reduce((acc, n) => acc * 60 + n, 0);
  return seconds > 0 ? Math.round(seconds * 1000) : undefined;
}

export class FeedError extends Error {}

export function parseFeed(xml: string): ParsedFeed {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw new FeedError('That address didn’t return a podcast feed.');
  const channel = doc.querySelector('channel');
  if (!channel) throw new FeedError('That address didn’t return a podcast feed.');

  const image = child(channel, 'itunes:image')?.getAttribute('href') ?? text(child(channel, 'image') && child(child(channel, 'image')!, 'url'));
  const episodes: FeedEpisode[] = [];
  for (const item of Array.from(channel.getElementsByTagName('item'))) {
    const enclosure = child(item, 'enclosure');
    const url = enclosure?.getAttribute('url')?.trim();
    const mime = enclosure?.getAttribute('type') ?? undefined;
    if (!url || !(mime?.startsWith('audio') || AUDIO_EXT.test(url))) continue;
    const published = Date.parse(text(child(item, 'pubDate')) ?? '');
    const size = Number(enclosure?.getAttribute('length'));
    episodes.push({
      guid: text(child(item, 'guid')) ?? url,
      title: text(child(item, 'title')) ?? 'Untitled episode',
      url,
      mime,
      sizeBytes: Number.isFinite(size) && size > 0 ? size : undefined,
      publishedAt: Number.isFinite(published) ? published : undefined,
      durationMs: parseDuration(text(child(item, 'itunes:duration'))),
      description: plainText(text(child(item, 'itunes:summary')) ?? text(child(item, 'description'))),
      imageUrl: child(item, 'itunes:image')?.getAttribute('href') ?? undefined,
    });
    if (episodes.length >= MAX_EPISODES) break;
  }
  episodes.sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));

  return {
    title: text(child(channel, 'title')) ?? 'Untitled podcast',
    author: text(child(channel, 'itunes:author')) ?? text(child(channel, 'author')),
    description: plainText(text(child(channel, 'itunes:summary')) ?? text(child(channel, 'description')), 900),
    imageUrl: image,
    link: text(child(channel, 'link')),
    language: text(child(channel, 'language'))?.slice(0, 2).toLowerCase(),
    episodes,
  };
}
