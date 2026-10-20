import { afterEach, describe, expect, it, vi } from 'vitest';
import { findFullSong, parseMusicLink, rankCandidates, scoreCandidate } from './fullsong';

vi.mock('./spotify', () => ({ spotifyTrackId: (s: string) => /open\.spotify\.com\/track\/([A-Za-z0-9]{22})/.exec(s)?.[1] ?? null }));

const SONG = { title: 'BAILE INoLVIDABLE', artist: 'Bad Bunny', durationMs: 367_000 };
const c = (id: string, title: string, channel: string, durationMs?: number, extra = {}) => ({ id, title, channel, durationMs, ...extra });

describe('scoreCandidate', () => {
  it('prefers official audio of the right length', () => {
    const ranked = rankCandidates(SONG, [
      c('vid00000001', 'Bad Bunny - BAILE INoLVIDABLE (Video Oficial)', 'Bad Bunny', 402_000),
      c('aud00000002', 'BAILE INoLVIDABLE', 'Bad Bunny - Topic', 367_500),
      c('lyr00000003', 'Bad Bunny - BAILE INoLVIDABLE (Letra/Lyrics)', 'Musica Letras', 367_000),
    ]);
    expect(ranked[0]).toMatchObject({ id: 'aud00000002', label: 'Official audio' });
  });

  it('never picks live, covers, sped up or another song', () => {
    expect(scoreCandidate(SONG, c('a', 'Bad Bunny - BAILE INoLVIDABLE (Live at Choliseo)', 'Bad Bunny', 370_000))).toBeNull();
    expect(scoreCandidate(SONG, c('b', 'BAILE INoLVIDABLE - Bad Bunny (Piano Cover)', 'Piano Man', 367_000))).toBeNull();
    expect(scoreCandidate(SONG, c('c', 'BAILE INoLVIDABLE sped up', 'Bad Bunny', 300_000))).toBeNull();
    expect(scoreCandidate(SONG, c('d', 'DtMF', 'Bad Bunny - Topic', 237_000))).toBeNull();
    expect(scoreCandidate(SONG, c('e', 'BAILE INoLVIDABLE', 'Some Uploader', 367_000))).toBeNull();
    expect(scoreCandidate(SONG, c('f', 'BAILE INoLVIDABLE', 'Bad Bunny - Topic', 367_000, { live: true }))).toBeNull();
  });

  it('keeps a remix when the song is the remix', () => {
    expect(scoreCandidate({ title: 'Relación (Remix)', artist: 'Sech, Daddy Yankee & J Balvin' }, c('r', 'Sech, Daddy Yankee, J Balvin - Relación (Remix)', 'Sech'))).not.toBeNull();
  });

  it('leaves out what the learner said wasn’t it', () => {
    const list = [c('one00000001', 'BAILE INoLVIDABLE', 'Bad Bunny - Topic', 367_000), c('two00000002', 'BAILE INoLVIDABLE (Video Oficial)', 'Bad Bunny', 380_000)];
    expect(rankCandidates(SONG, list, ['one00000001'])[0].id).toBe('two00000002');
  });
});

describe('findFullSong', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('finds the official audio without a key, and checks it may be embedded', async () => {
    const fetch = vi.fn(async (input: string) => {
      const url = new URL(input);
      if (url.pathname === '/search') {
        return Response.json({ items: [{ url: '/watch?v=aud00000002', type: 'stream', title: 'BAILE INoLVIDABLE', uploaderName: 'Bad Bunny - Topic', duration: 367 }] });
      }
      if (url.pathname === '/oembed') return Response.json({ title: 'BAILE INoLVIDABLE', author_name: 'Bad Bunny - Topic' });
      return new Response('', { status: 404 });
    });
    vi.stubGlobal('fetch', fetch);
    await expect(findFullSong(SONG)).resolves.toMatchObject({ youtubeId: 'aud00000002', label: 'Official audio' });
    // No key: nothing went to Google's Data API.
    expect(fetch.mock.calls.some(([u]) => String(u).includes('googleapis'))).toBe(false);
  });

  it('sends the learner’s key in a header, never in the address', async () => {
    const fetch = vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input);
      if (url.pathname.endsWith('/search')) return Response.json({ items: [{ id: { videoId: 'aud00000002' } }] });
      if (url.pathname.endsWith('/videos')) {
        expect(new Headers(init?.headers).get('X-Goog-Api-Key')).toBe('test-not-a-real-key');
        return Response.json({ items: [{ id: 'aud00000002', snippet: { title: 'BAILE INoLVIDABLE', channelTitle: 'Bad Bunny - Topic' }, contentDetails: { duration: 'PT6M7S' }, status: { embeddable: true } }] });
      }
      return new Response('', { status: 404 });
    });
    vi.stubGlobal('fetch', fetch);
    await expect(findFullSong(SONG, { key: 'test-not-a-real-key' })).resolves.toMatchObject({ youtubeId: 'aud00000002' });
    expect(fetch.mock.calls.every(([u]) => !String(u).includes('test-not-a-real-key'))).toBe(true);
  });
});

describe('parseMusicLink', () => {
  it.each([
    ['https://youtu.be/kJQP7kiw5Fk', { kind: 'youtube', id: 'kJQP7kiw5Fk' }],
    ['https://music.youtube.com/watch?v=kJQP7kiw5Fk&si=x', { kind: 'youtube', id: 'kJQP7kiw5Fk' }],
    ['https://www.youtube.com/shorts/kJQP7kiw5Fk', { kind: 'youtube', id: 'kJQP7kiw5Fk' }],
    ['https://open.spotify.com/track/6habFhsOp2NvshLv26DqMb?si=1', { kind: 'spotify', id: '6habFhsOp2NvshLv26DqMb' }],
    ['https://music.apple.com/es/album/despacito/1447401519?i=1447401620', { kind: 'apple', id: 1447401620 }],
    ['https://music.apple.com/us/song/despacito/1447401620', { kind: 'apple', id: 1447401620 }],
    ['https://soundcloud.com/luisfonsi/despacito?utm=1', { kind: 'soundcloud', url: 'https://soundcloud.com/luisfonsi/despacito' }],
    ['https://vimeo.com/123456789', { kind: 'vimeo', id: '123456789' }],
    ['https://vimeo.com/123456789/abcdef1234', { kind: 'vimeo', id: '123456789/abcdef1234' }],
    ['https://bandcamp.com/EmbeddedPlayer/album=11/size=large/track=22/', { kind: 'bandcamp', url: expect.stringContaining('album=11/track=22/') }],
    ['https://www.dailymotion.com/video/x8abc12', { kind: 'dailymotion', id: 'x8abc12' }],
    ['https://dai.ly/x8abc12', { kind: 'dailymotion', id: 'x8abc12' }],
    ['<iframe src="https://bandcamp.com/EmbeddedPlayer/track=1234567/size=large/"></iframe>', { kind: 'bandcamp' }],
    ['https://artist.bandcamp.com/track/song', { kind: 'bandcamp-page' }],
  ])('%s', (input, expected) => {
    expect(parseMusicLink(input)).toMatchObject(expected);
  });

  it('says no to anything else', () => {
    expect(parseMusicLink('https://example.com/song')).toBeNull();
    expect(parseMusicLink('despacito')).toBeNull();
    expect(parseMusicLink('https://soundcloud.com/search/sounds?q=despacito')).toBeNull();
    expect(parseMusicLink('https://soundcloud.com/artist/sets/my-album')).toBeNull();
  });
});

describe('which versions are never the song', () => {
  const at = (title: string, channel: string) => ({ id: 'x', title, channel, durationMs: 200_000 });
  it('knows Cyrillic, every term, and whole words only', () => {
    expect(scoreCandidate({ title: 'Кукла колдуна', artist: 'Король и Шут', durationMs: 200_000 }, at('Король и Шут - Кукла колдуна (концерт)', 'Король и Шут'))).toBeNull();
    expect(scoreCandidate({ title: 'Despacito (Remix)', artist: 'Luis Fonsi', durationMs: 200_000 }, at('Luis Fonsi - Despacito Remix (Live)', 'Luis Fonsi'))).toBeNull();
    expect(scoreCandidate({ title: 'Despacito (Remix)', artist: 'Luis Fonsi', durationMs: 200_000 }, at('Luis Fonsi - Despacito Remix', 'Luis Fonsi'))).not.toBeNull();
  });

  it("takes a Topic channel only when it is the artist's, and knows VEVO", () => {
    const song = { title: 'Hello', artist: 'Adele', durationMs: 200_000 };
    expect(scoreCandidate(song, at('Hello', 'Some Singer - Topic'))).toBeNull();
    expect(scoreCandidate(song, at('Hello', 'Adele - Topic'))?.label).toBe('Official audio');
    expect(scoreCandidate(song, at('Adele - Hello', 'AdeleVEVO'))?.label).toBe('Music video');
  });
});
