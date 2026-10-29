import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ParallelColumns } from './ParallelReading';
it('keeps the original and counterpart in labelled language-aware columns without executing markup', () => {
  const html = renderToStaticMarkup(createElement(ParallelColumns, { source: 'Ana lee.\n\nOtro párrafo.', lang: 'es', other: '<script>unsafe</script>', otherLang: 'en', title: 'Simplified version · Max' }));
  expect(html).toContain('Original passage');
  expect(html).toContain('Simplified version · Max');
  expect(html).toContain('lang="es"'); expect(html).toContain('lang="en"');
  expect(html).toContain('&lt;script&gt;'); expect(html).not.toContain('<script>');
});
