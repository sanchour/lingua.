import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { UiLocale, UiText } from './UiText';
it('renders offline with English hover text and escapes learner values', () => {
  const network = vi.fn(() => { throw new Error('Translation must work offline'); });
  vi.stubGlobal('fetch', network);
  try {
    const view = renderToStaticMarkup(createElement(UiLocale.Provider, { value: 'es' }, createElement(UiText, { source: 'Reload' })));
    expect(view).toContain('title="Reload"');
    expect(view).toContain('lang="es"');
    const learner = renderToStaticMarkup(createElement(UiLocale.Provider, { value: 'ar' }, createElement(UiText, { source: 'A value: {0}', values: ['<script>Save</script>'] })));
    expect(learner).toContain('&lt;script&gt;Save&lt;/script&gt;');
    expect(learner).toContain('dir="auto"');
    expect(network).not.toHaveBeenCalled();
  } finally { vi.unstubAllGlobals(); }
});
it('leaves English markup and rich child structure intact', () => {
  expect(renderToStaticMarkup(createElement(UiText, { source: 'Read {0}', values: [createElement('strong', null, 'Save')] }))).toBe('Read <strong>Save</strong>');
});
