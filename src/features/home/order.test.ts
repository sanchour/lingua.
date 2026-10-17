import { describe, expect, it } from 'vitest';
import { orderSteps } from './order';

const steps = ['review', 'read', 'listen', 'watch', 'write'].map((key) => ({ key }));
const keys = (list: Array<{ key: string }>) => list.map((s) => s.key);

describe('orderSteps', () => {
  it('keeps the usual order when nothing was chosen', () => {
    expect(keys(orderSteps(steps, []))).toEqual(['review', 'read', 'listen', 'watch', 'write']);
  });

  it('puts what you enjoy first, in your order', () => {
    expect(keys(orderSteps(steps, ['writing', 'cards']))).toEqual(['write', 'review', 'read', 'listen', 'watch']);
  });

  it('never lets due cards fall below second place', () => {
    expect(keys(orderSteps(steps, ['watching', 'listening', 'reading']))).toEqual(['watch', 'review', 'listen', 'read', 'write']);
  });

  it('counts a suggestion to find something as its kind', () => {
    expect(keys(orderSteps([{ key: 'write' }, { key: 'find-watch' }], ['watching']))).toEqual(['find-watch', 'write']);
  });
});
