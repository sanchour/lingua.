// @vitest-environment happy-dom
// (happy-dom has no CDATA support; real feeds with CDATA are parsed by the browser.)
import { describe, expect, it } from 'vitest';
import { FeedError, parseDuration, parseFeed } from './rss';

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Langsam gesprochene Nachrichten</title>
    <itunes:author>DW</itunes:author>
    <description>&lt;p&gt;News, &lt;b&gt;slowly&lt;/b&gt; &amp;amp; clearly.&lt;/p&gt;</description>
    <language>de-DE</language>
    <itunes:image href="https://example.org/cover.jpg"/>
    <item>
      <title>Older</title>
      <guid>ep-1</guid>
      <pubDate>Mon, 12 Oct 2026 08:00:00 GMT</pubDate>
      <enclosure url="https://example.org/1.mp3" type="audio/mpeg" length="1200"/>
      <itunes:duration>05:30</itunes:duration>
    </item>
    <item>
      <title>Newer</title>
      <pubDate>Tue, 13 Oct 2026 08:00:00 GMT</pubDate>
      <enclosure url="https://example.org/2.m4a?x=1" type="" length="0"/>
      <itunes:duration>1:00:01</itunes:duration>
    </item>
    <item>
      <title>Video only</title>
      <enclosure url="https://example.org/3.pdf" type="application/pdf"/>
    </item>
  </channel>
</rss>`;

describe('podcast feeds', () => {
  it('reads the channel and its audio episodes, newest first', () => {
    const feed = parseFeed(FEED);
    expect(feed.title).toBe('Langsam gesprochene Nachrichten');
    expect(feed.author).toBe('DW');
    expect(feed.description).toBe('News, slowly & clearly.');
    expect(feed.imageUrl).toBe('https://example.org/cover.jpg');
    expect(feed.language).toBe('de');
    expect(feed.episodes.map((e) => e.title)).toEqual(['Newer', 'Older']);
    expect(feed.episodes[1]).toMatchObject({ guid: 'ep-1', url: 'https://example.org/1.mp3', durationMs: 330_000, sizeBytes: 1200 });
    expect(feed.episodes[0]).toMatchObject({ guid: 'https://example.org/2.m4a?x=1', durationMs: 3_601_000 });
  });

  it('rejects pages that are not feeds', () => {
    expect(() => parseFeed('<html><body>Hello</body></html>')).toThrow(FeedError);
  });

  it('reads durations in seconds or clock notation', () => {
    expect(parseDuration('3723')).toBe(3_723_000);
    expect(parseDuration('62:03')).toBe(3_723_000);
    expect(parseDuration('nonsense')).toBeUndefined();
  });
});
