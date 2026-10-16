import { createContext, useContext } from 'react';
import type { Settings } from '@/data/settings';
import type { LanguageProfile } from '@/data/types';

export interface AppContextValue {
  settings: Settings;
  language: LanguageProfile;
}

export const AppContext = createContext<AppContextValue | null>(null);

/** Settings and active language for screens inside the app shell (after onboarding). */
export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp() must be used inside the app shell');
  return value;
}
