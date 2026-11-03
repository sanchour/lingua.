// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { SavedMark } from './ReadingTools';
import { saveReadingMark } from '@/data/readingMarks';
vi.mock('@/data/readingMarks', () => ({ saveReadingMark: vi.fn(async () => {}), removeReadingMark: vi.fn() }));

it('keeps the newest favourite flag when an unsaved note flushes on navigation', async () => {
  vi.useFakeTimers();
  const el = document.createElement('div'); document.body.append(el); const root = createRoot(el);
  const mark = { id: 'm', chapterIndex: 0, blockIndex: 0, start: 0, end: 3, quote: 'Ana', note: 'first note', colour: 'amber' as const };
  const text = { id: 't', lang: 'es', title: 'Book', kind: 'book' as const, source: 'paste' as const, chapterCount: 1, wordCount: 1, createdAt: 1, updatedAt: 1 };
  try {
    await act(async () => root.render(createElement(SavedMark, { mark, text, onJump: () => {} })));
    // A newer row arrives before unmount; the local note still needs flushing.
    await act(async () => root.render(createElement(SavedMark, { mark: { ...mark, favourite: true, note: '' }, text, onJump: () => {} })));
    await act(async () => root.unmount());
    expect(saveReadingMark).toHaveBeenLastCalledWith('t', expect.objectContaining({ favourite: true, note: 'first note' }));
  } finally { el.remove(); vi.useRealTimers(); vi.clearAllMocks(); }
});
