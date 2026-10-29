import { expect, it } from 'vitest';
import { CULTURE_NOTES, cultureNotes, wordCulture } from './notes';
it('covers the actual six core languages with unique ids, examples and named HTTPS sources', () => {
  expect([...new Set(CULTURE_NOTES.map((n) => n.lang))].sort()).toEqual(['ar', 'de', 'es', 'fr', 'ru', 'zh']);
  expect(new Set(CULTURE_NOTES.map((n) => n.id)).size).toBe(CULTURE_NOTES.length);
  for (const n of CULTURE_NOTES) { expect(n.words.length).toBeGreaterThan(0); expect(n.example).not.toBe(''); expect(n.translation).not.toBe(''); expect(new URL(n.source.url).protocol).toBe('https:'); expect(n.source.title).not.toBe(''); }
});
it('finds culture by word and normalized search, keeping languages and topics separate', () => {
  expect(wordCulture('fr', 'DEPAYSEMENT')[0]?.id).toBe('fr-depaysement');
  expect(wordCulture('ar', 'أَهْلًا')[0]?.id).toBe('ar-ahlan');
  expect(wordCulture('es', 'mesa')[0]?.id).toBe('es-sobremesa');
  expect(wordCulture('de', 'mesa')).toEqual([]); expect(wordCulture('es', '')).toEqual([]);
  expect(cultureNotes('de', 'bread', 'Food').map((n) => n.id)).toEqual(['de-semmel']);
  expect(cultureNotes('zh', '', 'Humour').map((n) => n.id)).toEqual(['zh-fish']);
});
