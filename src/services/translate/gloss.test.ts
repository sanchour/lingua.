import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { firstAnswer } from './gloss';

const after = (ms: number, value: string | null) => () => new Promise<string | null>((resolve) => setTimeout(() => resolve(value), ms));
const fails = (ms: number) => () => new Promise<string | null>((_, reject) => setTimeout(() => reject(new Error('down')), ms));

describe('firstAnswer (hedged online lookups)', () => {
  beforeEach(() => void vi.useFakeTimers());
  afterEach(() => void vi.useRealTimers());

  it('uses a quick first answer without asking anyone else', async () => {
    const second = vi.fn(after(10, 'two'));
    const result = firstAnswer([after(100, 'one'), second]);
    await vi.advanceTimersByTimeAsync(100);
    await expect(result).resolves.toBe('one');
    expect(second).not.toHaveBeenCalled();
  });

  it('asks the next provider when the first is slow, and takes whichever answers first', async () => {
    const result = firstAnswer([after(3000, 'slow'), after(200, 'fast')]);
    await vi.advanceTimersByTimeAsync(1100); // 900 ms hedge + 200 ms
    await expect(result).resolves.toBe('fast');
  });

  it('moves on at once when a provider fails or finds nothing', async () => {
    const result = firstAnswer([fails(50), after(50, null), after(50, 'third')]);
    await vi.advanceTimersByTimeAsync(150);
    await expect(result).resolves.toBe('third');
  });

  it('still waits for a slow provider after a faster one comes back empty', async () => {
    const result = firstAnswer([after(2000, 'late'), after(100, null)]);
    await vi.advanceTimersByTimeAsync(2000);
    await expect(result).resolves.toBe('late');
  });

  it('gives null when nobody knows', async () => {
    const result = firstAnswer([after(10, null), fails(10)]);
    await vi.advanceTimersByTimeAsync(50);
    await expect(result).resolves.toBeNull();
  });
});
