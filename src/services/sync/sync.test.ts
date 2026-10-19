import { describe, expect, it } from 'vitest';
import { exportBackup, readBackup, restoreBackup } from '@/data/backup';
import { createDb } from '@/data/db';
import type { LinguaDB } from '@/data/db';
import { ensureDeviceMeta, getSettings, setSetting } from '@/data/settings';
import type { Word } from '@/data/types';
import { meetingId, newSecret, qrText, readCode, runSession, showCode } from './protocol';
import type { Channel, SessionSide, SyncMessage } from './protocol';

async function device(name: string) {
  const db = createDb(`sync-${name}-${Math.random().toString(36).slice(2)}`);
  await ensureDeviceMeta(db);
  return db;
}

/** Two ends of a channel; messages arrive a moment later, as over a network. */
function channels(): [Channel, Channel] {
  const listeners: Array<Array<(m: SyncMessage) => void>> = [[], []];
  const end = (me: number, other: number): Channel => ({
    send: (m) => setTimeout(() => listeners[other].forEach((l) => l(structuredClone(m)))),
    onMessage: (l) => listeners[me].push(l),
    close: () => undefined,
  });
  return [end(0, 1), end(1, 0)];
}

async function side(db: LinguaDB, secret: string, name: string): Promise<SessionSide> {
  const { meta } = await getSettings(db);
  return {
    secret,
    device: meta.deviceId,
    name,
    makeBackup: async () => (await exportBackup({ includeMedia: false, includeApiKeys: false, markBackup: false }, db)).arrayBuffer(),
    applyBackup: async (zip) => {
      const r = await restoreBackup(await readBackup(new Blob([zip])), 'merge', db);
      return { added: r.added, updated: r.updated };
    },
  };
}

const word = (norm: string, state: 1 | 2, updatedAt: number): Word => ({ id: `es:${norm}`, lang: 'es', norm, state, stateChangedAt: updatedAt, createdAt: updatedAt, updatedAt }) as Word;

describe('pairing codes', () => {
  it('reads a code however it was typed, and nothing else', () => {
    const secret = newSecret();
    expect(secret).toHaveLength(16);
    expect(readCode(showCode(secret).toLowerCase())).toBe(secret);
    expect(readCode(qrText(secret))).toBe(secret);
    expect(readCode('ABCD-EFGH-JKMN-PQOI')).toBe('ABCDEFGHJKMNPQ01');
    expect(readCode('too short')).toBeNull();
  });

  it('gives each side of a pairing its own meeting place', async () => {
    const secret = newSecret();
    const [a, b] = [await meetingId(secret, 'a'), await meetingId(secret, 'b')];
    expect(a).toMatch(/^lingua-[0-9a-f]{32}$/);
    expect(a).not.toBe(b);
    expect(await meetingId(newSecret(), 'a')).not.toBe(a);
  });
});

describe('syncing two devices', () => {
  it('leaves both with everything, the newest edit winning', async () => {
    const [desk, phone] = [await device('desk'), await device('phone')];
    await desk.words.bulkPut([word('casa', 1, 100), word('perro', 2, 100)]);
    await phone.words.bulkPut([word('gato', 2, 200), word('perro', 1, 300)]);
    await setSetting('apiKeys', { groq: '', gemini: 'test-not-a-real-key' }, desk);

    const secret = newSecret();
    const [x, y] = channels();
    const [one, two] = await Promise.all([runSession(x, await side(desk, secret, 'Mac')), runSession(y, await side(phone, secret, 'iPhone'))]);

    expect(one.partner.name).toBe('iPhone');
    expect(two.partner.name).toBe('Mac');
    for (const db of [desk, phone]) {
      const words = await db.words.toArray();
      expect(words.map((w) => w.norm).sort()).toEqual(['casa', 'gato', 'perro']);
      expect(words.find((w) => w.norm === 'perro')?.state).toBe(1);
    }
    // Keys stay on their device unless chosen.
    expect((await getSettings(phone)).apiKeys.gemini).toBe('');
  });

  it('sends nothing to a device that doesn’t know the secret', async () => {
    const [desk, stranger] = [await device('desk2'), await device('stranger')];
    await desk.words.put(word('secreto', 2, 100));
    const [x, y] = channels();
    const results = await Promise.allSettled([runSession(x, await side(desk, newSecret(), 'Mac')), runSession(y, await side(stranger, newSecret(), 'Other'))]);
    expect(results.every((r) => r.status === 'rejected')).toBe(true);
    expect(await stranger.words.count()).toBe(0);
  });
});
