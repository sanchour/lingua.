import { afterEach, expect, it, vi } from 'vitest';
import { recordingsForWord } from './recordings';
afterEach(() => vi.unstubAllGlobals());
it('uses the existing index, keeps region-labelled clips and retries an unavailable index', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(new Response('', { status: 503 })).mockImplementation(async () => new Response(JSON.stringify({ words: { hola: [['a/aa', 'LL-Q1-spa-speaker-hola.wav', 'Spain'], ['b/bb', 'Es-hola.ogg', 'Mexico'], ['c/cc', 'LL-Q1-spa-other-hola.wav', '']] } })));
  vi.stubGlobal('fetch', fetcher);
  await expect(recordingsForWord('es', 'hola')).rejects.toThrow('unavailable');
  expect(await recordingsForWord('es', 'hola')).toEqual([['a/aa', 'LL-Q1-spa-speaker-hola.wav', 'Spain'], ['b/bb', 'Es-hola.ogg', 'Mexico']]);
  expect(await recordingsForWord('es', 'missing')).toEqual([]);
  expect(await recordingsForWord('xx', 'hola')).toEqual([]);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
