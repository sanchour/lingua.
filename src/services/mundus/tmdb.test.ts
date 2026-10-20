// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkToken, discoverTitles, findTitle, isV3Key, whereToWatch } from './tmdb';

const TOKEN = 'test-not-a-real-key';

function fakeFetch(answer: (url: URL) => unknown, status = 200) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
    const url = new URL(String(input));
    // The key travels in the header only, never in the address.
    expect(url.search).not.toContain(TOKEN);
    return new Response(JSON.stringify(answer(url)), { status });
  }) as unknown as typeof fetch;
}

beforeEach(() => localStorage.clear());

describe('TMDB', () => {
  it('turns down the short v3 key, which only works in an address', async () => {
    expect(isV3Key('0123456789abcdef0123456789abcdef')).toBe(true);
    expect(isV3Key('eyJhbGciOiJIUzI1NiJ9.x.y')).toBe(false);
    expect(await checkToken('0123456789abcdef0123456789abcdef')).toBe(false);
  });

  it('checks a token in the Authorization header', async () => {
    expect(await checkToken(TOKEN, fakeFetch(() => ({ success: true })))).toBe(true);
    expect(await checkToken(TOKEN, fakeFetch(() => ({ success: false, status_code: 7 }), 401))).toBe(false);
  });

  it('asks for titles originally in the language on the chosen services, and keeps the answer', async () => {
    const fetcher = fakeFetch((url) => {
      expect(url.pathname).toBe('/3/discover/tv');
      expect(url.searchParams.get('with_original_language')).toBe('no');
      expect(url.searchParams.get('watch_region')).toBe('NL');
      expect(url.searchParams.get('with_watch_providers')).toBe('8|1899');
      return { results: [{ id: 1, name: 'Skam', original_name: 'Skam', overview: 'Om ungdom', poster_path: '/p.jpg', first_air_date: '2015-09-25', vote_average: 8.4 }] };
    });
    const titles = await discoverTitles({ lang: 'nb', region: 'NL', type: 'tv', providerIds: [8, 1899] }, TOKEN, fetcher);
    expect(titles[0]).toMatchObject({ id: 1, type: 'tv', title: 'Skam', year: 2015, posterPath: '/p.jpg' });
    await discoverTitles({ lang: 'nb', region: 'NL', type: 'tv', providerIds: [8, 1899] }, TOKEN, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(await discoverTitles({ lang: 'nb', region: 'NL', type: 'tv', providerIds: [] }, TOKEN, fetcher)).toEqual([]);
  });

  it('finds a pick by its original language and says where it streams', async () => {
    const fetcher = fakeFetch((url) => {
      if (url.pathname === '/3/search/tv') {
        return { results: [{ id: 9, name: 'Dark (US)', original_language: 'en' }, { id: 70523, name: 'Dark', original_name: 'Dark', original_language: 'de', first_air_date: '2017-12-01' }] };
      }
      return { results: { NL: { link: 'https://www.themoviedb.org/tv/70523/watch?locale=NL', flatrate: [{ provider_id: 8, provider_name: 'Netflix' }], ads: [{ provider_id: 8, provider_name: 'Netflix' }], buy: [{ provider_id: 2, provider_name: 'Apple TV' }] } } };
    });
    const found = await findTitle({ title: 'Dark', year: 2017, type: 'tv', lang: 'de' }, TOKEN, fetcher);
    expect(found?.id).toBe(70523);
    const where = await whereToWatch('tv', 70523, 'NL', TOKEN, fetcher);
    expect(where.stream).toEqual([{ provider_id: 8, provider_name: 'Netflix' }]);
    expect(where.rentOrBuy).toHaveLength(1);
    expect((await whereToWatch('tv', 70523, 'JP', TOKEN, fetcher)).stream).toEqual([]);
  });
});
