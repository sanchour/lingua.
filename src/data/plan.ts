// Lingua's plans (Lingua 5.1-2a): Free, Lingua+ (€24.99 once) and Lingua+ Max (€5.99 a month or
// €49.99 a year). One table, `can()`, decides every lock, so the split lives in one place. Max is
// AI with the learner's own key (D2): without Max a key unlocks nothing (D8).
import { getSettings, patchSetting } from './settings';
import type { Settings } from './settings';

export type PlanKind = 'free' | 'plus' | 'max';

/** What this device holds: Lingua+ for life, Max until a date, each with its signed licence. */
export interface PlanState {
  plus?: { since: number; licence?: string };
  max?: { since: number; until: number; licence?: string; interval?: 'month' | 'year' };
  /** Test mode only (Settings › Lab, or a buy button before Stripe is set up): the plan to act as. */
  pretend?: PlanKind;
}

export const PRICES = { plus: '€24.99', maxMonth: '€5.99', maxYear: '€49.99' } as const;

/** Max keeps working this long after its paid-until date while the device can't check (offline). */
export const MAX_GRACE_MS = 14 * 86_400_000;

/** Every feature that a plan unlocks; anything not listed is free. */
export type Feature = 'ludus' | 'sonusPlus' | 'streaming' | 'course' | 'grammatica' | 'typing' | 'sermo' | 'ai';

export const FEATURE_PLAN: Record<Feature, Exclude<PlanKind, 'free'>> = {
  ludus: 'plus',
  sonusPlus: 'plus',
  streaming: 'plus',
  course: 'plus',
  grammatica: 'plus',
  typing: 'plus',
  sermo: 'plus',
  ai: 'max',
};

/** How each locked feature is named on its "+" chip and in the plans sheet. */
export const FEATURE_NAME: Record<Feature, string> = {
  ludus: 'Ludus',
  sonusPlus: 'Sonus+',
  streaming: 'Streaming',
  course: 'The course',
  grammatica: 'Grammatica',
  typing: 'Typing',
  sermo: 'Sermo',
  ai: 'AI with your key',
};

const RANK: Record<PlanKind, number> = { free: 0, plus: 1, max: 2 };

export const can = (feature: Feature, plan: PlanKind): boolean => RANK[plan] >= RANK[FEATURE_PLAN[feature]];

/** The plan in force: Max while paid (and a grace after), else Lingua+ if bought, else free. */
export function planOf(meta: Pick<Settings['meta'], 'plan' | 'plusAt'>, now = Date.now()): PlanKind {
  const p = meta.plan;
  if (p?.pretend) return p.pretend;
  if (p?.max && p.max.until + MAX_GRACE_MS > now) return 'max';
  if (p?.plus || typeof meta.plusAt === 'number') return 'plus';
  return 'free';
}

/** The plan state with Lingua 4.0-1's placeholder (`plusAt`) carried over. */
export function migratePlan(meta: Pick<Settings['meta'], 'plan' | 'plusAt'>): PlanState {
  const p: PlanState = { ...meta.plan };
  if (!p.plus && typeof meta.plusAt === 'number') p.plus = { since: meta.plusAt };
  return p;
}

/** The AI keys a plan may use: Max uses the learner's own; otherwise none (TMDB and YouTube aren't AI). */
export function aiKeys(settings: Pick<Settings, 'apiKeys' | 'meta'>): Settings['apiKeys'] {
  return can('ai', planOf(settings.meta)) ? settings.apiKeys : { ...settings.apiKeys, groq: '', gemini: '' };
}

/** What stops AI with this provider: the plan (no Max), a missing key, or nothing (null). */
export function aiBlock(settings: Pick<Settings, 'apiKeys' | 'meta'>, provider: 'groq' | 'gemini'): 'max' | 'key' | null {
  if (!can('ai', planOf(settings.meta))) return 'max';
  return settings.apiKeys[provider]?.trim() ? null : 'key';
}

/** What a learner without Max is told where AI would answer. */
export const AI_NEEDS_MAX = 'AI with your own key comes with Lingua+ Max.';

/** The settings as the AI code sees them: the Groq and Gemini keys only with Max. */
export async function getAiSettings(): Promise<Settings> {
  const settings = await getSettings();
  return { ...settings, apiKeys: aiKeys(settings) };
}

export const savePlan = (meta: Settings['meta'], patch: Partial<PlanState>) => patchSetting('meta', { plan: { ...migratePlan(meta), ...patch }, plusAt: null });

/** Test mode: act as a plan (or stop pretending with null). */
export const pretendPlan = (meta: Settings['meta'], kind: PlanKind | null) => savePlan(meta, { pretend: kind ?? undefined });
