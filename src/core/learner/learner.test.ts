import { describe, expect, it } from 'vitest';
import type { EvidenceRow } from '@/core/contracts/learner';
import { itemKeyOf, quietSkills, recognisedNotRecalled, summariseDay, weakSpotsOf, wordIdOfKey } from './learner';

const DAY = 86_400_000;
const NOW = new Date(2026, 9, 29, 12).getTime();
let n = 0;
const row = (patch: Partial<EvidenceRow>): EvidenceRow => {
  const at = patch.at ?? NOW;
  const item = patch.item ?? { type: 'grammar', topicId: 'present' };
  return { id: `r${n++}`, lang: 'es', at, day: new Date(at).toISOString().slice(0, 10), skill: 'grammar', room: 'grammatica', item, itemKey: itemKeyOf(item), outcome: 'wrong', assisted: false, ...patch } as EvidenceRow;
};

describe('items as keys', () => {
  it('names every kind of item as one string', () => {
    expect(itemKeyOf({ type: 'word', wordId: 'es:casa' })).toBe('word:es:casa');
    expect(itemKeyOf({ type: 'grammar', topicId: 'present' })).toBe('grammar:present');
    expect(itemKeyOf({ type: 'sound', soundId: 'ɾ' })).toBe('sound:ɾ');
    expect(itemKeyOf({ type: 'pattern', patternId: 'p' })).toBe('pattern:p');
    expect(itemKeyOf({ type: 'text', textId: 't' })).toBe('text:t');
    expect(wordIdOfKey('word:es:casa')).toBe('es:casa');
    expect(wordIdOfKey('grammar:x')).toBeNull();
  });
});

describe('weak spots', () => {
  it('a mistake once is a slip; on three different days it is persistent', () => {
    const rows = [row({ at: NOW }), row({ at: NOW - DAY }), row({ at: NOW - 2 * DAY })];
    const [spot] = weakSpotsOf(rows);
    expect(spot).toMatchObject({ wrong: 3, days: 3, persistent: true });
    expect(weakSpotsOf([row({}), row({})])[0]).toMatchObject({ wrong: 2, days: 1, persistent: false });
  });

  it('three places make it persistent too, even on one day', () => {
    const rows = [row({ contextId: 'a' }), row({ contextId: 'b' }), row({ contextId: 'c' })];
    expect(weakSpotsOf(rows)[0]).toMatchObject({ days: 1, places: 3, persistent: true });
  });

  it('keeps categories of one item apart, ignores right answers, and filters by skill', () => {
    const word = { type: 'word', wordId: 'es:casa' } as const;
    const rows = [
      row({ item: word, skill: 'vocabulary', category: 'spelling' }),
      row({ item: word, skill: 'vocabulary', category: 'agreement' }),
      row({ item: word, skill: 'vocabulary', outcome: 'right' }),
      row({ skill: 'grammar' }),
    ];
    expect(weakSpotsOf(rows)).toHaveLength(3);
    expect(weakSpotsOf(rows, { skill: 'vocabulary' }).map((s) => s.category).sort()).toEqual(['agreement', 'spelling']);
    expect(weakSpotsOf(rows, { limit: 1 })).toHaveLength(1);
  });

  it('puts the persistent first, then the most days, and gives the five newest examples', () => {
    const a = { type: 'grammar', topicId: 'a' } as const;
    const b = { type: 'grammar', topicId: 'b' } as const;
    const rows = [
      row({ item: a, at: NOW }),
      ...Array.from({ length: 7 }, (_, i) => row({ item: b, at: NOW - i * DAY, given: `g${i}`, expected: `e${i}` })),
    ];
    const spots = weakSpotsOf(rows);
    expect(spots.map((s) => s.item)).toEqual([b, a]);
    expect(spots[0].examples).toHaveLength(5);
    expect(spots[0].examples[0]).toMatchObject({ given: 'g0', expected: 'e0' });
  });

  it('says nothing when nothing was wrong', () => {
    expect(weakSpotsOf([row({ outcome: 'right' }), row({ outcome: 'close' })])).toEqual([]);
  });
});

describe('known one way and not the other', () => {
  const word = (id: string) => ({ type: 'word', wordId: `es:${id}` }) as const;
  it('finds words picked from options but missed when typed', () => {
    const rows = [
      row({ item: word('casa'), kind: 'mcq', outcome: 'right', skill: 'vocabulary' }),
      row({ item: word('casa'), kind: 'type', outcome: 'wrong', skill: 'vocabulary' }),
      // Typed right as well: recalled.
      row({ item: word('perro'), kind: 'mcq', outcome: 'right', skill: 'vocabulary' }),
      row({ item: word('perro'), kind: 'type', outcome: 'wrong', skill: 'vocabulary' }),
      row({ item: word('perro'), kind: 'type', outcome: 'right', skill: 'vocabulary' }),
      // Never tried to type it.
      row({ item: word('gato'), kind: 'mcq', outcome: 'right', skill: 'vocabulary' }),
      // Right only with a hint does not count as recognised.
      row({ item: word('luna'), kind: 'mcq', outcome: 'right', assisted: true, skill: 'vocabulary' }),
      row({ item: word('luna'), kind: 'type', outcome: 'wrong', skill: 'vocabulary' }),
    ];
    expect(recognisedNotRecalled(rows)).toEqual(['es:casa']);
  });
});

describe('quiet skills', () => {
  it('lists the skills with the fewest answers lately first, those with none at the head', () => {
    const rows = [
      row({ skill: 'vocabulary' }),
      row({ skill: 'vocabulary' }),
      row({ skill: 'grammar' }),
      row({ skill: 'reading', at: NOW - 30 * DAY }),
    ];
    const order = quietSkills(rows, NOW, 14);
    expect(order.slice(-2)).toEqual(['grammar', 'vocabulary']);
    expect(order[0]).toBe('reading');
    expect(order).toHaveLength(8);
  });
});

describe('a day, summarised', () => {
  it('counts right, wrong and assisted by skill, and mistakes by category', () => {
    const day = summariseDay('es', '2026-10-29', [
      row({ skill: 'vocabulary', outcome: 'right' }),
      row({ skill: 'vocabulary', outcome: 'wrong', category: 'spelling', assisted: true }),
      row({ skill: 'grammar', outcome: 'close' }),
      row({ skill: 'grammar', outcome: 'ungraded' }),
    ]);
    expect(day).toEqual({ id: 'es:2026-10-29', lang: 'es', day: '2026-10-29', bySkill: { vocabulary: { right: 1, wrong: 1, assisted: 1 }, grammar: { right: 1, wrong: 0, assisted: 0 } }, byCategory: { spelling: 1 } });
  });
});
