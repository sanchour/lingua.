// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { UiLocale, UiText } from './UiText';
it('keeps an editable child and its draft when a translation reorders value slots', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const render = (locale: string) => createElement(UiLocale.Provider, { value: locale }, createElement(UiText, { source: 'Found {0} matching {1} for "{2}":', values: [createElement('input', { defaultValue: 'starting' }), 'items', 'query'] }));
  try {
    await act(async () => root.render(render('en')));
    const input = container.querySelector('input')!;
    input.value = 'a draft to keep';
    await act(async () => root.render(render('zh')));
    expect(container.querySelector('input')).toBe(input);
    expect(input.value).toBe('a draft to keep');
    expect(container.textContent).toContain('query');
  } finally {
    await act(async () => root.unmount());
    container.remove(); vi.unstubAllGlobals();
  }
});
