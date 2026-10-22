import { afterEach, describe, expect, it, vi } from 'vitest';
import { isbnCovers, searchCover } from './covers';

const answer = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));

afterEach(() => vi.unstubAllGlobals());

describe('Goodreads covers from Open Library', () => {
  it('asks for many ISBNs at once and leaves out "no cover"', async () => {
    const fetch = answer({
      'ISBN:9780439023481': { cover: { medium: 'https://covers.openlibrary.org/b/id/15261620-M.jpg' } },
      'ISBN:9780060883287': { cover: { medium: 'https://covers.openlibrary.org/b/id/-1-M.jpg' } },
      'ISBN:9780000000000': {},
    });
    vi.stubGlobal('fetch', fetch);
    const covers = await isbnCovers(['9780439023481', '9780060883287', '9780000000000']);
    expect([...covers]).toEqual([['9780439023481', 'https://covers.openlibrary.org/b/id/15261620-M.jpg']]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0]).includes('bibkeys=ISBN%3A9780439023481%2CISBN%3A9780060883287')).toBe(true);
  });

  it('finds a cover by title and author: the best match that has one', async () => {
    const fetch = answer({ docs: [{ title: 'Don Quixote Annotated' }, { cover_i: 13846974 }] });
    vi.stubGlobal('fetch', fetch);
    expect(await searchCover('Don Quixote (Penguin Classics)', 'Miguel de Cervantes')).toBe('https://covers.openlibrary.org/b/id/13846974-M.jpg');
    expect(String(fetch.mock.calls[0])).toContain('title=Don+Quixote&');
    vi.stubGlobal('fetch', answer({ docs: [] }));
    expect(await searchCover('Nothing', undefined)).toBe('');
  });
});
