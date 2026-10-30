import { describe, expect, it } from 'vitest';
import {
  calculateAssistedRatio,
  calculateBendingTarget,
  calculateCurriculumProgress,
  calculateDelayedRetention,
  calculateListeningAnalytics,
  calculateMistakeTrends,
  calculateSkillDistribution,
  calculateStreakWithGrace,
  checkMilestoneStamps,
  getDailyQuote,
} from './analytics';
import type { EvidenceRow } from '@/core/contracts/learner';

describe('calculateBendingTarget', () => {
  it('spreads 140 minutes over 7 active days when starting fresh', () => {
    const res = calculateBendingTarget({
      weeklyTargetMinutes: 140,
      restDays: [],
      dailyMinutesThisWeek: [0, 0, 0, 0, 0, 0, 0],
      todayIndex: 0, // Monday
    });
    expect(res.targetToday).toBe(20);
    expect(res.studiedThisWeek).toBe(0);
    expect(res.remainingWeek).toBe(140);
    expect(res.isRestDay).toBe(false);
  });

  it('bends downward on subsequent days when user studies ahead of pace', () => {
    // 60 minutes done on Monday (index 0)
    const res = calculateBendingTarget({
      weeklyTargetMinutes: 140,
      restDays: [],
      dailyMinutesThisWeek: [60, 0, 0, 0, 0, 0, 0],
      todayIndex: 1, // Tuesday
    });
    // 80 minutes remaining across 6 active days -> ~13 min/day
    expect(res.targetToday).toBe(13);
    expect(res.studiedThisWeek).toBe(60);
    expect(res.remainingWeek).toBe(80);
  });

  it('sets targetToday to 0 on designated rest days without failing weekly pace', () => {
    // Sunday is rest day (day 0 in JS, index 6 in Monday-based week)
    const res = calculateBendingTarget({
      weeklyTargetMinutes: 100,
      restDays: [0], // Sunday
      dailyMinutesThisWeek: [20, 20, 20, 20, 20, 0, 0],
      todayIndex: 6, // Sunday
    });
    expect(res.isRestDay).toBe(true);
    expect(res.targetToday).toBe(0);
  });
});

describe('calculateStreakWithGrace', () => {
  it('counts streak normally with regular daily study', () => {
    const dailyMinutes = new Map<string, number>([
      ['2026-10-27', 20],
      ['2026-10-28', 25],
      ['2026-10-29', 30],
      ['2026-10-30', 20],
    ]);
    const res = calculateStreakWithGrace({
      dailyMinutes,
      dailyGoal: 15,
      restDays: [],
      now: new Date('2026-10-30T14:00:00').getTime(),
    });
    expect(res.current).toBe(4);
    expect(res.isRecovered).toBe(false);
  });

  it('smoothly bridges rest days without breaking streak', () => {
    // 2026-10-25 was Sunday (rest day)
    const dailyMinutes = new Map<string, number>([
      ['2026-10-24', 20], // Saturday (met)
      ['2026-10-25', 0],  // Sunday (rest day)
      ['2026-10-26', 25], // Monday (met)
    ]);
    const res = calculateStreakWithGrace({
      dailyMinutes,
      dailyGoal: 15,
      restDays: [0], // Sunday is rest
      now: new Date('2026-10-26T14:00:00').getTime(),
    });
    expect(res.current).toBe(2);
    expect(res.restDaysBridged).toBe(1);
  });

  it('recovers streak when missed day is followed by 2x make-up study', () => {
    const dailyMinutes = new Map<string, number>([
      ['2026-10-28', 20],
      ['2026-10-29', 0],  // Missed yesterday!
      ['2026-10-30', 40], // Double study today (make-up)!
    ]);
    const res = calculateStreakWithGrace({
      dailyMinutes,
      dailyGoal: 15,
      restDays: [],
      now: new Date('2026-10-30T14:00:00').getTime(),
    });
    expect(res.current).toBe(3);
    expect(res.isRecovered).toBe(true);
  });
});

describe('calculateSkillDistribution', () => {
  it('categorizes evidence and study minutes across the 8 skills', () => {
    const mockEvidence: EvidenceRow[] = [
      { id: '1', lang: 'es', at: Date.now(), day: '2026-10-30', skill: 'reading', room: 'codex', item: { type: 'text', textId: 't1' }, itemKey: 'text:t1', outcome: 'right', assisted: false },
      { id: '2', lang: 'es', at: Date.now(), day: '2026-10-30', skill: 'speaking', room: 'sermo', item: { type: 'word', wordId: 'w1' }, itemKey: 'word:w1', outcome: 'right', assisted: false },
      { id: '3', lang: 'es', at: Date.now(), day: '2026-10-30', skill: 'grammar', room: 'grammatica', item: { type: 'grammar', topicId: 'g1' }, itemKey: 'grammar:g1', outcome: 'wrong', assisted: false },
    ];
    const res = calculateSkillDistribution(mockEvidence, { reading: 30, speaking: 15, grammar: 20 });
    expect(res.skills.length).toBe(8);
    const reading = res.skills.find((s) => s.skill === 'reading');
    expect(reading?.minutes).toBe(30);
    expect(reading?.accuracy).toBe(1);
    expect(res.explanation.whatItSays).toBeDefined();
    expect(res.explanation.whatItDoesNotSay).toBeDefined();
  });
});

describe('calculateDelayedRetention', () => {
  it('differentiates same-day reviews from delayed retention after 1+ days', () => {
    const now = Date.now();
    const mockEvidence: EvidenceRow[] = [
      // Same day
      { id: '1', lang: 'es', at: now - 3600_000, day: '2026-10-30', skill: 'vocabulary', room: 'thesaurus', item: { type: 'word', wordId: 'w1' }, itemKey: 'word:w1', outcome: 'right', assisted: false },
      { id: '2', lang: 'es', at: now, day: '2026-10-30', skill: 'vocabulary', room: 'thesaurus', item: { type: 'word', wordId: 'w1' }, itemKey: 'word:w1', outcome: 'right', assisted: false },
      // Delayed by 3 days
      { id: '3', lang: 'es', at: now - 3 * 86_400_000, day: '2026-10-27', skill: 'vocabulary', room: 'thesaurus', item: { type: 'word', wordId: 'w2' }, itemKey: 'word:w2', outcome: 'right', assisted: false },
      { id: '4', lang: 'es', at: now, day: '2026-10-30', skill: 'vocabulary', room: 'thesaurus', item: { type: 'word', wordId: 'w2' }, itemKey: 'word:w2', outcome: 'wrong', assisted: false },
    ];
    const res = calculateDelayedRetention(mockEvidence);
    expect(res.sameDayRetention).toBe(1);
    expect(res.day1To6Retention).toBe(0);
  });
});

describe('calculateAssistedRatio', () => {
  it('computes fraction of independent answers versus assisted ones', () => {
    const mockEvidence: EvidenceRow[] = [
      { id: '1', lang: 'es', at: Date.now(), day: '2026-10-30', skill: 'vocabulary', room: 'thesaurus', item: { type: 'word', wordId: 'w1' }, itemKey: 'word:w1', outcome: 'right', assisted: false },
      { id: '2', lang: 'es', at: Date.now(), day: '2026-10-30', skill: 'vocabulary', room: 'thesaurus', item: { type: 'word', wordId: 'w2' }, itemKey: 'word:w2', outcome: 'right', assisted: true },
      { id: '3', lang: 'es', at: Date.now(), day: '2026-10-30', skill: 'grammar', room: 'grammatica', item: { type: 'grammar', topicId: 'g1' }, itemKey: 'grammar:g1', outcome: 'wrong', assisted: false },
    ];
    const res = calculateAssistedRatio(mockEvidence);
    expect(res.unassistedCount).toBe(2);
    expect(res.assistedCount).toBe(1);
    expect(res.independenceRatio).toBeCloseTo(2 / 3);
  });
});

describe('calculateListeningAnalytics', () => {
  it('groups listening comprehension by accent and playback speed', () => {
    const mockEvidence: EvidenceRow[] = [
      { id: '1', lang: 'es', at: Date.now(), day: '2026-10-30', skill: 'listening', room: 'sonus', item: { type: 'pattern', patternId: 'p1' }, itemKey: 'pattern:p1', outcome: 'right', assisted: false, contextId: 'accent:es-ES;speed:1.0x' },
      { id: '2', lang: 'es', at: Date.now(), day: '2026-10-30', skill: 'listening', room: 'sonus', item: { type: 'pattern', patternId: 'p2' }, itemKey: 'pattern:p2', outcome: 'wrong', assisted: false, contextId: 'accent:es-MX;speed:1.25x' },
    ];
    const res = calculateListeningAnalytics(mockEvidence);
    expect(res.byAccent.some((a) => a.accent === 'es-ES')).toBe(true);
    expect(res.bySpeed.some((s) => s.speed === '1.25x')).toBe(true);
  });
});

describe('calculateCurriculumProgress', () => {
  it('benchmarks current progress against CEFR level requirements', () => {
    const res = calculateCurriculumProgress('B1', {
      words: 1000,
      grammarTopics: 30,
      listeningHours: 20,
      readingWords: 30_000,
    });
    expect(res.targetLevel).toBe('B1');
    expect(res.items.find((i) => i.area === 'words')?.fraction).toBeCloseTo(0.5);
    expect(res.overallReadiness).toBeGreaterThan(0.4);
  });
});

describe('calculateMistakeTrends', () => {
  it('identifies improving and frequent mistake categories', () => {
    const now = Date.now();
    const mockEvidence: EvidenceRow[] = [
      { id: '1', lang: 'es', at: now - 3600_000, day: '2026-10-30', skill: 'grammar', room: 'grammatica', item: { type: 'grammar', topicId: 'g1' }, itemKey: 'grammar:g1', outcome: 'wrong', assisted: false, category: 'tense-aspect' },
      { id: '2', lang: 'es', at: now - 7200_000, day: '2026-10-30', skill: 'grammar', room: 'grammatica', item: { type: 'grammar', topicId: 'g2' }, itemKey: 'grammar:g2', outcome: 'wrong', assisted: false, category: 'tense-aspect' },
      { id: '3', lang: 'es', at: now - 86400_000, day: '2026-10-29', skill: 'grammar', room: 'grammatica', item: { type: 'grammar', topicId: 'g3' }, itemKey: 'grammar:g3', outcome: 'wrong', assisted: false, category: 'agreement' },
    ];
    const trends = calculateMistakeTrends(mockEvidence, now);
    expect(trends.length).toBeGreaterThan(0);
    expect(trends[0].category).toBe('tense-aspect');
  });
});

describe('checkMilestoneStamps', () => {
  it('unlocks stamps based on objective milestones achieved', () => {
    const stamps = checkMilestoneStamps({
      knownWords: 1200,
      finishedBooks: 1,
      conversations: 2,
      journalEntries: 3,
      songsSung: 1,
      streakDays: 32,
      totalHours: 15,
    });
    const firstBook = stamps.find((s) => s.id === 'first-book');
    const words1000 = stamps.find((s) => s.id === 'words-1000');
    const habit30 = stamps.find((s) => s.id === 'habit-30');
    expect(firstBook?.unlockedAt).toBeDefined();
    expect(words1000?.unlockedAt).toBeDefined();
    expect(habit30?.unlockedAt).toBeDefined();
  });
});

describe('getDailyQuote', () => {
  it('returns a calm, reflective quote deterministically for any date', () => {
    const q1 = getDailyQuote(new Date('2026-10-30'));
    const q2 = getDailyQuote(new Date('2026-10-30'));
    expect(q1.text).toBe(q2.text);
    expect(q1.author).toBeDefined();
  });
});
