import { describe, expect, it, vi } from 'vitest';
import type { Turn } from './client';
import { nextTurn, readTurn } from './colloquium';

const sent: Array<{ system: string; turns: Turn[] }> = [];
vi.mock('./client', () => ({
  chatJson: vi.fn(async (system: string, turns: Turn[]) => {
    sent.push({ system, turns });
    return { reply: 'Muy bien. ¿Y tú?', english: 'Very good. And you?', corrections: [{ original: 'yo es', suggestion: 'yo soy', explanation: 'Ser: yo soy.' }], words: [] };
  }),
}));

describe('readTurn', () => {
  it('keeps the reply, its English and the words, trimmed', () => {
    const t = readTurn({ reply: '  Hola  ', english: ' Hello ', corrections: [], words: [{ word: ' hola ', meaning: 'hello' }] }, undefined);
    expect(t).toEqual({ reply: 'Hola', en: 'Hello', corrections: [], words: [{ word: 'hola', meaning: 'hello' }] });
  });

  it('refuses an empty answer', () => {
    expect(() => readTurn({ reply: '  ' }, 'hola')).toThrow();
    expect(() => readTurn(null, 'hola')).toThrow();
  });

  it('keeps only corrections that quote the learner’s last line and change something', () => {
    const t = readTurn(
      {
        reply: 'Vale.',
        corrections: [
          { original: 'yo es', suggestion: 'yo soy', explanation: 'Ser: yo soy.' },
          { original: 'not in the line', suggestion: 'x', explanation: '' },
          { original: 'Madrid', suggestion: 'Madrid', explanation: 'Same.' },
          { original: '', suggestion: 'algo' },
          'nonsense',
        ],
      },
      'Hola, yo es de Madrid',
    );
    expect(t.corrections).toEqual([{ original: 'yo es', suggestion: 'yo soy', explanation: 'Ser: yo soy.' }]);
  });

  it('corrects nothing when the learner hasn’t written yet', () => {
    expect(readTurn({ reply: 'Hola', corrections: [{ original: 'a', suggestion: 'b' }] }, undefined).corrections).toEqual([]);
  });

  it('keeps at most three complete words and copes with a missing list', () => {
    const words = ['a', 'b', 'c', 'd'].map((w) => ({ word: w, meaning: w.toUpperCase() }));
    expect(readTurn({ reply: 'x', words: [...words, { word: 'e' }] }, undefined).words).toHaveLength(3);
    expect(readTurn({ reply: 'x', words: 'none', corrections: {} }, undefined)).toMatchObject({ words: [], corrections: [] });
  });
});

describe('nextTurn', () => {
  it('sends the opening prompt first, then the chat, and reads corrections against the last line', async () => {
    sent.length = 0;
    const turn = await nextTurn('es', 'A0', {
      prompt: 'Hablemos en un café.',
      messages: [
        { role: 'ai', text: '¡Hola! ¿Qué tal?', at: 1 },
        { role: 'me', text: 'Bien, yo es Ana', at: 2 },
      ],
    });
    expect(sent[0].turns).toEqual([
      { role: 'user', content: 'Hablemos en un café.' },
      { role: 'assistant', content: '¡Hola! ¿Qué tal?' },
      { role: 'user', content: 'Bien, yo es Ana' },
    ]);
    expect(sent[0].system).toContain('Spanish');
    expect(sent[0].system).toContain('A1');
    expect(turn.corrections).toHaveLength(1);
  });

  it('drops corrections when the AI speaks first', async () => {
    const turn = await nextTurn('es', 'A2', { prompt: 'Hola', messages: [] });
    expect(turn.corrections).toEqual([]);
    expect(turn.en).toBe('Very good. And you?');
  });
});
