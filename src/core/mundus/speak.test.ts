import { describe, expect, it } from 'vitest';
import { emptyWeek, laneRoom, LANES, nextSteps, steer } from './guide';
import type { GuideInput, Week } from './guide';

const week = (w: Partial<Week>): Week => ({ ...emptyWeek(), ...w });
const busy = week({ read: 30, listen: 30, watch: 30, words: 30 });

describe('the speak lane (Lingua 5.1-1)', () => {
  it('is a lane of its own', () => {
    expect(LANES).toContain('speak');
    expect(emptyWeek().speak).toBe(0);
  });

  it('is only suggested to those who like speaking', () => {
    expect(steer(busy, []).lane).not.toBe('speak');
    expect(steer(busy, ['speaking']).lane).toBe('speak');
  });

  it('starts a quiet week with talking for someone who likes it most', () => {
    expect(steer(emptyWeek(), ['speaking', 'reading'])).toEqual({ lane: 'speak', why: 'start' });
  });

  it('leads into Sermo, about what you watched this week when there is something', () => {
    expect(laneRoom('speak')).toEqual({ title: 'Talk for five minutes in Sermo', to: '/mentis/sermo', action: 'Open Sermo' });
    expect(laneRoom('speak', { title: 'Lupin', lane: 'watch' })).toEqual({ title: 'Talk about Lupin for five minutes', to: '/mentis/sermo?topic=Lupin', action: 'Open Sermo' });
  });

  it('leads writing into Diarium about what you read', () => {
    expect(laneRoom('write', { title: 'El principito', lane: 'read' }).to).toBe('/mentis/diarium?about=El%20principito');
  });

  it('puts the talk step first when the week needs it', () => {
    const input: GuideInput = {
      level: 'B1',
      enjoys: ['speaking'],
      week: busy,
      picks: null,
      tips: [],
      doneTips: new Set(),
      used: { codex: true, sonus: true, visio: true, thesaurus: true },
      recent: { title: 'Lupin', lane: 'watch' },
      day: 3,
    };
    expect(nextSteps(input)[0]).toMatchObject({ type: 'room', lane: 'speak', title: 'Talk about Lupin for five minutes', to: '/mentis/sermo?topic=Lupin' });
  });
});
