import { describe, expect, it } from 'vitest';
import { speechMatch } from './speech';

describe('what the microphone heard', () => {
  it('matches word by word, without case, punctuation or accents', () => {
    const m = speechMatch('¿Cómo te llamas?', ['como te llamas'], 'es');
    expect(m.score).toBe(1);
    expect(m.words.map((w) => w.text)).toEqual(['¿Cómo', 'te', 'llamas?']);
  });

  it('marks the words it didn’t hear, and takes the closest guess', () => {
    const m = speechMatch('Me llamo Ana.', ['me llama Ana', 'me llamo Ana'], 'es');
    expect(m.score).toBe(1);
    expect(m.said).toBe('me llamo Ana');
    const half = speechMatch('Tengo dos hermanos.', ['tengo dos'], 'es');
    expect(half.words.map((w) => w.heard)).toEqual([true, true, false]);
    expect(half.score).toBeCloseTo(2 / 3);
  });

  it('counts each heard word once', () => {
    expect(speechMatch('no no no', ['no'], 'es').score).toBeCloseTo(1 / 3);
  });

  it('reads Mandarin character by character, and Arabic without its vowel marks', () => {
    expect(speechMatch('我叫安娜。', ['我叫安娜'], 'zh').score).toBe(1);
    expect(speechMatch('我叫安娜。', ['我是安娜'], 'zh').score).toBe(0.75);
    // A hamza is a mark too: recognisers write أحمد and احمد alike.
    expect(speechMatch('اِسْمِي أَحْمَد.', ['اسمي احمد'], 'ar').score).toBe(1);
    expect(speechMatch('اِسْمِي أَحْمَد.', ['اسمي محمد'], 'ar').score).toBe(0.5);
  });

  it('gives nothing for nothing heard', () => {
    expect(speechMatch('Hola', [], 'es').score).toBe(0);
  });
});
