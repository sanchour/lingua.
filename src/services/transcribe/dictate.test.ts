import { describe, expect, it } from 'vitest';
import { appendSpoken, joinSpoken } from './dictate';

describe('speaking into an entry', () => {
  it('joins what Whisper heard, without spaces for Mandarin', () => {
    expect(joinSpoken([' Hoy fui al mercado. ', '', 'Compré fruta.'], 'es')).toBe('Hoy fui al mercado. Compré fruta.');
    expect(joinSpoken(['今天我去了市场。', '买了水果。'], 'zh')).toBe('今天我去了市场。买了水果。');
  });

  it('adds it after what is written', () => {
    expect(appendSpoken('', ' Hola. ', 'es')).toBe('Hola.');
    expect(appendSpoken('Hola.', 'Me llamo Sam.', 'es')).toBe('Hola. Me llamo Sam.');
    expect(appendSpoken('Hola.\n\n', 'Me llamo Sam.', 'es')).toBe('Hola.\n\nMe llamo Sam.');
    expect(appendSpoken('你好。', '我叫山姆。', 'zh')).toBe('你好。我叫山姆。');
    expect(appendSpoken('Hola.', '  ', 'es')).toBe('Hola.');
  });
});
