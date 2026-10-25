import { describe, expect, it } from 'vitest';
import { floatToPcm16, piperModelUrl, piperVoicesFor, pinyinPhonemeIds, pinyinPhonemes, speechParts, splitSyllable } from './piper';

// The ids chaowen's config gives these symbols (zh_CN-chaowen-medium.onnx.json).
const MAP: Record<string, number[]> = { _: [0], '^': [1], $: [2], Ø: [3], n: [10], h: [14], y: [25], w: [26], ao: [32], i: [39], ue: [63], v: [58], l: [11], o: [28], '3': [66], '4': [67], '5': [68], '，': [72], '。': [69] };

describe('Piper’s voices', () => {
  it('has one for exactly the flag’s accent, never a neighbour’s', () => {
    expect(piperVoicesFor('fr-FR').map((v) => v.id)).toEqual(['fr_FR-siwis-medium']);
    expect(piperVoicesFor('es_MX').map((v) => v.id)).toEqual(['es_MX-ald-medium']);
    expect(piperVoicesFor('es-AR')).toEqual([]);
    expect(piperVoicesFor('ar-SA')).toEqual([]);
    expect(piperVoicesFor('ru-RU')).toHaveLength(2);
  });

  it('finds a voice where Hugging Face keeps it', () => {
    expect(piperModelUrl('zh_CN-chaowen-medium', 'onnx')).toBe('https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/chaowen/medium/zh_CN-chaowen-medium.onnx');
  });
});

describe('Mandarin as piper’s Chinese voices want it', () => {
  it('splits a syllable into initial, final and tone, as piper does', () => {
    expect(splitSyllable('hao3')).toEqual(['h', 'ao', '3']);
    expect(splitSyllable('lü4')).toEqual(['l', 'v', '4']);
    expect(splitSyllable('men0')).toEqual(['m', 'en', '5']);
    expect(splitSyllable('ai4')).toEqual(['Ø', 'ai', '4']);
    expect(splitSyllable('yue4')).toEqual(['y', 'ue', '4']);
    expect(splitSyllable('zhong1')).toEqual(['zh', 'ong', '1']);
    expect(splitSyllable('，')).toBeNull();
  });

  it('turns readings into ids with a pause after each tone and stop', () => {
    const chars = [
      { char: '你', pinyin: 'ni3' },
      { char: '好', pinyin: 'hao3' },
      { char: '，', pinyin: '' },
      { char: 'x', pinyin: '' },
    ];
    const symbols = pinyinPhonemes(chars, MAP);
    expect(symbols).toEqual(['n', 'i', '3', 'h', 'ao', '3', '，']);
    expect(pinyinPhonemeIds(symbols, MAP)).toEqual([1, 10, 39, 66, 0, 14, 32, 66, 0, 72, 0, 2]);
  });
});

describe('saying long text in parts', () => {
  it('cuts at sentences, and at commas once a part is long enough', () => {
    expect(speechParts('Bonjour, comment allez-vous ? Très bien, merci.')).toEqual(['Bonjour, comment allez-vous ?', 'Très bien, merci.']);
    expect(speechParts('Le soir, nous lisions près de la fenêtre pendant qu’il neigeait, doucement, sur la ville.')).toEqual([
      'Le soir, nous lisions près de la fenêtre pendant qu’il neigeait,',
      'doucement, sur la ville.',
    ]);
    expect(speechParts('maison')).toEqual(['maison']);
    expect(speechParts('你好。我们去吃饭吧！')).toEqual(['你好。', '我们去吃饭吧！']);
  });

  it('keeps a short tail with the part before it', () => {
    expect(speechParts('Je voudrais un café avec du lait, merci')).toEqual(['Je voudrais un café avec du lait, merci']);
  });
});

it('writes Piper’s samples as 16-bit sound, clipped', () => {
  const pcm = new DataView(floatToPcm16(Float32Array.from([0, 1, -2])).buffer);
  expect([pcm.getInt16(0, true), pcm.getInt16(2, true), pcm.getInt16(4, true)]).toEqual([0, 32767, -32767]);
});
