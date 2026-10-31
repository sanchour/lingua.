// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { useDraft } from './useDraft';
it('saves the last slider edit when navigating away before the debounce finishes', async () => {
  vi.useFakeTimers();
  const commit = vi.fn();
  function Setting() { const [value, update] = useDraft<number>(0, commit); return createElement('button', { onClick: () => update(value + 1) }, String(value)); }
  const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
  try {
    await act(async () => root.render(createElement(Setting)));
    await act(async () => container.querySelector('button')!.click());
    expect(commit).not.toHaveBeenCalled();
    await act(async () => root.unmount());
    expect(commit).toHaveBeenCalledExactlyOnceWith(1);
    vi.runAllTimers(); expect(commit).toHaveBeenCalledOnce();
  } finally { container.remove(); vi.useRealTimers(); }
});
