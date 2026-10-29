import { describe, expect, it } from 'vitest';
import type { EvidenceRow } from '@/core/contracts/learner';
import type { Chat } from '@/data/types';
import { buildErrorLog } from './errorLog';

const row = (id: string, at: number, outcome: EvidenceRow['outcome'], extra: Partial<EvidenceRow> = {}) =>
  ({ id, at, outcome, lang: 'es', day: 'd', skill: 'vocabulary', room: 'ludus', item: { type: 'word', wordId: 'es:casa' }, itemKey: 'word:es:casa', assisted: false, ...extra }) as EvidenceRow;
const chat = { id: 'c', lang: 'es', title: 'At the market', messages: [{ role: 'me', text: 'Yo es Ana', at: 30, corrections: [{ original: 'Yo es', suggestion: 'Yo soy', explanation: 'Ser agrees with the person.' }] }, { role: 'ai', text: 'Hola', at: 31 }], createdAt: 1, updatedAt: 1 } as unknown as Chat;

describe('the error log', () => {
  it('lists only the wrong answers and the conversation corrections, newest first', () => {
    const log = buildErrorLog([row('a', 10, 'wrong', { given: 'cassa', expected: 'casa' }), row('b', 20, 'right'), row('c', 40, 'wrong', { item: { type: 'grammar', topicId: 'preterite' }, itemKey: 'grammar:preterite' })], [chat], (i) => (i.type === 'word' ? i.wordId.slice(3) : 'the preterite'));
    expect(log.map((e) => e.id)).toEqual(['c', 'c:0:0', 'a']);
    expect(log[0]).toMatchObject({ title: 'the preterite', link: '/cursus/grammatica/preterite' });
    expect(log[1]).toMatchObject({ source: 'conversation', given: 'Yo es', expected: 'Yo soy', note: 'Ser agrees with the person.' });
    expect(log[2]).toMatchObject({ title: 'casa', given: 'cassa', expected: 'casa' });
  });
  it('stops at the limit and skips deleted chats', () => {
    const rows = Array.from({ length: 10 }, (_, i) => row(`r${i}`, i, 'wrong'));
    expect(buildErrorLog(rows, [{ ...chat, deletedAt: 1 } as Chat], () => 'x', 4)).toHaveLength(4);
  });
});
