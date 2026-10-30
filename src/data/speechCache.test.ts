import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { putSpeech, SPEECH_KEEP } from './speechCache';

describe('putSpeech', () => {
  beforeEach(() => db.speech.clear());

  it('keeps the newest rows and drops the oldest', async () => {
    const row = (i: number) => ({ id: `r${i}`, lang: 'es', text: `t${i}`, voice: 'v', blob: new Blob(['x']), createdAt: i });
    await db.speech.bulkPut(Array.from({ length: SPEECH_KEEP }, (_, i) => row(i)));
    await putSpeech(row(SPEECH_KEEP));
    expect(await db.speech.count()).toBe(SPEECH_KEEP);
    expect(await db.speech.get('r0')).toBeUndefined();
    expect(await db.speech.get(`r${SPEECH_KEEP}`)).toBeDefined();
  });
});
