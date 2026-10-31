// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { MemoryRouter } from 'react-router';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => ({ word: 'casa', gloss: 'house' }) }));
vi.mock('@/data/decks', () => ({ useDecks: () => [], addNote: vi.fn() }));
vi.mock('@/features/thesaurus/study/StudyPage', () => ({ default: () => createElement('button', {}, 'Study engine control') }));
import { DailyWordCard } from './DailyWordCard';
const container = document.createElement('div'); document.body.append(container);
const root = createRoot(container);
afterEach(async () => { await act(async () => root.render(null)); Reflect.deleteProperty(window, 'documentPictureInPicture'); vi.restoreAllMocks(); });
it('hides unsupported floating review and portals the shared study view into a supported window, closing it on unmount', async () => {
  await act(async () => root.render(createElement(MemoryRouter, {}, createElement(DailyWordCard, { lang: 'es' }))));
  expect(container.textContent).not.toContain('Floating review');
  const pip = { document: document.implementation.createHTMLDocument('Review'), addEventListener: vi.fn(), close: vi.fn() };
  const requestWindow = vi.fn(async () => pip);
  Object.defineProperty(window, 'documentPictureInPicture', { configurable: true, value: { requestWindow } });
  await act(async () => root.render(createElement(MemoryRouter, {}, createElement(DailyWordCard, { lang: 'es' }))));
  const button = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Floating review');
  expect(button).toBeTruthy();
  await act(async () => button!.click());
  await vi.waitFor(() => expect(pip.document.body.textContent).toContain('Study engine control'));
  expect(requestWindow).toHaveBeenCalledWith({ width: 520, height: 680 });
  expect(pip.document.querySelector('base')?.href).toBe(document.baseURI);
  await act(async () => root.render(null));
  expect(pip.close).toHaveBeenCalledOnce();
});
