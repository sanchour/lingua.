import { describe, expect, it } from 'vitest';
import { talkPath, todayPrompt } from './today';
import type { Recent } from './today';

const week: Recent[] = [
  { title: 'Lupin', lane: 'watch', at: 3 },
  { title: 'El principito', lane: 'read', at: 2 },
  { title: 'Radio Ambulante', lane: 'listen', at: 1 },
];

describe('todayPrompt', () => {
  it('writes and talks about two different things from this week', () => {
    const { write, talk } = todayPrompt('es', 'B1', week, 0);
    expect(write.about).toBe('Lupin');
    expect(write.en).toContain('a scene you remember');
    expect(talk.about).toBe('El principito');
    expect(talk.title).toBe('Talk about El principito');
    expect(talkPath(talk)).toBe('/mentis/sermo?topic=El%20principito');
  });

  it('turns by day', () => {
    expect(todayPrompt('es', 'B1', week, 1).write.about).toBe('El principito');
    expect(todayPrompt('es', 'B1', week, 2).write.about).toBe('Radio Ambulante');
  });

  it('keeps it simple at a low level', () => {
    expect(todayPrompt('es', 'A1', week, 0).talk.detail).toContain('short sentences');
    expect(todayPrompt('es', 'B2', week, 0).talk.detail).toContain('Retell');
  });

  it('falls back to the prompt and the scene of the day', () => {
    const { write, talk } = todayPrompt('es', 'A2', [], 5);
    expect(write.about).toBeUndefined();
    expect(write.text.length).toBeGreaterThan(0);
    expect(talk.scene).toBeDefined();
    expect(talkPath(talk)).toBe(`/mentis/sermo?scene=${talk.scene}`);
  });

  it('uses one thing for both when there is only one', () => {
    const { write, talk } = todayPrompt('fr', 'B1', [week[0]], 4);
    expect(write.about).toBe('Lupin');
    expect(talk.about).toBe('Lupin');
  });
});
