import { describe, expect, it } from 'vitest';
import { WRITING_TASKS, writingTaskPrompt, writingTimerMs } from './tasks';

describe('writing tasks', () => {
  it('keeps a stable id, brief and positive length for every task', () => {
    expect(WRITING_TASKS).toHaveLength(26);
    expect(new Set(WRITING_TASKS.map((t) => t.id)).size).toBe(26);
    expect(WRITING_TASKS.every((t) => t.title && t.brief && t.minWords > 0 && t.maxWords >= t.minWords)).toBe(true);
  });

  it('keeps the brief, length and learner’s own source material together', () => {
    const task = { id: 'test', title: 'Test', brief: 'Write a reply.', minWords: 30, maxWords: 60 };
    expect(writingTaskPrompt(task, '  hola, gracias  ')).toBe('Write a reply.\nAim for 30–60 words.\n\nYour material:\nhola, gracias');
    expect(writingTaskPrompt(task, '  ')).toBe('Write a reply.\nAim for 30–60 words.');
  });

  it('counts elapsed time only while the optional timer runs', () => {
    expect(writingTimerMs(2500, null, 10000)).toBe(2500);
    expect(writingTimerMs(2500, 10000, 12000)).toBe(4500);
    expect(writingTimerMs(2500, 10000, 9000)).toBe(2500);
  });
});
