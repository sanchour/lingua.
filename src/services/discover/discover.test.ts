// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { sourceHtmlToBlocks, wikiHost } from './discover';

describe('Discover', () => {
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
