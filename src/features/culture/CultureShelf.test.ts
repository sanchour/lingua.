import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { expect, it, vi } from 'vitest';
vi.mock('@/features/codex/reader/AddToDeck', () => ({ AddToDeck: () => null }));
import { CultureNoteView, CultureWordNotes } from './CultureShelf';
import { CULTURE_NOTES } from '@/core/culture/notes';
it('renders sourced notes, examples and word links, with direction for Arabic', () => {
  const note = CULTURE_NOTES.find((n) => n.id === 'ar-inshallah')!;
  const html = renderToStaticMarkup(createElement(CultureNoteView, { note }));
  expect(html).toContain('dir="rtl"'); expect(html).toContain('A moment to try'); expect(html).toContain(note.source.url.replaceAll('&', '&amp;')); expect(html).toContain('Regional voices');
  const links = renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(CultureWordNotes, { lang: 'es', word: 'sobremesa' })));
  expect(links).toContain('/mentis/culture?note=es-sobremesa');
});
