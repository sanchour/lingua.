// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
const { workers } = vi.hoisted(() => ({ workers: [] as Array<{ terminated: boolean; messages: unknown[]; onmessage: ((event: MessageEvent) => void) | null }> }));
vi.mock('@/workers/whisper.worker?worker', () => ({ default: class {
  terminated = false;
  messages: unknown[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  constructor() { workers.push(this); }
  postMessage(message: unknown) { this.messages.push(message); }
  terminate() { this.terminated = true; }
} }));
import { whisperOnDevice } from './device';
afterEach(() => vi.restoreAllMocks());
it('stops the local worker while hidden and restarts with intact samples, without a real model', async () => {
  let state = 'visible';
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => state as DocumentVisibilityState);
  const samples = new Float32Array([0.1, 0.2]);
  const job = whisperOnDevice(samples, 'es', 'tiny');
  await vi.waitFor(() => expect(workers).toHaveLength(1));
  state = 'hidden'; document.dispatchEvent(new Event('visibilitychange'));
  await vi.waitFor(() => expect(workers[0].terminated).toBe(true));
  expect(workers).toHaveLength(1);
  state = 'visible'; document.dispatchEvent(new Event('visibilitychange'));
  await vi.waitFor(() => expect(workers).toHaveLength(2));
  expect(workers[1].messages[0]).toMatchObject({ samples });
  expect(samples.byteLength).toBe(8);
  const result = { segments: [{ start: 0, end: 1, text: 'Hola' }] };
  workers[1].onmessage?.(new MessageEvent('message', { data: { type: 'done', result } }));
  await expect(job).resolves.toEqual(result);
});
