import { expect, it } from 'vitest';
import { createDb } from './db';
import { immersionList, updateImmersion } from './immersion';
import { immersionPrompts } from '@/core/culture/immersion';
it('keeps shopping per language, supports undo and refuses invalid saved data without overwriting it', async () => {
  const db = createDb(`immersion-${crypto.randomUUID()}`);
  try {
    await updateImmersion('es', { type: 'add', text: 'pan' }, db);
    const item = (await immersionList('es', db)).shopping[0];
    await updateImmersion('es', { type: 'toggle', id: item.id }, db);
    expect((await immersionList('es', db)).shopping[0].done).toBe(true);
    await updateImmersion('es', { type: 'remove', id: item.id }, db); await updateImmersion('es', { type: 'restore', item }, db);
    expect((await immersionList('es', db)).shopping).toEqual([item]); expect((await immersionList('fr', db)).shopping).toEqual([]);
    await expect(updateImmersion('es', { type: 'add', text: '' }, db)).rejects.toThrow('200');
    await expect(updateImmersion('es', { type: 'media-add', item: { mediaId: 'missing', level: 'A1', kind: 'short' } }, db)).rejects.toThrow('Choose a video');
    await db.media.add({ id: 'v', lang: 'es', kind: 'video', title: 'A short clip', createdAt: 1, updatedAt: 1 });
    const video = { mediaId: 'v', level: 'A2', kind: 'short' as const };
    await updateImmersion('es', { type: 'media-add', item: video }, db);
    await updateImmersion('es', { type: 'media-add', item: { ...video, level: 'B1' } }, db);
    expect((await immersionList('es', db)).media).toEqual([{ ...video, level: 'B1' }]);
    await updateImmersion('es', { type: 'media-remove', mediaId: 'v' }, db);
    await updateImmersion('es', { type: 'media-restore', item: video }, db);
    expect((await immersionList('es', db)).media).toEqual([video]);
    await expect(updateImmersion('fr', { type: 'media-add', item: video }, db)).rejects.toThrow('Choose a video');
    await db.settings.put({ key: 'immersion:es', value: 'invalid', updatedAt: 1 });
    await expect(updateImmersion('es', { type: 'add', text: 'agua' }, db)).rejects.toThrow('kept unchanged');
    expect((await db.settings.get('immersion:es'))?.value).toBe('invalid');
    for (const lang of ['es', 'fr', 'de', 'ru', 'zh', 'ar']) expect(immersionPrompts(lang).every((p) => p.text && p.english && p.taskId)).toBe(true);
  } finally { await db.delete(); }
});
