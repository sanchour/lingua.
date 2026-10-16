// @vitest-environment happy-dom
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { parseEpub } from './epub';

async function makeEpub(): Promise<File> {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip');
  zip.file('META-INF/container.xml', `<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Белые ночи</dc:title><dc:creator>Ф. Достоевский</dc:creator></metadata>
     <manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="c1" href="text/ch1.xhtml" media-type="application/xhtml+xml"/><item id="c2" href="text/ch2.xhtml" media-type="application/xhtml+xml"/><item id="img" href="images/pic.png" media-type="image/png"/></manifest>
     <spine><itemref idref="c1"/><itemref idref="c2"/></spine></package>`,
  );
  zip.file('OEBPS/nav.xhtml', `<html xmlns="http://www.w3.org/1999/xhtml"><body><nav><ol><li><a href="text/ch1.xhtml">Ночь первая</a></li><li><a href="text/ch2.xhtml#start">Ночь вторая</a></li></ol></nav></body></html>`);
  zip.file('OEBPS/text/ch1.xhtml', `<html xmlns="http://www.w3.org/1999/xhtml"><body><h2>Ночь первая</h2><p>Была чудная ночь.</p><div><p>Такая ночь, <em>какая</em> только может быть.</p></div><blockquote><p>Цитата.</p></blockquote><p><img src="../images/pic.png" alt="рисунок"/></p></body></html>`);
  zip.file('OEBPS/text/ch2.xhtml', `<html xmlns="http://www.w3.org/1999/xhtml"><body><div>Простой текст в div.</div></body></html>`);
  zip.file('OEBPS/images/pic.png', new Uint8Array([137, 80, 78, 71]));
  const bytes = await zip.generateAsync({ type: 'uint8array' });
  return new File([bytes as Uint8Array<ArrayBuffer>], 'nights.epub', { type: 'application/epub+zip' });
}

describe('parseEpub', () => {
  it('extracts metadata, TOC titles, blocks and images', async () => {
    const book = await parseEpub(await makeEpub());
    expect(book.title).toBe('Белые ночи');
    expect(book.author).toBe('Ф. Достоевский');
    expect(book.chapters.map((c) => c.title)).toEqual(['Ночь первая', 'Ночь вторая']);
    expect(book.chapters[0].blocks.map((b) => b.t)).toEqual(['h', 'p', 'p', 'quote', 'img']);
    expect(book.chapters[0].blocks[2]).toEqual({ t: 'p', text: 'Такая ночь, какая только может быть.' });
    expect(book.chapters[1].blocks).toEqual([{ t: 'p', text: 'Простой текст в div.' }]);
    expect(book.images).toHaveLength(1);
  });
});
