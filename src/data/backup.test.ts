import { afterEach, describe, expect, it } from 'vitest';
import { createDb } from './db';
import type { LinguaDB } from './db';
import { exportBackup, readBackup, restoreBackup, BackupError } from './backup';
import { completeOnboarding } from './languages';
import { getSettings, patchSetting, setSetting } from './settings';
import type { Word } from './types';

const open: LinguaDB[] = [];
function freshDb(name: string): LinguaDB {
  const db = createDb(`${name}-${Math.random().toString(36).slice(2)}`);
  open.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(open.splice(0).map((db) => db.delete()));
});

const word = (norm: string, state: Word['state'], updatedAt: number): Word => ({
  id: `ru:${norm}`,
  lang: 'ru',
  norm,
  state,
  stateChangedAt: updatedAt,
  createdAt: updatedAt,
  updatedAt,
});

describe('backup round trip', () => {
  it('moves learner data between devices and merges by newest edit', async () => {
    const phone = freshDb('phone');
    await completeOnboarding({ target: 'ru', native: 'en', level: 'A2', seedKnown: true, theme: 'nocturne' }, phone);
    await patchSetting('apiKeys', { groq: 'secret-key' }, phone);
    await patchSetting('meta', { deviceId: 'phone-1' }, phone);
    await phone.words.bulkPut([word('дом', 1, 500), word('кот', 2, 500)]);

    const file = await exportBackup({ includeMedia: true, includeApiKeys: false }, phone);
    expect(file.name).toMatch(/^lingua-backup-\d{4}-\d{2}-\d{2}\.zip$/);

    const desktop = freshDb('desktop');
    await patchSetting('meta', { deviceId: 'desktop-1' }, desktop);
    await setSetting('theme', 'paper', desktop);
    // The desktop changed "дом" later than the phone; that edit must survive.
    await desktop.words.put(word('дом', 2, 900));

    const parsed = await readBackup(file);
    expect(parsed.manifest.deviceId).toBe('phone-1');
    const summary = await restoreBackup(parsed, 'merge', desktop);

    expect((await desktop.words.get('ru:дом'))?.state).toBe(2);
    expect((await desktop.words.get('ru:кот'))?.state).toBe(2);
    expect(summary.perTable.words).toEqual({ added: 1, updated: 0 });

    const settings = await getSettings(desktop);
    expect(settings.meta.deviceId).toBe('desktop-1'); // device-only, never overwritten
    expect(settings.apiKeys.groq).toBe(''); // not exported
    expect((await desktop.languages.get('ru'))?.level).toBe('A2');
  });

  it('replace mode clears learner tables but keeps device-only settings', async () => {
    const a = freshDb('a');
    await a.words.put(word('мир', 1, 100));
    const file = await exportBackup({ includeMedia: false, includeApiKeys: false }, a);

    const b = freshDb('b');
    await patchSetting('meta', { deviceId: 'b-1' }, b);
    await b.words.put(word('лес', 1, 100));
    await restoreBackup(await readBackup(file), 'replace', b);

    expect(await b.words.toArray()).toEqual([word('мир', 1, 100)]);
    expect((await getSettings(b)).meta.deviceId).toBe('b-1');
  });

  it('keeps a single active language after merging two devices', async () => {
    const a = freshDb('a');
    await completeOnboarding({ target: 'ru', native: 'en', level: 'A1', seedKnown: false, theme: 'paper' }, a);
    const file = await exportBackup({ includeMedia: false, includeApiKeys: false }, a);

    const b = freshDb('b');
    await new Promise((r) => setTimeout(r, 5));
    await completeOnboarding({ target: 'el', native: 'en', level: 'A0', seedKnown: false, theme: 'paper' }, b);
    await restoreBackup(await readBackup(file), 'merge', b);

    const active = await b.languages.where('isActive').equals(1).toArray();
    expect(active.map((l) => l.id)).toEqual(['el']);
    expect(await b.languages.count()).toBe(2);
  });

  it('rejects files that are not Lingua backups', async () => {
    await expect(readBackup(new Blob(['hello']))).rejects.toBeInstanceOf(BackupError);
  });
});
