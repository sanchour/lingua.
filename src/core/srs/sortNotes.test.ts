import { describe, expect, it } from 'vitest';
import type { Card, Note } from '@/data/types';
import { sortNotes } from './sortNotes';

const note = (id: string, term: string, at: number, extra: Partial<Note> = {}) => ({ id, term, createdAt: at, ...extra }) as Note;
const card = (noteId: string, extra: Partial<Card>) => ({ noteId, direction: 'recognition', state: 0, due: 0, difficulty: 0, ...extra }) as Card;

describe('ordering a deck’s cards', () => {
  const notes = [note('a', 'perro', 1, { freqRank: 50, pos: 'noun' }), note('b', 'Casa', 2, { freqRank: 10, pos: 'noun' }), note('c', 'azul', 3, { pos: 'adj' }), note('d', 'ir', 4, { freqRank: 5, pos: 'verb' })];
  const cards = new Map<string, Card[]>([
    ['a', [card('a', { state: 2, due: 300, difficulty: 8 })]],
    ['b', [card('b', { state: 2, due: 100, difficulty: 3 })]],
    ['c', [card('c', {})]],
    ['d', [card('d', { state: 1, due: 200, difficulty: 9 })]],
  ]);
  const ids = (how: Parameters<typeof sortNotes>[2]) => sortNotes(notes, cards, how).map((n) => n.id).join('');
  it('by how common, with the unranked last', () => expect(ids('common')).toBe('dbac'));
  it('A to Z, ignoring case', () => expect(ids('alpha')).toBe('cbda'));
  it('newest first', () => expect(ids('added')).toBe('dcba'));
  it('due soonest, with new cards last', () => expect(ids('due')).toBe('bdac'));
  it('hardest first', () => expect(ids('hardest')).toBe('dabc'));
  it('by first tag, untagged last', () => expect(sortNotes([note('x', 'b', 1, { tags: ['z'] }), note('y', 'a', 2, { tags: [] }), note('w', 'c', 3, { tags: ['a'] })], new Map(), 'topic').map((n) => n.id).join('')).toBe('wxy'));
  it('in the learner\'s own order, cards with no place of their own follow by when they were added', () => expect(sortNotes([note('x', 'b', 5, { order: 2 }), note('y', 'a', 1), note('w', 'c', 3, { order: 0 })], new Map(), 'hand').map((n) => n.id).join('')).toBe('wyx'));
  it('by kind of word, then A to Z', () => expect(ids('pos')).toBe('cbad'));
});
