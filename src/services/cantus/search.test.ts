import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fold, titleParts, Vocabulary } from './fuzzy';
import { searchCatalog } from './search';

vi.mock('./spotify', () => ({ spotifyGet: vi.fn() }));

// What Apple and LRCLIB answer, as they did in October 2026, cut down: Apple's search has covers
// of "BAILE INoLVIDABLE" and other artists' "Diles", but none of Bad Bunny's own recordings; his
// catalogue (by artist lookup) has them; LRCLIB knows who sings them.
const BB = 1126808565;
const track = (trackId: number, trackName: string, artistName: string, artistId = trackId + 1, collectionName = `${trackName} - Single`) => ({
  wrapperType: 'track',
  kind: 'song',
  trackId,
  trackName,
  artistName,
  artistId,
  collectionName,
  releaseDate: '2025-01-05T08:00:00Z',
  primaryGenreName: 'Música latina',
  artworkUrl100: `https://is1.mzstatic.com/${trackId}/100x100bb.jpg`,
  previewUrl: `https://audio.example/${trackId}.m4a`,
  trackTimeMillis: 240_000,
});
const BAILE = track(1787022842, 'BAILE INoLVIDABLE', 'Bad Bunny', BB, 'DeBÍ TiRAR MáS FOToS');
const DILES = track(1440841360, 'Diles', 'Bad Bunny, Ozuna, Farruko, Arcángel & Ñengo Flow', BB, 'Diles - Single');
const TITI = track(1622045624, 'Tití Me Preguntó', 'Bad Bunny', BB, 'Un Verano Sin Ti');
const DTMF = track(1787022850, 'DtMF', 'Bad Bunny', BB, 'DeBÍ TiRAR MáS FOToS');
const COVERS = [
  track(901, 'BAILE INoLVIDABLE (Piano Cover)', 'Piano Covers Band'),
  track(902, 'Baile Inolvidable (Karaoke Version)', 'Karaoke Latino Hits'),
  track(903, 'Baile Inolvidable', 'Mariachi Tributo'),
  track(904, 'BAILE INoLVIDABLE (Instrumental)', 'Latin Lounge Tribute'),
];
const OTHER_DILES = [track(911, 'Diles', 'Los Ilegales del Norte'), track(912, 'Diles Que No Me Maten', 'Los Tucanes'), track(913, 'Diles', 'Banda Rosa')];

function answer(url: URL): unknown {
  const term = fold(url.searchParams.get('term') ?? url.searchParams.get('q') ?? '');
  if (url.hostname === 'lrclib.net') {
    if (term.includes('baile inolvidable')) return [{ trackName: 'BAILE INoLVIDABLE', artistName: 'Bad Bunny' }, { trackName: 'BAILE INoLVIDABLE', artistName: 'Bad Bunny' }];
    if (term.includes('diles')) return [{ trackName: 'Diles', artistName: 'Bad Bunny' }, { trackName: 'Diles', artistName: 'Bad Bunny, Ozuna, Farruko, Arcángel & Ñengo Flow' }, { trackName: 'Diles', artistName: 'Los Ilegales del Norte' }];
    if (term === 'bad bunny') return [{ trackName: 'DtMF', artistName: 'Bad Bunny' }];
    return [];
  }
  if (url.pathname === '/lookup') return url.searchParams.get('id') === String(BB) ? { results: [{ wrapperType: 'artist', artistId: BB, artistName: 'Bad Bunny' }, BAILE, DILES, TITI, DTMF] } : { results: [] };
  const entity = url.searchParams.get('entity');
  if (entity === 'musicArtist') return { results: term === 'bad bunny' ? [{ wrapperType: 'artist', artistId: BB, artistName: 'Bad Bunny', primaryGenreName: 'Urbano latino' }] : [] };
  if (entity === 'album') return { results: [] };
  // Songs: the covers for anything with "baile", other artists' Diles, and his hits by his name.
  if (term.includes('baile')) return { results: COVERS };
  if (term.includes('diles')) return { results: OTHER_DILES };
  if (term.startsWith('bad bun')) return { results: [TITI, DTMF] };
  return { results: [] };
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const body = answer(new URL(input));
      return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('searchCatalog', () => {
  it('finds Bad Bunny’s BAILE INoLVIDABLE from its title and his name', async () => {
    const r = await searchCatalog('es', 'baile inolvidable bad bunny');
    expect(r.top).toEqual({ kind: 'song', song: expect.objectContaining({ itunesId: BAILE.trackId }) });
    expect(r.songs[0].itunesId).toBe(BAILE.trackId);
  });

  it('finds Diles with the artist named', async () => {
    const r = await searchCatalog('es', 'Diles Bad Bunny');
    expect(r.top?.kind === 'song' && r.top.song.itunesId).toBe(DILES.trackId);
  });

  it('puts the Diles people sing first for the title alone', async () => {
    const r = await searchCatalog('es', 'diles');
    expect(r.songs[0].itunesId).toBe(DILES.trackId);
    // The others are still there.
    expect(r.songs.map((s) => s.itunesId)).toContain(911);
  });

  it('shows the artist on top for their name', async () => {
    const r = await searchCatalog('es', 'bad bunny');
    expect(r.top).toEqual({ kind: 'artist', artist: expect.objectContaining({ artistId: BB, name: 'Bad Bunny' }) });
    expect(r.songs.every((s) => s.artist.startsWith('Bad Bunny'))).toBe(true);
  });

  it('forgives a typo in the artist', async () => {
    const r = await searchCatalog('es', 'bad bunni');
    expect(r.artists[0]).toMatchObject({ artistId: BB });
    expect(r.top?.kind).toBe('artist');
    expect(r.songs[0].artist).toMatch(/^Bad Bunny/);
  });

  it('puts a typo in the title right and finds the original', async () => {
    const r = await searchCatalog('es', 'baile inolvidabel');
    expect(r.corrected).toBe('baile inolvidable');
    expect(r.songs[0].itunesId).toBe(BAILE.trackId);
    // Covers come after it.
    expect(r.songs.findIndex((s) => s.itunesId === 901)).toBeGreaterThan(0);
  });

  it('searches as typed when asked', async () => {
    const r = await searchCatalog('es', 'baile inolvidabel', { exact: true });
    expect(r.corrected).toBeUndefined();
  });

  it('merges stores without repeating a song', async () => {
    const r = await searchCatalog('es', 'bad bunny');
    const ids = r.songs.map((s) => s.itunesId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('fails only when Apple doesn’t answer at all', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('busy', { status: 503 })));
    await expect(searchCatalog('es', 'diles')).rejects.toThrow(/didn’t answer/);
  });
});

describe('fuzzy', () => {
  it('folds case, accents and punctuation', () => {
    expect(fold('BAILE INoLVIDABLE!')).toBe('baile inolvidable');
    expect(fold('Tití Me Preguntó')).toBe('titi me pregunto');
  });

  it('takes a title apart', () => {
    expect(titleParts('Diles (feat. Arcángel, Ñengo Flow)')).toMatchObject({ base: 'diles', version: '', cover: false });
    expect(titleParts('Despacito (Remix) [feat. Justin Bieber]')).toMatchObject({ base: 'despacito', version: 'remix' });
    expect(titleParts('Baile Inolvidable (Piano Cover)').cover).toBe(true);
  });

  it('corrects a rare word to a common one nearby', () => {
    const v = new Vocabulary();
    for (let i = 0; i < 6; i++) v.add('Baile Inolvidable');
    expect(v.correct('inolvidabel')).toBe('inolvidable');
    expect(v.correct('baile')).toBeNull();
  });
});
