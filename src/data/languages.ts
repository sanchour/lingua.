import { useLiveQuery } from 'dexie-react-hooks';
import type { Level } from '@/core/lang/levels';
import { getLevel } from '@/core/lang/levels';
import { db } from './db';
import type { LinguaDB } from './db';
import { patchSetting, setSetting } from './settings';
import type { ThemePref } from './settings';
import type { LanguageProfile } from './types';

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
}

export async function completeOnboarding(choice: OnboardingChoice, database: LinguaDB = db): Promise<void> {
  const now = Date.now();
  await database.transaction('rw', database.languages, database.settings, async () => {
    await database.languages.where('isActive').equals(1).modify({ isActive: 0, updatedAt: now });
    const existing = await database.languages.get(choice.target);
    const profile: LanguageProfile = {
      id: choice.target,
      native: choice.native,
      level: choice.level,
      isActive: 1,
      dictPackId: existing?.dictPackId,
      dailyGoal: existing?.dailyGoal ?? { reviews: 50, readMinutes: 15, listenMinutes: 10 },
      seededKnownTopN: choice.seedKnown ? getLevel(choice.level).seedKnownTopN : 0,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await database.languages.put(profile);
    await setSetting('theme', choice.theme, database);
    await patchSetting('meta', { onboardedAt: now }, database);
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
