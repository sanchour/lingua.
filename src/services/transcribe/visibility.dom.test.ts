// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { visibleTask, VisibilityPause } from './visibility';
afterEach(() => vi.restoreAllMocks());
it('starts no transcription while hidden, resumes when visible, and aborts active work on hiding', async () => {
  let state = 'hidden';
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => state as DocumentVisibilityState);
  let signal: AbortSignal | undefined;
  const task = vi.fn((next: AbortSignal) => { signal = next; return new Promise<void>((_, reject) => next.addEventListener('abort', () => reject(next.reason))); });
  const job = visibleTask(task);
  await Promise.resolve(); expect(task).not.toHaveBeenCalled();
  state = 'visible'; document.dispatchEvent(new Event('visibilitychange')); await Promise.resolve();
  expect(task).toHaveBeenCalledOnce();
  const failed = expect(job).rejects.toBeInstanceOf(VisibilityPause);
  state = 'hidden'; document.dispatchEvent(new Event('visibilitychange'));
  await failed; expect(signal?.aborted).toBe(true);
});
