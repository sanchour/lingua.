import { describe, expect, it } from 'vitest';
import type { RadioStation } from '@/data/types';
import { inLanguage } from './filter';
import { dialMarks, kindsOf, nearestMark, sectionsOf, sortStations } from './kinds';
import { cleanStations, filterContext } from './stations';
import type { RawStation } from './stations';

const raw = (over: Partial<RawStation>): RawStation => ({ stationuuid: over.name ?? 'x', name: 'Radio', url_resolved: `https://stream.example/${over.name ?? 'x'}`, codec: 'MP3', lastcheckok: 1, clickcount: 1, ...over });
const everything = () => true;

describe('stations really in the language (5.2-2)', () => {
  const es = filterContext('es');
  const ru = filterContext('ru');

  it('keeps stations whose only language it is, at home or abroad', () => {
    expect(inLanguage(raw({ name: 'Cadena SER', language: 'spanish', countrycode: 'ES' }), es)).toBe(true);
    expect(inLanguage(raw({ name: 'Radio Kan Reka', language: 'russian', countrycode: 'IL' }), ru)).toBe(true);
  });

  it('drops music stations tagged with many languages, this one not first', () => {
    expect(inLanguage(raw({ name: 'Free FM Tokyo', language: 'english,japanese,spanish', countrycode: 'JP' }), es)).toBe(false);
    expect(inLanguage(raw({ name: 'Hits', language: 'english,french,spanish', countrycode: 'MX' }), es)).toBe(false);
  });

  it('keeps a second language at home, not abroad', () => {
    expect(inLanguage(raw({ name: 'Radio Bilingüe', language: 'spanish,english', countrycode: 'US' }), es)).toBe(true);
    expect(inLanguage(raw({ name: 'Free FM Bombay', language: 'english,spanish', countrycode: 'IN' }), es)).toBe(false);
  });

  it('counts other spellings and dialects as the language itself', () => {
    expect(inLanguage(raw({ name: 'RNE', language: 'castellano. español,castilian,spanish', countrycode: 'ES' }), es)).toBe(true);
    expect(inLanguage(raw({ name: 'Радио МИР', language: 'rus,russian,ру,язык: русский', countrycode: 'RU' }), ru)).toBe(true);
    expect(inLanguage(raw({ name: 'Bayern', language: 'german,swiss german,deutsch fränkisch', countrycode: 'DE' }), filterContext('de'))).toBe(true);
  });

  it('abroad, a name in another script needs more than a tag', () => {
    expect(inLanguage(raw({ name: 'رادیو فارسی', language: 'spanish', countrycode: 'IR' }), es)).toBe(false);
    expect(inLanguage(raw({ name: 'Radio Exterior', language: 'spanish', countrycode: 'MA' }), es)).toBe(true);
  });

  it('keeps a name copied under many flags once', () => {
    const copies = ['TJ', 'AD', 'BT', 'AZ', 'AF'].map((c, i) => raw({ stationuuid: `q${i}`, name: 'Abdulbasit Abdulsamad', url_resolved: `https://q.example/${i}`, language: 'arabic', countrycode: c }));
    expect(cleanStations(copies, everything, filterContext('ar')).length).toBeLessThanOrEqual(2);
  });
});

describe('the radio list in sections', () => {
  const st = (name: string, tags: string[], bitrate = 128): RadioStation => ({ id: name, name, url: `https://x/${name}`, tags, clicks: 0, votes: 0, bitrate, hls: false });

  it('reads kinds from tags in several languages', () => {
    expect(kindsOf(st('Cadena', ['noticias', 'deportes']))).toEqual(['news', 'sport']);
    expect(kindsOf(st('Europa Plus', ['pop', 'hits']))).toEqual(['music']);
    expect(kindsOf(st('Эхо', ['новости', 'разговор']))).toEqual(['news', 'talk']);
  });

  it('puts talk and news before music, and leaves out empty sections', () => {
    const s = sectionsOf([st('A', ['news']), st('B', ['pop']), st('C', ['local', 'pop'])], []);
    expect(s.map((x) => x.id)).toEqual(['speech', 'music', 'regional', 'all']);
  });

  it('sorts by name and by sound quality', () => {
    const list = [st('b', [], 64), st('a', [], 320)];
    expect(sortStations(list, 'name').map((s) => s.name)).toEqual(['a', 'b']);
    expect(sortStations(list, 'quality')[0].bitrate).toBe(320);
  });

  it('spaces the tuner by stations and finds the nearest country', () => {
    const marks = dialMarks([{ code: 'ES', name: 'Spain', count: 80 }, { code: 'UY', name: 'Uruguay', count: 3 }]);
    expect(marks[0].code).toBeNull();
    expect(marks[1].width).toBeGreaterThan(marks[2].width);
    expect(nearestMark(marks, marks[2].centre + 4)).toBe(2);
  });
});
