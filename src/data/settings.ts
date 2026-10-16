import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { LinguaDB } from './db';
import type { SettingRow } from './types';

export const READER_FONT_IDS = ['literata', 'lora', 'newsreader', 'merriweather', 'atkinson'] as const;
export type ReaderFontId = (typeof READER_FONT_IDS)[number];
export type ThemePref = 'paper' | 'nocturne' | 'system';
export type Theme = 'paper' | 'nocturne';
export const CARD_STYLE_IDS = ['plain', 'index', 'bookplate', 'linen'] as const;
export type CardStyleId = (typeof CARD_STYLE_IDS)[number];
export const CARD_TINT_IDS = ['paper', 'cream', 'sage', 'rose', 'sky', 'lavender', 'butter'] as const;
export type CardTintId = (typeof CARD_TINT_IDS)[number];

export interface Settings {
  theme: ThemePref;
  reader: {
    font: ReaderFontId;
    sizePx: number;
    lineHeight: number;
    maxWidthCh: number;
    mode: 'paged' | 'scroll';
    justify: boolean;
    highlightUnseen: boolean;
    autoKnownOnPageTurn: boolean;
  };
  /** How flashcards look (Thesaurus). */
  cards: { font: ReaderFontId; style: CardStyleId; tint: CardTintId; size: 'sm' | 'md' | 'lg' };
  study: {
    newPerDay: number;
    maxReviews: number;
    desiredRetention: number;
    ludusAffectsSchedule: boolean;
    autoPromoteMature: boolean;
  };
  translation: { chain: Array<'local' | 'mymemory' | 'lingva'>; lingvaHost: string };
  llm: { provider: 'groq' | 'gemini'; model: string };
  /** Device-only: never leaves this device unless explicitly included in a backup. */
  apiKeys: { groq: string; gemini: string };
  audio: { rate: number; skipBackSec: number; skipFwdSec: number; sentenceRepeat: number; repeatGapMs: number };
  /** Device-only: spoken words use this device's voices (Web Speech), chosen per language. */
  speech: { rate: number; voices: Record<string, string> };
  /** Device-only. */
  ui: { sidebarCollapsed: boolean; perfHud: boolean };
  /** Device-only. */
  meta: { deviceId: string; onboardedAt: number | null; lastBackupAt: number | null };
}

export type SettingKey = keyof Settings;

export const DEFAULT_SETTINGS: Settings = {
  theme: 'paper',
  reader: {
    font: 'literata',
    sizePx: 20,
    lineHeight: 1.65,
    maxWidthCh: 62,
    mode: 'paged',
    justify: false,
    highlightUnseen: true,
    autoKnownOnPageTurn: false,
  },
  cards: { font: 'literata', style: 'plain', tint: 'paper', size: 'md' },
  study: { newPerDay: 15, maxReviews: 200, desiredRetention: 0.9, ludusAffectsSchedule: true, autoPromoteMature: true },
  translation: { chain: ['local', 'mymemory', 'lingva'], lingvaHost: 'https://lingva.ml' },
  llm: { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  apiKeys: { groq: '', gemini: '' },
  audio: { rate: 1, skipBackSec: 10, skipFwdSec: 30, sentenceRepeat: 1, repeatGapMs: 1200 },
  speech: { rate: 0.95, voices: {} },
  ui: { sidebarCollapsed: false, perfHud: false },
  meta: { deviceId: '', onboardedAt: null, lastBackupAt: null },
};

/** Settings that describe this device rather than the learner; excluded from backup merges. */
export const DEVICE_LOCAL_SETTINGS: ReadonlySet<string> = new Set<SettingKey>(['apiKeys', 'ui', 'meta', 'speech']);

function mergeValue<K extends SettingKey>(key: K, stored: unknown): Settings[K] {
  const fallback = DEFAULT_SETTINGS[key];
  if (stored === undefined || stored === null) return fallback;
  if (typeof fallback === 'object' && !Array.isArray(fallback) && typeof stored === 'object') {
    return { ...fallback, ...(stored as object) } as Settings[K];
  }
  return stored as Settings[K];
}

export function rowsToSettings(rows: SettingRow[]): Settings {
  const out = { ...DEFAULT_SETTINGS } as Record<SettingKey, unknown>;
  for (const row of rows) {
    if (row.key in DEFAULT_SETTINGS) out[row.key as SettingKey] = mergeValue(row.key as SettingKey, row.value);
  }
  return out as unknown as Settings;
}

export async function getSettings(database: LinguaDB = db): Promise<Settings> {
  return rowsToSettings(await database.settings.toArray());
}

/** Live settings; `undefined` while the first read is in flight. */
export function useSettings(): Settings | undefined {
  return useLiveQuery(() => getSettings(), []);
}

export async function setSetting<K extends SettingKey>(key: K, value: Settings[K], database: LinguaDB = db): Promise<void> {
  await database.settings.put({ key, value, updatedAt: Date.now() });
}

type ObjectSettingKey = { [K in SettingKey]: Settings[K] extends object ? K : never }[SettingKey];

/** Merges a partial update into an object-valued setting. */
export async function patchSetting<K extends ObjectSettingKey>(
  key: K,
  patch: Partial<Settings[K]>,
  database: LinguaDB = db,
): Promise<void> {
  await database.transaction('rw', database.settings, async () => {
    const row = await database.settings.get(key);
    const current = mergeValue(key, row?.value);
    await database.settings.put({ key, value: { ...current, ...patch }, updatedAt: Date.now() });
  });
}

/** Gives this device a stable id (used to label backups). */
export async function ensureDeviceMeta(database: LinguaDB = db): Promise<void> {
  const settings = await getSettings(database);
  if (!settings.meta.deviceId) await patchSetting('meta', { deviceId: crypto.randomUUID() }, database);
}
