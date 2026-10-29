import { expect, it } from 'vitest';
import { createDb } from '@/data/db';
import { parallelSource, simplificationRequest } from './parallel';
import { generateMaterial } from '@/services/llm/generate';
it('bounds the displayed source and reuses the existing simplifier with an injected model and cache', async () => {
  expect(parallelSource({ blocks: [{ t: 'h', text: 'Título' }, { t: 'img', blobId: 'i' }, { t: 'p', text: 'a'.repeat(5000) }] })).toHaveLength(4000);
  expect(() => simplificationRequest('es', '', 'A1', 'en')).toThrow('40');
  const source = 'Ana va a la biblioteca porque quiere leer un libro nuevo.';
  const db = createDb(`simplify-reading-${crypto.randomUUID()}`);
  try {
    let calls = 0;
    const deps = { database: db, model: 'fake-model', now: () => 1, lookup: async () => ({ known: new Set<string>(), ranks: new Map<string, number>() }), ask: async (_system: string, user: string) => { calls++; expect(user).toContain(source); return { title: 'Ana lee', text: 'Ana va a la biblioteca. Quiere leer un libro.', translation: 'Ana goes to the library. She wants to read a book.' }; } };
    const request = simplificationRequest('es', source, 'A1', 'en');
    const first = await generateMaterial(request, deps);
    expect(first.row).toMatchObject({ kind: 'simplified', checks: ['schema'], model: 'fake-model' });
    expect((await generateMaterial(request, deps)).cached).toBe(true);
    expect(calls).toBe(1);
  } finally { await db.delete(); }
});
