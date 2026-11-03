// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { ReadAloud } from './ReadAloud';
import { speak, stopSpeaking } from '@/services/speech/voice';
vi.mock('@/features/speech/SpeakButton', () => ({ useSpeaker: () => ({ speaker: { kind: 'device' }, flag: undefined }) }));
vi.mock('@/services/speech/voice', () => ({ speak: vi.fn(), stopSpeaking: vi.fn() }));

it('follows every sentence across blocks and stops before another sentence on cancellation', async () => {
  const el = document.createElement('div'); document.body.append(el); const root = createRoot(el);
  const follow = vi.fn(), onPlaying = vi.fn(); let finish: () => void = () => {};
  vi.mocked(speak).mockImplementation(async (_lang, _text, opts) => { opts?.onStart?.(); await new Promise<void>((resolve) => { finish = resolve; }); });
  const chapter = { id: 'c', textId: 't', index: 0, wordCount: 4, blocks: [{ t: 'p' as const, text: 'Ana lee. Ana escribe.' }, { t: 'p' as const, text: 'Fin.' }] };
  try {
    await act(async () => root.render(createElement(ReadAloud, { chapter, lang: 'es', follow, onPlaying })));
    await act(async () => el.querySelector('button')!.click());
    expect(speak).toHaveBeenCalledTimes(1); expect(follow).toHaveBeenCalledWith(0, 0, 9);
    expect(onPlaying).toHaveBeenLastCalledWith(true);
    await act(async () => finish()); expect(speak).toHaveBeenCalledTimes(2);
    await act(async () => finish()); expect(speak).toHaveBeenCalledTimes(3);
    await act(async () => el.querySelector('button')!.click());
    await act(async () => finish());
    expect(speak).toHaveBeenCalledTimes(3); expect(stopSpeaking).toHaveBeenCalled(); expect(follow).toHaveBeenLastCalledWith(-1, 0, 0);
    expect(onPlaying).toHaveBeenLastCalledWith(false);
  } finally { await act(async () => root.unmount()); el.remove(); vi.clearAllMocks(); }
});
