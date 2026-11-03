// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { sourceHtmlToBlocks, wikiHost, wikisourceSearch, importWikiReading } from './discover';
import { addText } from '@/data/library';
vi.mock('@/data/library', () => ({ addText: vi.fn(async () => 'imported') }));

describe('Discover', () => {
  it('keeps recipe ingredients, instruction lists and table rows once, without page navigation', () => {
    expect(sourceHtmlToBlocks('<div id="toc"><ul><li>Contents</li></ul></div><h2>Pan</h2><ul><li><p>Harina</p></li><li>Agua</li></ul><ol><li>Mezclar.</li></ol><table><tr><td>Harina</td><td>200 g</td></tr></table>', true)).toEqual([{ t: 'h', text: 'Pan' }, { t: 'p', text: 'Harina' }, { t: 'p', text: 'Agua' }, { t: 'p', text: 'Mezclar.' }, { t: 'p', text: 'Harina · 200 g' }]);
  });
  it('unwraps recipe layout rows and drops unlabelled link-index navigation', () => {
    const navigation = '<table><tr><th>Glosario</th></tr><tr><td><p>' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c) => `<a href="/wiki/${c}">${c}</a>`).join(' - ') + '</p></td></tr></table>';
    expect(sourceHtmlToBlocks(`<table><tr><td><p>4 personas</p>${navigation}</td></tr></table><table><tr><td><p>Ingredientes</p><ul><li>1/2 cebolla</li><li>Pan</li></ul></td><td><p>Procedimiento</p><p>Mezclar.</p></td></tr></table>`, true)).toEqual([{ t: 'p', text: '4 personas' }, { t: 'p', text: 'Ingredientes' }, { t: 'p', text: '1/2 cebolla' }, { t: 'p', text: 'Pan' }, { t: 'p', text: 'Procedimiento' }, { t: 'p', text: 'Mezclar.' }]);
  });
  it('searches and imports Wikibooks subpages and Wikivoyage with their own source URLs', async () => {
    vi.stubGlobal('navigator', { onLine: true });
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ query: { search: [{ title: 'Cocina/Pan', snippet: 'Un <b>pan</b>' }] } }) }).mockResolvedValue({ ok: true, json: async () => ({ parse: { title: 'Cocina/Pan', text: '<div class="mw-parser-output"><p>Mezcla agua y harina.</p></div>' } }) });
    vi.stubGlobal('fetch', fetcher);
    try {
      const hits = await wikisourceSearch('es', 'pan', 'wikibooks');
      expect(hits[0]).toMatchObject({ title: 'Cocina/Pan', snippet: 'Un pan', url: 'https://es.wikibooks.org/wiki/Cocina%2FPan' });
      expect(await importWikiReading('es', hits[0], 'wikibooks')).toBe('imported');
      expect(addText).toHaveBeenLastCalledWith(expect.objectContaining({ sourceUrl: hits[0].url, author: 'wikibooks', chapters: [{ blocks: [{ t: 'p', text: 'Mezcla agua y harina.' }] }] }));
      await importWikiReading('es', { title: 'Madrid', url: 'ignored', snippet: '' }, 'wikivoyage');
      expect(fetcher.mock.calls.at(-1)?.[0]).toContain('https://es.wikivoyage.org/w/api.php');
      expect(addText).toHaveBeenLastCalledWith(expect.objectContaining({ sourceUrl: 'https://es.wikivoyage.org/wiki/Madrid' }));
    } finally { vi.unstubAllGlobals(); vi.clearAllMocks(); }
  });
  it('reads a Wikisource page without its furniture', () => {
    const html = `<div class="mw-parser-output">
      <div id="headertemplate"><p>← Capítulo I · Don Quijote · Capítulo III →</p></div>
      <h2>Capítulo II<span class="mw-editsection">[editar]</span></h2>
      <p>Hechas, pues, estas prevenciones,<sup class="reference">[1]</sup> no quiso aguardar más tiempo.</p>
      <span class="pagenum">12</span>
      <blockquote><p>Dichosa edad y siglos dichosos.</p></blockquote>
      <div class="poem"><p>En un lugar de la Mancha<br>de cuyo nombre no quiero acordarme</p></div>
      <table><tr><td><p>Índice</p></td></tr></table>
      <ol class="references"><li>Nota.</li></ol>
    </div>`;
    expect(sourceHtmlToBlocks(html)).toEqual([
      { t: 'h', text: 'Capítulo II' },
      { t: 'p', text: 'Hechas, pues, estas prevenciones, no quiso aguardar más tiempo.' },
      { t: 'quote', text: 'Dichosa edad y siglos dichosos.' },
      { t: 'p', text: 'En un lugar de la Mancha de cuyo nombre no quiero acordarme' },
    ]);
  });

  it('names the wikis as Wikimedia does', () => {
    expect(wikiHost('es', 'wikipedia')).toBe('https://es.wikipedia.org');
    expect(wikiHost('nb', 'wikisource')).toBe('https://no.wikisource.org');
  });
});
