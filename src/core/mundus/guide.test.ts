import { describe, expect, it } from 'vitest';
import { loadPicks } from '@/core/mundus/load';
import { tipsFor } from '@/core/mundus/tips';
import { emptyWeek, guideNote, guideSteer, lanePick, nextLevelPicks, nextSteps, noReplies, reply, replyLine, stageIndex, steer, tipsByReach } from './guide';
import type { GuideInput, Week } from './guide';

const week = (w: Partial<Week>): Week => ({ ...emptyWeek(), ...w });
const used = { codex: true, sonus: true, visio: true, thesaurus: true };

describe('steer', () => {
  it('starts a quiet week with the favourite lane', () => {
    expect(steer(emptyWeek(), ['watching', 'reading'])).toEqual({ lane: 'watch', why: 'start' });
    expect(steer(emptyWeek(), []).lane).toBe('listen');
  });
  it('points away from the busiest lane, to one not touched yet', () => {
    const s = steer(week({ read: 90, words: 20, watch: 15 }), []);
    expect(s).toEqual({ lane: 'listen', why: 'quiet', top: 'read' });
  });
  it('leans toward what the learner enjoys', () => {
    expect(steer(week({ read: 60, listen: 10, watch: 12, words: 10 }), ['watching']).lane).toBe('watch');
  });
  it('only suggests writing to those who like it', () => {
    expect(steer(week({ read: 30, listen: 30, watch: 30, words: 30 }), []).lane).not.toBe('write');
    expect(steer(week({ read: 30, listen: 30, watch: 30, words: 30 }), ['writing']).lane).toBe('write');
  });
});

describe('stages and picks', () => {
  it('maps levels to stages', () => {
    expect(['A0', 'A1', 'A2', 'B1', 'B2', 'C1'].map((l) => stageIndex(l as never))).toEqual([0, 0, 1, 2, 3, 3]);
  });
  it('keeps tips for later stages for later', () => {
    const { now, later } = tipsByReach(tipsFor('es'), 'A0');
    expect(now.some((t) => t.id === 'phone')).toBe(true);
    expect(later.some((t) => t.id === 'partner')).toBe(true);
    expect(tipsByReach(tipsFor('es'), 'B2').later).toEqual([]);
  });
  it('finds a pick in reach for a lane, and shows what the next level opens', async () => {
    const picks = await loadPicks('es');
    const p = lanePick(picks, 'watch', 'A1', 3)!;
    expect(['series', 'films', 'youtube']).toContain(p.group);
    const next = nextLevelPicks(picks, 'A1');
    expect(next.length).toBeGreaterThan(0);
    expect(next.every((n) => n.pick.level === 'B1')).toBe(true);
    expect(nextLevelPicks(picks, 'C1')).toEqual([]);
  });
});

describe('next steps', () => {
  const base = async (over: Partial<GuideInput> = {}): Promise<GuideInput> => ({ level: 'A2', enjoys: ['reading'], week: week({ read: 80, words: 20 }), picks: await loadPicks('es'), tips: tipsFor('es'), doneTips: new Set(), used, day: 100, ...over });

  it('gives something to enjoy, something to try and a way to grow', async () => {
    const steps = nextSteps(await base({ grammar: { id: 'ser-estar', title: 'Ser and estar' } }));
    expect(steps.map((s) => s.type)).toEqual(['pick', 'tip', 'grammar']);
    expect(steps[0].type === 'pick' && steps[0].lane).toBe('listen');
    expect(steps[0].reason).toMatch(/no listening yet/);
  });
  it('sends a learner to a room they haven’t used, and falls back to rooms without picks', async () => {
    const steps = nextSteps(await base({ picks: null, used: { ...used, visio: false } }));
    expect(steps[0]).toMatchObject({ type: 'room', to: '/sonus?tab=podcasts' });
    expect(steps[2]).toMatchObject({ type: 'room', to: '/sonus?tab=streaming' });
  });
  describe('replies', () => {
    const date = '2026-10-28';
    const none = noReplies(date);

    it('"I’d rather watch" turns the lane and the steps, and Mundus says so', async () => {
      const replies = reply(none, { kind: 'lane', lane: 'watch' }, date);
      const input = await base({ replies });
      const s = guideSteer(input);
      expect(s).toMatchObject({ lane: 'watch', why: 'asked' });
      const steps = nextSteps(input);
      expect(steps[0]).toMatchObject({ lane: 'watch' });
      expect(steps[0].reason).toMatch(/You asked/);
      expect(replyLine(replies, s, 'NOTE')).toMatch(/watch/);
    });
    it('"Something shorter" makes every step five minutes, and turns off again', async () => {
      const on = reply(none, { kind: 'short' }, date);
      expect(nextSteps(await base({ replies: on })).every((s) => s.minutes === 5)).toBe(true);
      expect(nextSteps(await base({ replies: on }))[0]).toMatchObject({ type: 'room' });
      const off = reply(on, { kind: 'short' }, date);
      expect(off.short).toBe(false);
      expect(nextSteps(await base({ replies: off })).some((s) => s.minutes)).toBe(false);
    });
    it('"Not today" brings other picks and tips', async () => {
      const a = nextSteps(await base());
      const b = nextSteps(await base({ replies: reply(none, { kind: 'skip' }, date) }));
      expect(b[0].key).not.toBe(a[0].key);
      expect(b[1].key).not.toBe(a[1].key);
    });
    it('"Why this?" answers with the reason and keeps the steps', async () => {
      const replies = reply(none, { kind: 'why' }, date);
      const input = await base({ replies });
      expect(nextSteps(input).map((s) => s.key)).toEqual(nextSteps(await base()).map((s) => s.key));
      expect(replyLine(replies, guideSteer(input), 'NOTE')).toMatch(/no listening yet|quietest/);
    });
    it('keeps nothing from another day, and starts over on request', () => {
      const yesterday = reply(none, { kind: 'skip' }, date);
      expect(reply(yesterday, { kind: 'short' }, '2026-10-29')).toEqual({ date: '2026-10-29', skips: 0, short: true, last: 'short' });
      expect(reply(yesterday, { kind: 'reset' }, date)).toEqual(none);
      expect(replyLine(none, steer(emptyWeek(), []), 'NOTE')).toBe('NOTE');
    });
  });
  it('writes a note about the week', () => {
    expect(guideNote(week({ read: 50, listen: 10 }), steer(week({ read: 50, listen: 10 }), []), 'Spanish')).toMatch(/^60 minutes of Spanish this week, mostly reading/);
    expect(guideNote(emptyWeek(), steer(emptyWeek(), []), 'Spanish')).toMatch(/fresh week/);
  });
});
