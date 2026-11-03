import { expect, it } from 'vitest';
import { createDb } from './db';
import { writingSpelling } from './writingSpelling';
import { normalizeWord, foldKey } from '@/core/text/normalize';
import { packId } from '@/core/packs/format';

it('checks only the target dictionary, respects accents and attested inflections, and bounds long drafts', async () => {
  const db = createDb(`writing-spelling-${crypto.randomUUID()}`);
  try {
    await expect(writingSpelling('fr', 'bonjour', db)).rejects.toThrow('Install');
    for (const [lang, word] of [['es', 'café'], ['fr', 'bonjour'], ['de', 'Haus'], ['ru', 'слово'], ['ar', 'كتاب'], ['zh', '书']]) {
      await db.fullDict.put({ lang, key: normalizeWord(word, lang), fold: foldKey(word, lang), word, entries: [] });
      expect((await writingSpelling(lang, word, db)).missing).toEqual([]);
    }
    await db.dictForms.put({ pack: packId('es'), form: 'casas', lemmas: ['casa'], g: 'houses' });
    expect((await writingSpelling('es', 'café cafe casas bonjour', db)).missing).toEqual(['cafe', 'bonjour']);
    const long = Array.from({ length: 510 }, (_, i) => `palabra${i}`).join(' ');
    expect((await writingSpelling('es', long, db)).checked).toBeLessThanOrEqual(500);
  } finally { await db.delete(); }
});
