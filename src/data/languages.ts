import { useLiveQuery } from 'dexie-react-hooks';
import type { Level } from '@/core/lang/levels';
import { getLevel } from '@/core/lang/levels';
import { db } from './db';
import type { LinguaDB } from './db';
import { getLanguage } from '@/core/lang/languages';
import { localDateKey } from '@/lib/format';
import { getSettings, patchSetting, setSetting } from './settings';
import type { Settings, ThemePref } from './settings';
import type { Capability, CefrLevel, LanguageProfile } from './types';

/** The language being studied right now; `null` before onboarding, `undefined` while loading. */
export function useActiveLanguage(): LanguageProfile | null | undefined {
  return useLiveQuery(async () => (await db.languages.where('isActive').equals(1).first()) ?? null, []);
}

export interface OnboardingChoice {
  target: string;
  native: string;
  level: Level;
  seedKnown: boolean;
  theme: ThemePref;
  /** Minutes a day: the daily goal. */
  minutes?: number;
  /** The level to reach. */
  goal?: CefrLevel;
  learner?: Settings['learner'];
  /** The first start's "You speak" (5.1-2b): written into Tabula with the language being learned. */
  spoken?: Array<{ id: string; name: string; level: CefrLevel; native: boolean }>;
}

export async function completeOnboarding(choice: OnboardingChoice, database: LinguaDB = db): Promise<void> {
  const now = Date.now();
  await database.transaction('rw', database.languages, database.settings, database.capabilities, async () => {
    await database.languages.where('isActive').equals(1).modify({ isActive: 0, updatedAt: now });
    const existing = await database.languages.get(choice.target);
    const profile: LanguageProfile = {
      id: choice.target,
      native: choice.native,
      level: choice.level,
      isActive: 1,
      dictPackId: existing?.dictPackId,
      dailyGoal: choice.minutes ? { reviews: 50, listenMinutes: 10, ...existing?.dailyGoal, readMinutes: choice.minutes } : (existing?.dailyGoal ?? { reviews: 50, readMinutes: 15, listenMinutes: 10 }),
      seededKnownTopN: choice.seedKnown ? getLevel(choice.level).seedKnownTopN : 0,
      goal: choice.goal ?? existing?.goal,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await database.languages.put(profile);
    await setSetting('theme', choice.theme, database);
    if (choice.learner) await setSetting('learner', choice.learner, database);
    if (choice.spoken) {
      // Tabula: the languages already spoken, and the one being learned, unless they're there already.
      const rows: Capability[] = [
        ...choice.spoken.map((s) => ({ id: s.id, name: s.name, level: s.level, status: s.native ? ('native' as const) : ('background' as const), methods: [] })),
        { id: choice.target, name: getLanguage(choice.target)?.name ?? choice.target, level: choice.level as CefrLevel, status: 'learning' as const, methods: ['Self-study'], started: localDateKey(now) },
      ].map((row, i) => ({ ...row, order: i, createdAt: now, updatedAt: now }));
      const order = await database.capabilities.count();
      for (const row of rows) if (!(await database.capabilities.get(row.id))) await database.capabilities.put({ ...row, order: order + row.order });
    }
    // A plan was chosen now (bought in the plans step, or free), so test mode doesn't treat this
    // install as one from before the plans (features/plans/usePlan).
    const { meta } = await getSettings(database);
    await patchSetting('meta', { onboardedAt: now, ...(meta.plan === null ? { plan: {} } : {}) }, database);
  });
}

export function useLanguages(): LanguageProfile[] | undefined {
  return useLiveQuery(() => db.languages.filter((l) => !l.deletedAt).sortBy('createdAt'), []);
}

export async function switchLanguage(id: string, database: LinguaDB = db): Promise<void> {
  const now = Date.now();
  await database.transaction('rw', database.languages, async () => {
    await database.languages.where('isActive').equals(1).modify({ isActive: 0, updatedAt: now });
    await database.languages.update(id, { isActive: 1, updatedAt: now });
  });
}

/** Re-opens onboarding to add another language; existing languages and data stay untouched. */
export async function startAnotherLanguage(database: LinguaDB = db): Promise<void> {
  await patchSetting('meta', { onboardedAt: null }, database);
}

export async function updateLanguage(id: string, patch: Partial<Omit<LanguageProfile, 'id' | 'createdAt'>>, database: LinguaDB = db): Promise<void> {
  await database.languages.update(id, { ...patch, updatedAt: Date.now() });
}
