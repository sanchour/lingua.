// Finding and following podcasts: Apple's public podcast directory for search, RSS for episodes.
import { parseFeed } from '@/core/parsers/rss';
import { saveFeed } from '@/data/media';
import type { Feed } from '@/data/types';
import { fetchText } from './net';

export interface PodcastHit {
  title: string;
  author: string;
  feedUrl: string;
  imageUrl?: string;
  genre?: string;
  episodes?: number;
}

/** Where learners of each language tend to start: searched in the directory, not hard-coded feeds. */
export const SUGGESTED_SEARCHES: Record<string, string[]> = {
  en: ['learn english podcast', 'english learning slow', 'bbc learning english'],
  es: ['learn spanish podcast', 'español con juan', 'spanish slow'],
  ru: ['learn russian', 'slow russian', 'russian podcast'],
  pt: ['learn portuguese', 'portuguese podcast', 'brazilian portuguese learning'],
  fr: ['learn french podcast', 'français facile', 'innerfrench'],
  el: ['learn greek', 'greek podcast', 'easy greek'],
  de: ['langsam gesprochene nachrichten', 'easy german', 'learn german podcast'],
  it: ['learn italian podcast', 'podcast italiano', 'italiano lento'],
  sv: ['learn swedish', 'klartext', 'swedish podcast'],
  hu: ['learn hungarian', 'hungarian podcast', 'magyar podcast'],
};

/** Searches Apple's podcast directory (public, no key; returns each show's RSS address). */
export async function searchPodcasts(term: string): Promise<PodcastHit[]> {
  const params = new URLSearchParams({ media: 'podcast', entity: 'podcast', limit: '24', term });
  const res = await fetch(`https://itunes.apple.com/search?${params}`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error('The podcast directory didn’t answer.');
  const data = (await res.json()) as {
    results: Array<{ collectionName?: string; artistName?: string; feedUrl?: string; artworkUrl600?: string; artworkUrl100?: string; primaryGenreName?: string; trackCount?: number }>;
  };
  return data.results
    .filter((r) => r.feedUrl && r.collectionName)
    .map((r) => ({
      title: r.collectionName!,
      author: r.artistName ?? '',
      feedUrl: r.feedUrl!,
      imageUrl: r.artworkUrl600 ?? r.artworkUrl100,
      genre: r.primaryGenreName,
      episodes: r.trackCount,
    }));
}

/** Follows a podcast by its RSS address. Returns the feed id. */
export async function subscribe(lang: string, url: string): Promise<string> {
  const clean = url.trim().replace(/^feed:\/\//i, 'https://');
  return saveFeed(lang, clean, parseFeed(await fetchText(clean)));
}

/** Fetches the newest episodes of a followed podcast. */
export async function refreshFeed(feed: Feed): Promise<void> {
  await saveFeed(feed.lang, feed.url, parseFeed(await fetchText(feed.url)));
}
