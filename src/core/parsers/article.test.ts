// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { parseNewsFeed, readerMarkdownToArticle } from './article';

describe('parseNewsFeed', () => {
  it('reads RSS items newest first and skips ones without a link', () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>Noticias</title>
      <item><title>Primera</title><link>https://example.com/1</link><pubDate>Fri, 16 Oct 2026 10:00:00 GMT</pubDate><description>&lt;p&gt;Un &lt;b&gt;resumen&lt;/b&gt;.&lt;/p&gt;</description></item>
      <item><title>Segunda</title><link>https://example.com/2</link><pubDate>Sat, 17 Oct 2026 08:00:00 GMT</pubDate></item>
      <item><title>Sin enlace</title></item>
    </channel></rss>`;
    const items = parseNewsFeed(xml);
    expect(items.map((i) => i.title)).toEqual(['Segunda', 'Primera']);
    expect(items[1].summary).toBe('Un resumen.');
  });

  it('reads Atom entries', () => {
    const xml = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Hír</title><link href="https://example.hu/a"/><updated>2026-10-17T06:00:00Z</updated></entry></feed>`;
    expect(parseNewsFeed(xml)).toEqual([{ title: 'Hír', link: 'https://example.hu/a', published: Date.parse('2026-10-17T06:00:00Z'), summary: undefined }]);
  });
});

describe('readerMarkdownToArticle', () => {
  const answer = [
    'Title: Cada tarde en el parque',
    '',
    'URL Source: https://www.example.es/noticia',
    '',
    'Published Time: 2026-10-16T23:54:15+02:00',
    '',
    'Markdown Content:',
    '* [Portada](https://www.example.es/)',
    '* [España](https://www.example.es/espana)',
    '',
    'Suscríbete a nuestra newsletter.',
    '',
    '# Cada tarde en el parque',
    '',
    'Los vecinos del barrio pasean cada tarde por el parque con sus perros, y [el ayuntamiento](https://example.es/a "a") quiere ampliar los caminos.',
    '',
    '_Escuchar este artículo_',
    '',
    'La obra empezará en primavera y durará unos seis meses, según explicó la alcaldesa en una rueda de prensa.',
    '',
    '> «Es un lugar para todos», dijo una vecina que lleva treinta años en el barrio.',
    '',
    '## Más noticias',
    '',
    '[Otra noticia](https://example.es/otra)',
    '',
    'Aceptamos cookies para mejorar tu experiencia. Puedes cambiar tus preferencias cuando quieras en la configuración.',
  ].join('\n');

  it('keeps the article and drops menus, prompts and banners', () => {
    const a = readerMarkdownToArticle(answer, 'https://www.example.es/noticia');
    expect(a.title).toBe('Cada tarde en el parque');
    expect(a.site).toBe('example.es');
    expect(a.published).toBe(Date.parse('2026-10-16T23:54:15+02:00'));
    expect(a.blocks).toEqual([
      { t: 'h', text: 'Cada tarde en el parque' },
      { t: 'p', text: 'Los vecinos del barrio pasean cada tarde por el parque con sus perros, y el ayuntamiento quiere ampliar los caminos.' },
      { t: 'p', text: 'La obra empezará en primavera y durará unos seis meses, según explicó la alcaldesa en una rueda de prensa.' },
      { t: 'quote', text: '«Es un lugar para todos», dijo una vecina que lleva treinta años en el barrio.' },
    ]);
  });
});
