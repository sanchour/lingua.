import { describe, expect, it } from 'vitest';
import { youtubeId, youtubeOembed } from './youtube';

describe('YouTube addresses', () => {
  it('finds the id in every shape of link', () => {
    for (const url of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
      'https://m.youtube.com/watch?feature=share&v=dQw4w9WgXcQ',
      'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ?si=abc',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube.com/live/dQw4w9WgXcQ',
      '  https://youtu.be/dQw4w9WgXcQ  ',
    ])
      expect(youtubeId(url), url).toBe('dQw4w9WgXcQ');
  });

  it('refuses what is not a single video', () => {
    for (const url of ['https://www.youtube.com/', 'https://www.youtube.com/@channel', 'https://www.youtube.com/playlist?list=PL123', 'https://example.com/watch?v=dQw4w9WgXcQ', 'https://youtu.be/short', 'dQw4w9WgXcQ', 'not a link'])
      expect(youtubeId(url), url).toBeNull();
  });

  it('asks oEmbed for the watch address', () => {
    expect(youtubeOembed('dQw4w9WgXcQ')).toBe('https://www.youtube.com/oembed?format=json&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ');
  });
});
