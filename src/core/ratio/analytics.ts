// Deep analytics, flexible goals, habits, stamps and progress (6-17, Catalogue Section 14).
// Pure logic: calculates bending weekly targets, rest-day streaks, delayed recall, assisted ratios,
// listening accent/speed comprehension, curriculum progress vs CEFR, and milestone stamps.

import type { CefrLevel } from '@/data/types';
import type { EvidenceRow, MistakeCategory, Skill } from '@/core/contracts/learner';

export interface BendingTargetResult {
  /** Minutes target for today given past performance and remaining active days */
  targetToday: number;
  /** Minutes studied so far this week (Mon-Sun) */
  studiedThisWeek: number;
  /** Total weekly goal in minutes */
  weeklyTarget: number;
  /** Remaining minutes needed to fulfill the weekly target */
  remainingWeek: number;
  /** Remaining active days this week including today (excluding rest days) */
  remainingActiveDays: number;
  /** Whether today is a designated rest day */
  isRestDay: boolean;
  /** Progress fraction (0..1+) */
  fraction: number;
  /** Human-readable pace explanation */
  paceLabel: string;
}

/**
 * Calculates a flexible weekly target that bends with rest days and earlier study.
 * E.g., if you studied more on Monday, targets for remaining days soften; if you take a rest day,
 * the remaining target smoothly redistributes across remaining active days without guilt.
 */
export function calculateBendingTarget(opts: {
  weeklyTargetMinutes: number;
  restDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  dailyMinutesThisWeek: number[]; // length 7, index 0 = Mon, 6 = Sun
  todayIndex: number; // 0 = Mon ... 6 = Sun
}): BendingTargetResult {
  const { weeklyTargetMinutes, restDays, dailyMinutesThisWeek, todayIndex } = opts;
  const studiedThisWeek = dailyMinutesThisWeek.slice(0, todayIndex + 1).reduce((a, b) => a + b, 0);
  const studiedBeforeToday = dailyMinutesThisWeek.slice(0, todayIndex).reduce((a, b) => a + b, 0);

  // Map Monday-based index (0=Mon..6=Sun) to JS getDay() (0=Sun, 1=Mon..6=Sat)
  const toJsDay = (monIdx: number) => (monIdx === 6 ? 0 : monIdx + 1);
  const todayJsDay = toJsDay(todayIndex);
  const isRestDay = restDays.includes(todayJsDay);

  // Calculate remaining active days from today through Sunday
  let remainingActiveDays = 0;
  for (let i = todayIndex; i < 7; i++) {
    if (!restDays.includes(toJsDay(i))) remainingActiveDays++;
  }

  const remainingWeek = Math.max(0, weeklyTargetMinutes - studiedBeforeToday);

  let targetToday = 0;
  if (isRestDay) {
    targetToday = 0;
  } else if (remainingActiveDays > 0) {
    targetToday = Math.round(remainingWeek / remainingActiveDays);
  }

  const fraction = weeklyTargetMinutes > 0 ? studiedThisWeek / weeklyTargetMinutes : 1;

  let paceLabel: string;
  if (fraction >= 1) {
    paceLabel = 'Weekly goal reached! Extra practice is just for joy.';
  } else if (isRestDay) {
    paceLabel = 'Today is a rest day. Enjoy your break or study lightly.';
  } else if (targetToday === 0) {
    paceLabel = 'On track for the week. Take it easy or explore something new.';
  } else {
    paceLabel = `${targetToday} min today to stay on track (${Math.round(remainingWeek)} min across ${remainingActiveDays} active ${remainingActiveDays === 1 ? 'day' : 'days'}).`;
  }

  return {
    targetToday,
    studiedThisWeek,
    weeklyTarget: weeklyTargetMinutes,
    remainingWeek: Math.max(0, weeklyTargetMinutes - studiedThisWeek),
    remainingActiveDays,
    isRestDay,
    fraction,
    paceLabel,
  };
}

export interface StreakWithGraceResult {
  /** Current active streak count */
  current: number;
  /** Longest streak ever */
  longest: number;
  /** Whether today or yesterday was recovered via make-up study */
  isRecovered: boolean;
  /** If yesterday was missed, whether studying extra today can make it up */
  canRecoverToday: boolean;
  /** Number of rest days smoothly bridged without breaking streak */
  restDaysBridged: number;
}

/**
 * Computes consecutive study streak with rest days and next-day make-up grace (F1157, F1158, F1160).
 * Rest days do not break the streak. A missed day can be repaired if the next day reaches >= 2x daily goal.
 */
export function calculateStreakWithGrace(opts: {
  dailyMinutes: Map<string, number>; // date 'YYYY-MM-DD' -> minutes studied
  dailyGoal: number; // minutes per day
  restDays: number[]; // 0=Sun..6=Sat
  now?: number;
}): StreakWithGraceResult {
  const { dailyMinutes, dailyGoal, restDays, now = Date.now() } = opts;
  const DAY_MS = 86_400_000;

  const dateToKey = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const todayDate = new Date(now);
  const todayKey = dateToKey(todayDate);
  const todayMins = dailyMinutes.get(todayKey) ?? 0;

  let current = 0;
  let restDaysBridged = 0;
  let isRecovered = false;
  let canRecoverToday = false;

  // Check if yesterday was missed and could be recovered today
  const yesterdayDate = new Date(now - DAY_MS);
  const yesterdayKey = dateToKey(yesterdayDate);
  const yesterdayMins = dailyMinutes.get(yesterdayKey) ?? 0;
  const yesterdayJsDay = yesterdayDate.getDay();
  const yesterdayWasRest = restDays.includes(yesterdayJsDay);
  const yesterdayMissed = !yesterdayWasRest && yesterdayMins < dailyGoal;

  if (yesterdayMissed) {
    if (todayMins >= dailyGoal * 2) {
      isRecovered = true;
    } else {
      canRecoverToday = true;
    }
  }

  // Iterate backwards from today (or yesterday if today is still in progress and not met)
  let cursor = todayMins >= dailyGoal || isRecovered ? now : now - DAY_MS;
  let missedOne = false;

  for (let i = 0; i < 365; i++) {
    const d = new Date(cursor);
    const key = dateToKey(d);
    const jsDay = d.getDay();
    const mins = dailyMinutes.get(key) ?? 0;
    const isRest = restDays.includes(jsDay);

    if (mins >= dailyGoal) {
      current++;
      missedOne = false;
    } else if (isRest) {
      // Rest day: bridge it without incrementing streak number or breaking it
      restDaysBridged++;
    } else if (!missedOne && i > 0) {
      // Check if next day in sequence had 2x study (make-up)
      const nextDayDate = new Date(cursor + DAY_MS);
      const nextDayMins = dailyMinutes.get(dateToKey(nextDayDate)) ?? 0;
      if (nextDayMins >= dailyGoal * 2) {
        isRecovered = true;
        current++;
        missedOne = false;
      } else {
        break;
      }
    } else {
      break;
    }
    cursor -= DAY_MS;
  }

  // Calculate longest historical streak
  const dates = [...dailyMinutes.keys()].sort();
  let longest = current;
  let run = 0;
  let prevTime = 0;

  for (const dateStr of dates) {
    const d = new Date(`${dateStr}T12:00:00`);
    const mins = dailyMinutes.get(dateStr) ?? 0;
    const isRest = restDays.includes(d.getDay());
    if (mins >= dailyGoal || isRest) {
      const ms = d.getTime();
      run = prevTime && Math.round((ms - prevTime) / DAY_MS) <= 2 ? run + 1 : 1;
      prevTime = ms;
      if (run > longest) longest = run;
    }
  }

  return {
    current,
    longest: Math.max(longest, current),
    isRecovered,
    canRecoverToday,
    restDaysBridged,
  };
}

export interface ChartExplanation {
  whatItSays: string;
  whatItDoesNotSay: string;
}

export interface SkillDistributionItem {
  skill: Skill;
  label: string;
  minutes: number;
  itemCount: number;
  accuracy: number;
  share: number;
  quiet: boolean;
}

export interface SkillDistributionResult {
  skills: SkillDistributionItem[];
  totalMinutes: number;
  explanation: ChartExplanation;
}

const SKILL_LABELS: Record<Skill, string> = {
  vocabulary: 'Vocabulary',
  grammar: 'Grammar',
  reading: 'Reading',
  listening: 'Listening',
  pronunciation: 'Pronunciation',
  speaking: 'Speaking',
  writing: 'Writing',
  translating: 'Translating',
};

/**
 * Multi-skill activity breakdown (F1608).
 * Analyzes evidence and study logs across the 8 language skills.
 */
export function calculateSkillDistribution(
  evidence: readonly EvidenceRow[],
  studyMinutesBySkill: Partial<Record<Skill, number>> = {},
): SkillDistributionResult {
  const stats = new Map<Skill, { items: number; right: number; minutes: number }>();
  const ALL_SKILLS: Skill[] = ['vocabulary', 'grammar', 'reading', 'listening', 'pronunciation', 'speaking', 'writing', 'translating'];

  for (const s of ALL_SKILLS) {
    stats.set(s, { items: 0, right: 0, minutes: studyMinutesBySkill[s] ?? 0 });
  }

  for (const row of evidence) {
    const entry = stats.get(row.skill);
    if (!entry) continue;
    entry.items++;
    if (row.outcome === 'right' || row.outcome === 'close') entry.right++;
  }

  const totalMinutes = ALL_SKILLS.reduce((sum, s) => sum + (stats.get(s)?.minutes ?? 0), 0) || 1;

  const skills: SkillDistributionItem[] = ALL_SKILLS.map((s) => {
    const st = stats.get(s)!;
    const accuracy = st.items > 0 ? st.right / st.items : 1;
    const share = st.minutes / totalMinutes;
    return {
      skill: s,
      label: SKILL_LABELS[s],
      minutes: Math.round(st.minutes),
      itemCount: st.items,
      accuracy,
      share,
      quiet: st.items === 0 && st.minutes === 0,
    };
  });

  return {
    skills,
    totalMinutes,
    explanation: {
      whatItSays: 'Shows how your practice time and exercises are balanced across active production and receptive comprehension.',
      whatItDoesNotSay: 'Does not mean all skills require equal hours; speaking and writing often have immense leverage from shorter, focused sessions.',
    },
  };
}

export interface DelayedRetentionResult {
  sameDayRetention: number;
  day1To6Retention: number;
  day7To29Retention: number;
  day30PlusRetention: number;
  overallDelayedRetention: number;
  totalReviewsAnalyzed: number;
  explanation: ChartExplanation;
}

/**
 * Calculates retention rates after >= 1 day versus same-day echo (F1158, F1608).
 */
export function calculateDelayedRetention(
  evidence: readonly EvidenceRow[],
): DelayedRetentionResult {
  let sameDayRight = 0, sameDayTotal = 0;
  let d1Right = 0, d1Total = 0;
  let d7Right = 0, d7Total = 0;
  let d30Right = 0, d30Total = 0;

  // Group evidence by itemKey to determine delays between sightings
  const firstSeen = new Map<string, number>();

  for (const row of evidence) {
    const seen = firstSeen.get(row.itemKey);
    const isRight = row.outcome === 'right' || row.outcome === 'close';

    if (seen === undefined) {
      firstSeen.set(row.itemKey, row.at);
      sameDayTotal++;
      if (isRight) sameDayRight++;
    } else {
      const delayDays = (row.at - seen) / 86_400_000;
      if (delayDays < 1) {
        sameDayTotal++;
        if (isRight) sameDayRight++;
      } else if (delayDays < 7) {
        d1Total++;
        if (isRight) d1Right++;
      } else if (delayDays < 30) {
        d7Total++;
        if (isRight) d7Right++;
      } else {
        d30Total++;
        if (isRight) d30Right++;
      }
    }
  }

  const delayedTotal = d1Total + d7Total + d30Total;
  const delayedRight = d1Right + d7Right + d30Right;

  return {
    sameDayRetention: sameDayTotal > 0 ? sameDayRight / sameDayTotal : 1,
    day1To6Retention: d1Total > 0 ? d1Right / d1Total : 0.85,
    day7To29Retention: d7Total > 0 ? d7Right / d7Total : 0.80,
    day30PlusRetention: d30Total > 0 ? d30Right / d30Total : 0.75,
    overallDelayedRetention: delayedTotal > 0 ? delayedRight / delayedTotal : 0.82,
    totalReviewsAnalyzed: sameDayTotal + delayedTotal,
    explanation: {
      whatItSays: 'Measures your recall after sleep and time have passed, filtering out temporary working-memory echo.',
      whatItDoesNotSay: 'Forgetting a card after 30 days is a natural step in spaced repetition; relearning it solidifies long-term memory far more than never being tested.',
    },
  };
}

export interface AssistedVsUnassistedResult {
  assistedCount: number;
  unassistedCount: number;
  unassistedAccuracy: number;
  assistedAccuracy: number;
  independenceRatio: number; // 0..1 (fraction of answers attempted without help)
  explanation: ChartExplanation;
}

/**
 * Analyzes answers solved independently versus those relying on hints or translations (F1608).
 */
export function calculateAssistedRatio(evidence: readonly EvidenceRow[]): AssistedVsUnassistedResult {
  let assisted = 0, unassisted = 0;
  let assistedRight = 0, unassistedRight = 0;

  for (const row of evidence) {
    const isRight = row.outcome === 'right' || row.outcome === 'close';
    if (row.assisted) {
      assisted++;
      if (isRight) assistedRight++;
    } else {
      unassisted++;
      if (isRight) unassistedRight++;
    }
  }

  const total = assisted + unassisted;
  return {
    assistedCount: assisted,
    unassistedCount: unassisted,
    unassistedAccuracy: unassisted > 0 ? unassistedRight / unassisted : 1,
    assistedAccuracy: assisted > 0 ? assistedRight / assisted : 0.7,
    independenceRatio: total > 0 ? unassisted / total : 1,
    explanation: {
      whatItSays: 'Tracks your progressive independence from glosses, grammar hints, and translation aids as patterns become automatic.',
      whatItDoesNotSay: 'Using a hint is a valid study strategy, not a failed attempt. Scaffolding speeds comprehension during early stages.',
    },
  };
}

export interface ListeningAccentComprehension {
  accent: string;
  label: string;
  items: number;
  accuracy: number;
}

export interface ListeningSpeedComprehension {
  speed: string;
  items: number;
  accuracy: number;
}

export interface ListeningAnalyticsResult {
  byAccent: ListeningAccentComprehension[];
  bySpeed: ListeningSpeedComprehension[];
  explanation: ChartExplanation;
}

/**
 * Tracks listening comprehension across regional accents and increasing playback speeds (F0508, F0509).
 */
export function calculateListeningAnalytics(evidence: readonly EvidenceRow[]): ListeningAnalyticsResult {
  const accentStats = new Map<string, { items: number; right: number }>();
  const speedStats = new Map<string, { items: number; right: number }>();

  // Default speed tiers
  for (const sp of ['0.8x', '1.0x', '1.25x', '1.5x']) {
    speedStats.set(sp, { items: 0, right: 0 });
  }

  for (const row of evidence) {
    if (row.skill !== 'listening') continue;
    const isRight = row.outcome === 'right' || row.outcome === 'close';

    // Parse speed or accent from contextId or given if available
    const speedMatch = row.contextId?.match(/(0\.8|1\.0|1\.25|1\.5)x?/);
    const speedKey = speedMatch ? `${speedMatch[1]}x` : '1.0x';
    const spEntry = speedStats.get(speedKey) ?? { items: 0, right: 0 };
    spEntry.items++;
    if (isRight) spEntry.right++;
    speedStats.set(speedKey, spEntry);

    // Accent breakdown
    const accent = row.contextId?.includes('accent:') ? row.contextId.split('accent:')[1]?.split(';')[0] : 'standard';
    const accEntry = accentStats.get(accent) ?? { items: 0, right: 0 };
    accEntry.items++;
    if (isRight) accEntry.right++;
    accentStats.set(accent, accEntry);
  }

  const ACCENT_NAMES: Record<string, string> = {
    standard: 'Standard / Neutral',
    'es-ES': 'Castilian (Spain)',
    'es-MX': 'Mexican',
    'es-AR': 'Rioplatense (Argentina)',
    'fr-FR': 'Metropolitan French',
    'fr-CA': 'Québécois French',
    'de-DE': 'Standard German (Hochdeutsch)',
    'de-AT': 'Austrian German',
    'ru-RU': 'Central Russian',
    'zh-CN': 'Standard Mandarin',
  };

  const byAccent: ListeningAccentComprehension[] = [...accentStats.entries()].map(([k, v]) => ({
    accent: k,
    label: ACCENT_NAMES[k] ?? k,
    items: v.items,
    accuracy: v.items > 0 ? v.right / v.items : 1,
  }));

  const bySpeed: ListeningSpeedComprehension[] = [...speedStats.entries()].map(([k, v]) => ({
    speed: k,
    items: v.items,
    accuracy: v.items > 0 ? v.right / v.items : 1,
  }));

  return {
    byAccent,
    bySpeed,
    explanation: {
      whatItSays: 'Reveals how your comprehension holds up across different regional pronunciations and faster tempos of speech.',
      whatItDoesNotSay: 'Studio recordings lack the background noise, overlapping speech, and visual gestures of live human interaction.',
    },
  };
}

export interface CurriculumProgressItem {
  area: 'words' | 'grammar' | 'listening' | 'reading';
  label: string;
  current: number;
  target: number;
  unit: string;
  fraction: number;
}

export interface CurriculumProgressResult {
  targetLevel: CefrLevel;
  items: CurriculumProgressItem[];
  overallReadiness: number; // 0..1
  explanation: ChartExplanation;
}

/** Standard CEFR curricular thresholds for benchmark comparison (F0922). */
const CEFR_CURRICULUM_BENCHMARKS: Record<
  CefrLevel,
  { words: number; grammarTopics: number; listeningHours: number; readingWords: number }
> = {
  A0: { words: 50, grammarTopics: 5, listeningHours: 1, readingWords: 500 },
  A1: { words: 500, grammarTopics: 15, listeningHours: 5, readingWords: 5_000 },
  A2: { words: 1_000, grammarTopics: 30, listeningHours: 15, readingWords: 20_000 },
  B1: { words: 2_000, grammarTopics: 45, listeningHours: 35, readingWords: 60_000 },
  B2: { words: 4_000, grammarTopics: 60, listeningHours: 75, readingWords: 150_000 },
  C1: { words: 8_000, grammarTopics: 75, listeningHours: 150, readingWords: 350_000 },
  C2: { words: 12_000, grammarTopics: 90, listeningHours: 300, readingWords: 800_000 },
};

/**
 * Compares curriculum progress across skills against target CEFR proficiency (F0922).
 */
export function calculateCurriculumProgress(
  targetLevel: CefrLevel,
  current: { words: number; grammarTopics: number; listeningHours: number; readingWords: number },
): CurriculumProgressResult {
  const bench = CEFR_CURRICULUM_BENCHMARKS[targetLevel] ?? CEFR_CURRICULUM_BENCHMARKS.B1;

  const items: CurriculumProgressItem[] = [
    {
      area: 'words',
      label: 'Known vocabulary',
      current: current.words,
      target: bench.words,
      unit: 'words',
      fraction: Math.min(1, current.words / bench.words),
    },
    {
      area: 'grammar',
      label: 'Grammar topics',
      current: current.grammarTopics,
      target: bench.grammarTopics,
      unit: 'topics',
      fraction: Math.min(1, current.grammarTopics / bench.grammarTopics),
    },
    {
      area: 'listening',
      label: 'Listening immersion',
      current: Math.round(current.listeningHours * 10) / 10,
      target: bench.listeningHours,
      unit: 'hours',
      fraction: Math.min(1, current.listeningHours / bench.listeningHours),
    },
    {
      area: 'reading',
      label: 'Reading volume',
      current: current.readingWords,
      target: bench.readingWords,
      unit: 'words',
      fraction: Math.min(1, current.readingWords / bench.readingWords),
    },
  ];

  const overallReadiness = items.reduce((sum, item) => sum + item.fraction, 0) / items.length;

  return {
    targetLevel,
    items,
    overallReadiness,
    explanation: {
      whatItSays: 'Compares your exposure volume and mastered topics against typical curricular requirements for the target CEFR level.',
      whatItDoesNotSay: 'Language competence is fluent ability in life, not checking off a static syllabus. Real confidence often precedes total coverage.',
    },
  };
}

export interface MistakeCategoryTrend {
  category: MistakeCategory;
  label: string;
  recentCount: number;
  previousCount: number;
  trend: 'improving' | 'stable' | 'frequent';
}

const CATEGORY_LABELS: Record<MistakeCategory, string> = {
  grammar: 'Grammar',
  spelling: 'Spelling',
  'word-choice': 'Word choice',
  'word-order': 'Word order',
  agreement: 'Agreement',
  'tense-aspect': 'Tense & aspect',
  case: 'Case declension',
  punctuation: 'Punctuation',
  style: 'Style & register',
  pronunciation: 'Pronunciation',
  mishearing: 'Mishearing',
};

/**
 * Analyzes mistake categories over time (F1608).
 */
export function calculateMistakeTrends(evidence: readonly EvidenceRow[], now = Date.now()): MistakeCategoryTrend[] {
  const DAY_MS = 86_400_000;
  const recentCutoff = now - 14 * DAY_MS;
  const previousCutoff = now - 28 * DAY_MS;

  const recentCounts = new Map<MistakeCategory, number>();
  const previousCounts = new Map<MistakeCategory, number>();

  for (const row of evidence) {
    if (!row.category || (row.outcome !== 'wrong' && row.outcome !== 'close')) continue;
    if (row.at >= recentCutoff) {
      recentCounts.set(row.category, (recentCounts.get(row.category) ?? 0) + 1);
    } else if (row.at >= previousCutoff) {
      previousCounts.set(row.category, (previousCounts.get(row.category) ?? 0) + 1);
    }
  }

  const allCategories = Object.keys(CATEGORY_LABELS) as MistakeCategory[];

  return allCategories
    .map((cat) => {
      const recent = recentCounts.get(cat) ?? 0;
      const prev = previousCounts.get(cat) ?? 0;
      let trend: 'improving' | 'stable' | 'frequent' = 'stable';
      if (recent < prev && prev > 2) trend = 'improving';
      else if (recent > 3) trend = 'frequent';
      return {
        category: cat,
        label: CATEGORY_LABELS[cat],
        recentCount: recent,
        previousCount: prev,
        trend,
      };
    })
    .filter((c) => c.recentCount > 0 || c.previousCount > 0)
    .sort((a, b) => b.recentCount - a.recentCount);
}

// ── Stamps, not points (F1167, F1168) ─────────────────────────────────────────

export interface MilestoneStamp {
  id: string;
  title: string;
  subtitle: string;
  category: 'words' | 'reading' | 'speaking' | 'writing' | 'habit' | 'listening';
  criteria: string;
  unlockedAt?: number;
  iconName: string;
}

export const STAMP_DEFINITIONS: Array<Omit<MilestoneStamp, 'unlockedAt'>> = [
  { id: 'first-word', title: 'First Word', subtitle: 'The Journey Begins', category: 'words', criteria: 'Learn your first word', iconName: 'sprout' },
  { id: 'words-500', title: '500 Words', subtitle: 'Foundation', category: 'words', criteria: 'Master 500 words', iconName: 'book-open' },
  { id: 'words-1000', title: '1,000 Words', subtitle: 'Conversational Core', category: 'words', criteria: 'Master 1,000 words', iconName: 'sparkles' },
  { id: 'words-2500', title: '2,500 Words', subtitle: 'Expanding Horizon', category: 'words', criteria: 'Master 2,500 words', iconName: 'compass' },
  { id: 'first-book', title: 'First Book', subtitle: 'The Open Page', category: 'reading', criteria: 'Finish reading your first book', iconName: 'feather' },
  { id: 'books-5', title: 'Five Books', subtitle: 'Voracious Reader', category: 'reading', criteria: 'Finish reading 5 books', iconName: 'layers' },
  { id: 'first-conversation', title: 'First Dialogue', subtitle: 'Giving Voice', category: 'speaking', criteria: 'Complete your first speaking practice', iconName: 'message-square' },
  { id: 'conversations-10', title: 'Ten Dialogues', subtitle: 'Confident Speaker', category: 'speaking', criteria: 'Complete 10 conversations', iconName: 'mic' },
  { id: 'first-entry', title: 'First Journal', subtitle: 'In Ink', category: 'writing', criteria: 'Write your first Diarium journal entry', iconName: 'pen-tool' },
  { id: 'first-song', title: 'First Song', subtitle: 'Singing in Tongues', category: 'listening', criteria: 'Sing along with a song in Cantus', iconName: 'music' },
  { id: 'habit-7', title: 'One Week', subtitle: 'Consistency', category: 'habit', criteria: 'Maintain a 7-day habit', iconName: 'calendar' },
  { id: 'habit-30', title: 'One Month', subtitle: 'Second Nature', category: 'habit', criteria: 'Maintain a 30-day habit', iconName: 'flame' },
  { id: 'habit-100', title: '100 Days', subtitle: 'A New Language in Mind', category: 'habit', criteria: 'Maintain a 100-day habit', iconName: 'award' },
  { id: 'hours-10', title: '10 Hours', subtitle: 'Deep Immersion', category: 'listening', criteria: 'Log 10 hours of study time', iconName: 'clock' },
  { id: 'hours-50', title: '50 Hours', subtitle: 'The Sound of Words', category: 'listening', criteria: 'Log 50 hours of study time', iconName: 'headphones' },
  { id: 'hours-100', title: '100 Hours', subtitle: 'Living the Language', category: 'listening', criteria: 'Log 100 hours of study time', iconName: 'sun' },
];

/**
 * Checks milestone stamps against learner progress and returns unlocked stamps with unlock timestamps.
 */
export function checkMilestoneStamps(data: {
  knownWords: number;
  finishedBooks: number;
  conversations: number;
  journalEntries: number;
  songsSung: number;
  streakDays: number;
  totalHours: number;
  unlockedEvents?: Map<string, number>;
}): MilestoneStamp[] {
  const {
    knownWords,
    finishedBooks,
    conversations,
    journalEntries,
    songsSung,
    streakDays,
    totalHours,
    unlockedEvents = new Map(),
  } = data;

  return STAMP_DEFINITIONS.map((def) => {
    let unlockedAt = unlockedEvents.get(def.id);

    if (!unlockedAt) {
      let isUnlocked = false;
      switch (def.id) {
        case 'first-word': isUnlocked = knownWords >= 1; break;
        case 'words-500': isUnlocked = knownWords >= 500; break;
        case 'words-1000': isUnlocked = knownWords >= 1000; break;
        case 'words-2500': isUnlocked = knownWords >= 2500; break;
        case 'first-book': isUnlocked = finishedBooks >= 1; break;
        case 'books-5': isUnlocked = finishedBooks >= 5; break;
        case 'first-conversation': isUnlocked = conversations >= 1; break;
        case 'conversations-10': isUnlocked = conversations >= 10; break;
        case 'first-entry': isUnlocked = journalEntries >= 1; break;
        case 'first-song': isUnlocked = songsSung >= 1; break;
        case 'habit-7': isUnlocked = streakDays >= 7; break;
        case 'habit-30': isUnlocked = streakDays >= 30; break;
        case 'habit-100': isUnlocked = streakDays >= 100; break;
        case 'hours-10': isUnlocked = totalHours >= 10; break;
        case 'hours-50': isUnlocked = totalHours >= 50; break;
        case 'hours-100': isUnlocked = totalHours >= 100; break;
      }
      if (isUnlocked) unlockedAt = Date.now();
    }

    return { ...def, unlockedAt };
  });
}

// ── Daily Motivational Messages (F1164) ─────────────────────────────────────

export const DAILY_MOTIVATIONAL_QUOTES = [
  { text: 'To have another language is to possess a second soul.', author: 'Charlemagne' },
  { text: 'Language is the road map of a culture. It tells you where its people come from and where they are going.', author: 'Rita Mae Brown' },
  { text: 'A different language is a different vision of life.', author: 'Federico Fellini' },
  { text: 'You can never understand one language until you understand at least two.', author: 'Geoffrey Willans' },
  { text: 'The limits of my language mean the limits of my world.', author: 'Ludwig Wittgenstein' },
  { text: 'Words are a lens to focus one’s mind.', author: 'Ayn Rand' },
  { text: 'One language sets you in a corridor for life. Two languages open every door along the way.', author: 'Frank Smith' },
  { text: 'Learning a language is having one more window from which to look at the world.', author: 'Chinese Proverb' },
  { text: 'Knowledge of languages is the doorway to wisdom.', author: 'Roger Bacon' },
  { text: 'Every new language is like an open window that shows a new view of the world and expands your attitude towards life.', author: 'Frank Harris' },
  { text: 'Language is the blood of the soul into which thoughts run and out of which they grow.', author: 'Oliver Wendell Holmes' },
  { text: 'No two people ever read the same book, just as no two people ever speak the exact same tongue.', author: 'Literary adage' },
  { text: 'Patience and gentle daily rhythm build fluency far faster than sporadic marathons.', author: 'Lingua Handbook' },
  { text: 'A slip is simply evidence of your mind reaching out into new expressive terrain.', author: 'Lingua Handbook' },
];

export function getDailyQuote(date = new Date()): (typeof DAILY_MOTIVATIONAL_QUOTES)[number] {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86_400_000);
  return DAILY_MOTIVATIONAL_QUOTES[dayOfYear % DAILY_MOTIVATIONAL_QUOTES.length];
}

// ── Habit Formation & Restart Plans (F1173, F1174) ──────────────────────────

export interface HabitPlanTemplate {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  anchor: string;
  steps: Array<{ day: number; label: string }>;
}

export const HABIT_FORMATION_PLANS: HabitPlanTemplate[] = [
  {
    id: 'morning-coffee',
    title: 'The Morning Coffee Anchor',
    subtitle: '5 quiet minutes with your cup',
    description: 'Attach flashcard review to the ritual of brewing your morning coffee or tea. Gentle, low-friction, and done before the day begins.',
    anchor: 'Right after brewing coffee or tea',
    steps: [
      { day: 1, label: 'Review 5 cards while your coffee cools' },
      { day: 2, label: 'Review 10 cards, noticing one word you love' },
      { day: 3, label: '5 minutes of flashcards, then stop cleanly' },
      { day: 4, label: '5 minutes of flashcards and 1 example sentence' },
      { day: 5, label: 'Morning rhythm established: 5-7 minutes' },
    ],
  },
  {
    id: 'commute-listener',
    title: 'The Commute Listener',
    subtitle: 'Tune into native voices on the go',
    description: 'Transform transit or walks into passive and active listening. 1 short podcast episode or 2 radio songs in the language.',
    anchor: 'Stepping out the door or boarding transit',
    steps: [
      { day: 1, label: 'Listen to 1 song in Cantus and glance at lyrics' },
      { day: 2, label: 'Listen to 5 minutes of native radio in Sonus' },
      { day: 3, label: 'Listen to 1 short podcast or dialogue' },
      { day: 4, label: 'Repeat 1 memorable phrase out loud under your breath' },
      { day: 5, label: 'Your daily listening habit is anchored' },
    ],
  },
  {
    id: 'evening-reader',
    title: 'The Bedtime Bookplate',
    subtitle: 'Unwind with one calm chapter',
    description: 'Replace late-night phone scrolling with a gentle graded text or bedtime story in Codex. Reading without lookups where possible.',
    anchor: 'Right before turning off the bedside lamp',
    steps: [
      { day: 1, label: 'Read 1 short fable or paragraph in Codex' },
      { day: 2, label: 'Read 2 pages, focusing on the flow rather than lookups' },
      { day: 3, label: 'Read for 8 minutes in quiet nocturne mode' },
      { day: 4, label: 'One chapter of a graded reader' },
      { day: 5, label: 'Peaceful reading routine cemented' },
    ],
  },
];

export const RESTART_PLANS: HabitPlanTemplate[] = [
  {
    id: 'gentle-restart',
    title: 'Welcome Back: 3-Day Re-entry',
    subtitle: 'No guilt, no backlog mountain',
    description: 'A 3-day warm-up designed to ease you back into rhythm without facing a mountain of overdue reviews or feeling behind.',
    anchor: 'Whenever you open Lingua today',
    steps: [
      { day: 1, label: 'Day 1: Warm-up — Review just 5 familiar words, no timer' },
      { day: 2, label: 'Day 2: Reconnection — Read 1 short easy story or listen to 1 familiar song' },
      { day: 3, label: 'Day 3: Finding Flow — 10-minute session in your favourite room' },
    ],
  },
];

// ── Reflection Prompts (F1170, F1128) ───────────────────────────────────────

export const REFLECTION_PROMPTS = [
  'What moment or phrase made you smile in your study this week?',
  'Which word came to your mind spontaneously without translating from your native language?',
  'Where did you feel friction or hesitation, and what could make that smoother next week?',
  'What real-life conversation or milestone are you most looking forward to having in this language?',
  'Which sentence structure or sound that once felt awkward now feels completely natural?',
];
