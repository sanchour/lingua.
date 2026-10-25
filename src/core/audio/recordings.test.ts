import { describe, expect, it } from 'vitest';
import { pickRecording, recordingKey, recordingPage, recordingUrl, speakerOf } from './recordings';
import type { SoundsRecording } from './recordings';

const bonjour: SoundsRecording[] = [
  ['e/e1', 'LL-Q150_(fra)-DenisdeShawi-bonjour.wav', 'Canada'],
  ['8/83', 'LL-Q150_(fra)-DSwissK-bonjour.wav', 'Switzerland Valais'],
  ['a/a5', 'LL-Q150_(fra)-LoquaxFR-bonjour.wav', 'France Vosges'],
];

describe('which recording plays', () => {
  it('takes the flag’s own accent first', () => {
    expect(pickRecording(bonjour, 'fr-FR')?.[1]).toContain('LoquaxFR');
    expect(pickRecording(bonjour, 'fr-CA')?.[1]).toContain('DenisdeShawi');
    expect(pickRecording(bonjour, 'fr-CH')?.[1]).toContain('DSwissK');
  });

  it('then one with no region named, then any', () => {
    const list: SoundsRecording[] = [['1/12', 'Es-am-lat-casa.ogg', 'Latin-America'], ['3/34', 'Es-casa.ogg', '']];
    expect(pickRecording(list, 'es-ES')?.[1]).toBe('Es-casa.ogg');
    expect(pickRecording(list.slice(0, 1), 'es-ES')?.[1]).toBe('Es-am-lat-casa.ogg');
    expect(pickRecording(undefined, 'es-ES')).toBeUndefined();
  });
});

describe('a recording’s word, address and speaker', () => {
  it('finds the word without the punctuation around it, as the packs write it', () => {
    expect(recordingKey('  Bonjour ! ', 'fr')).toBe('bonjour');
    expect(recordingKey('«Aujourd’hui»', 'fr')).toBe("aujourd'hui");
    expect(recordingKey('¿Qué?', 'es')).toBe('qué');
    expect(recordingKey('вода́', 'ru')).toBe('вода');
    expect(recordingKey('你好。', 'zh')).toBe('你好');
  });

  it('plays Commons’ mp3 and links the file’s page', () => {
    const r: SoundsRecording = ['e/ea', 'LL-Q150_(fra)-GrandCelinien-être.wav', 'France Paris'];
    expect(recordingUrl(r)).toBe('https://upload.wikimedia.org/wikipedia/commons/transcoded/e/ea/LL-Q150_(fra)-GrandCelinien-%C3%AAtre.wav/LL-Q150_(fra)-GrandCelinien-%C3%AAtre.wav.mp3');
    expect(recordingPage(r)).toBe('https://commons.wikimedia.org/wiki/File:LL-Q150_(fra)-GrandCelinien-%C3%AAtre.wav');
    expect(speakerOf(r)).toBe('GrandCelinien');
    expect(speakerOf(['c/cc', 'Zh-mǎ.ogg', ''])).toBeUndefined();
  });
});
