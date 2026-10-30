import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { UiLocale, UiMessageText, UiText } from './UiText';
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

it('keeps missing value slots visible instead of silently deleting them', () => {
  expect(renderToStaticMarkup(createElement(UiText, { source: 'Reference {2}' }))).toBe('Reference {2}');
});
it('localizes structured notifications without translating literal learner titles', () => {
  const input = { source: 'Exported “{0}” (.csv).', values: ['Home <script>'] };
  const html = renderToStaticMarkup(createElement(UiLocale.Provider, { value: 'es' }, createElement(UiMessageText, { message: input })));
  expect(html).toContain('Home &lt;script&gt;');
  expect(html).not.toContain('Inicio');
  expect(html).toContain('title="Exported');
  const nested = renderToStaticMarkup(createElement(UiMessageText, { message: { source: 'Added {0} to {1}{2}', values: [{ source: '{0} words', values: ['2'] }, 'Home', ''] } }));
  expect(nested).toBe('Added 2 words to Home');
});
