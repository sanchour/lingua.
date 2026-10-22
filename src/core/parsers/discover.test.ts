import { describe, expect, it } from 'vitest';
import { gutenbergAuthor, gutenbergMarkdownToChapters, gutenbergSearchResults, mendDropCap, wikiExtractToBlocks } from './discover';

describe('Discover: books and articles from the web', () => {
  it('writes Gutenberg authors the usual way round', () => {
    expect(gutenbergAuthor('Cervantes Saavedra, Miguel de')).toBe('Miguel de Cervantes Saavedra');
    expect(gutenbergAuthor('Dostoyevsky, Fyodor')).toBe('Fyodor Dostoyevsky');
    expect(gutenbergAuthor('Homer')).toBe('Homer');
  });

  it('makes chapters of a book’s headings, leaving out the title page and the contents', () => {
    const md = [
      'Title: Novelas y teatro',
      '',
      'URL Source: https://www.gutenberg.org/cache/epub/15115/pg15115-images.html',
      '',
      'Markdown Content:',
      '## **BIBLIOTECA LITERARIA DEL ESTUDIANTE**',
      '',
      '### **TOMO XXI**',
      '',
      '## [LA GITANILLA](https://www.gutenberg.org/cache/epub/15115/pg15115-images.html#gitanilla)',
      '',
      'Parece que los gitanos y gitanas solamente nacieron en el mundo para ser **ladrones**.',
      '',
      '[![Image 3: ...y corrían los muchachos a verla.](https://www.gutenberg.org/x/d005.png)](https://www.gutenberg.org/x/d005.png)',
      '',
      'Salió Preciosa rica de villancicos,',
      'de coplas y seguidillas.',
      '',
      '## [**LIBRO I**](https://x/#libro)',
      '',
      '### [**CAPITULO XXII**](https://x/#cap)',
      '',
      '> Esto dijo el capitán.',
      '',
      '* * *',
      '',
      '## [INDICE](https://x/#indice)',
      '',
      'LA GITANILLA 5',
    ].join('\n');
    const chapters = gutenbergMarkdownToChapters(md, 'Novelas y teatro');
    expect(chapters.map((c) => c.title)).toEqual(['LA GITANILLA', 'LIBRO I · CAPITULO XXII']);
    expect(chapters[0].blocks).toEqual([
      { t: 'h', text: 'LA GITANILLA' },
      { t: 'p', text: 'Parece que los gitanos y gitanas solamente nacieron en el mundo para ser ladrones.' },
      { t: 'p', text: 'Salió Preciosa rica de villancicos, de coplas y seguidillas.' },
    ]);
    expect(chapters[1].blocks.at(-1)).toEqual({ t: 'quote', text: 'Esto dijo el capitán.' });
  });

  it('mends a drop capital, but not a one-letter word', () => {
    expect(mendDropCap('N UNCA podrá decirse que la infeliz Eva omitió')).toBe('Nunca podrá decirse que la infeliz Eva omitió');
    expect(mendDropCap('C ASI nunca llovía')).toBe('Casi nunca llovía');
    expect(mendDropCap('Y LUEGO SE FUE')).toBe('Y LUEGO SE FUE');
    expect(mendDropCap('В ДОМЕ было тихо')).toBe('В ДОМЕ было тихо');
    expect(mendDropCap('L ES MISÉRABLES')).toBe('LES MISÉRABLES');
  });

  it('reads Gutenberg’s search page, one language only', () => {
    const md = [
      '*   [![Image 2](https://www.gutenberg.org/cache/epub/2000/pg2000.cover.small.jpg)Don Quijote (Spanish)Miguel de Cervantes Saavedra 20145 downloads](https://www.gutenberg.org/ebooks/2000)',
      '*   [![Image 4](https://www.gutenberg.org/cache/epub/20738/pg20738.cover.small.jpg)Diccionario Ingles-Español-Tagalog (Spanish) (Tagalog)Sofronio G. Calderón 8157 downloads](https://www.gutenberg.org/ebooks/20738)',
      '*   [![Image 9](https://www.gutenberg.org/cache/epub/25988/pg25988.cover.small.jpg)Historia de la literatura (tomo II) (Spanish)4,050 downloads](https://www.gutenberg.org/ebooks/25988)',
      '*   [Sort by popularity](https://www.gutenberg.org/ebooks/search/?sort_order=downloads)',
    ].join('\n');
    expect(gutenbergSearchResults(md)).toEqual([
      { id: 2000, title: 'Don Quijote', author: 'Miguel de Cervantes Saavedra', cover: 'https://www.gutenberg.org/cache/epub/2000/pg2000.cover.medium.jpg' },
      { id: 25988, title: 'Historia de la literatura (tomo II)', author: undefined, cover: 'https://www.gutenberg.org/cache/epub/25988/pg25988.cover.medium.jpg' },
    ]);
  });

  it('reads a Wikipedia article without its references and links', () => {
    const extract = [
      'El gato doméstico es un mamífero carnívoro de la familia Felidae.',
      '',
      '== Historia ==',
      'Los gatos conviven con los humanos desde hace unos 10 000 años.',
      '=== En Egipto ===',
      'En el antiguo Egipto eran sagrados.',
      '== Galería ==',
      '== Referencias ==',
      'Smith, J. (2001). Gatos.',
      '=== Bibliografía ===',
      'Otro libro.',
      '== Enlaces externos ==',
      'Wikimedia Commons alberga una categoría multimedia sobre gatos.',
    ].join('\n');
    expect(wikiExtractToBlocks(extract)).toEqual([
      { t: 'p', text: 'El gato doméstico es un mamífero carnívoro de la familia Felidae.' },
      { t: 'h', text: 'Historia' },
      { t: 'p', text: 'Los gatos conviven con los humanos desde hace unos 10 000 años.' },
      { t: 'h', text: 'En Egipto' },
      { t: 'p', text: 'En el antiguo Egipto eran sagrados.' },
    ]);
  });
});
