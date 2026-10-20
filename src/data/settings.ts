import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { LinguaDB } from './db';
import type { SettingRow } from './types';
import type { NocturnePaletteId, PaperPaletteId } from '@/design/palettes';

export const READER_FONT_IDS = ['literata', 'lora', 'newsreader', 'merriweather', 'atkinson', 'comfortaa'] as const;
export type ReaderFontId = (typeof READER_FONT_IDS)[number];
export type ThemePref = 'paper' | 'nocturne' | 'system';
export const PAPER_LIGHT_IDS = ['cream', 'ivory', 'parchment', 'sepia', 'sage', 'blush', 'stone'] as const;
export type PaperLightId = (typeof PAPER_LIGHT_IDS)[number];
export const PAPER_DARK_IDS = ['charcoal', 'espresso', 'dusk', 'ink', 'forest', 'plum', 'midnight'] as const;
export type PaperDarkId = (typeof PAPER_DARK_IDS)[number];
export type Theme = 'paper' | 'nocturne';
export const CARD_STYLE_IDS = ['plain', 'index', 'bookplate', 'linen'] as const;
export type CardStyleId = (typeof CARD_STYLE_IDS)[number];
export const CARD_TINT_IDS = ['paper', 'cream', 'sage', 'rose', 'sky', 'lavender', 'butter'] as const;
export type CardTintId = (typeof CARD_TINT_IDS)[number];
export type LibrarySort = 'recent' | 'added' | 'title' | 'author' | 'progress' | 'known';
export type DeckSort = 'due' | 'name' | 'recent' | 'size';
export type MediaSort = 'recent' | 'added' | 'title' | 'longest' | 'shortest';
/** System follows the device; Reduced keeps movement minimal; Full adds richer, longer motion. */
export type MotionPref = 'system' | 'reduced' | 'full';

/** Why someone learns, from onboarding (kept for later suggestions). */
export type LearningReason = 'travel' | 'books' | 'talk' | 'family' | 'work' | 'culture' | 'fun';
/** The kinds of practice someone enjoys most, in their order: Home lists these first. */
export type Enjoyment = 'reading' | 'listening' | 'music' | 'watching' | 'writing' | 'cards';

export interface Settings {
  theme: ThemePref;
  /** The look within Paper and within Nocturne (design/palettes): a page colour and its accent. */
  palette: { paper: PaperPaletteId; nocturne: NocturnePaletteId };
  learner: { reasons: LearningReason[]; enjoys: Enjoyment[] };
  reader: {
    font: ReaderFontId;
    sizePx: number;
    lineHeight: number;
    maxWidthCh: number;
    mode: 'paged' | 'scroll';
    justify: boolean;
    highlightUnseen: boolean;
    autoKnownOnPageTurn: boolean;
    /** Page colour while reading, for Paper and for Nocturne. */
    paperLight: PaperLightId;
    paperDark: PaperDarkId;
    /** With an AI key: words get the meaning their sentence needs (one request per sentence looked up). */
    contextGlosses: boolean;
    /** Mandarin and Japanese: pinyin or kana over words you don't know yet, over every word, or none. */
    readings: 'new' | 'all' | 'off';
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
  /**
   * How Ludus and grammar lessons run (the setup sheet): length, mode, typing, sounds and
   * vibration, the exercise kinds turned off for each, and Lightning's best scores by
   * `<lang>:<ludus|grammar>`.
   */
  lessons: LessonSettings;
  translation: { chain: Array<'local' | 'mymemory' | 'lingva'>; lingvaHost: string };
  llm: { provider: 'groq' | 'gemini'; model: string };
  /**
   * Device-only: never leaves this device unless explicitly included in a backup. `tmdb` is TMDB's
   * "API Read Access Token" (Lingua 3.0-7), sent in the Authorization header.
   */
  apiKeys: { groq: string; gemini: string; tmdb: string; youtube: string };
  /** Visio › Services and Mundus (Lingua 3.0-7): the streaming services you have, and your country ('' = from the device). */
  streaming: { services: string[]; country: string };
  audio: {
    rate: number;
    skipBackSec: number;
    skipFwdSec: number;
    sentenceRepeat: number;
    repeatGapMs: number;
    /** Groq Whisper model for transcripts. */
    whisperModel: 'whisper-large-v3-turbo' | 'whisper-large-v3';
    /** Optional relay for podcast hosts that don't let apps download; `{url}` is replaced. */
    downloadProxy: string;
    /** Where transcripts are made: Whisper on Groq (fast, needs a key) or on this device (private). */
    transcriber: 'groq' | 'device';
    deviceModel: 'tiny' | 'base' | 'small';
  };
  /** Visio's player. */
  visio: { native: 'show' | 'blur' | 'hide'; autoPause: boolean; subtitleScale: number };
  /**
   * Natural voices: off, or which voice speaks each locale (a Gemini voice-library id the learner
   * picked; the first good one when unset).
   */
  voice: { off: boolean; chosen: Record<string, { id: string; name: string }> };
  /** Cantus: how a song's lines are translated underneath, and whether its page follows the song. */
  cantus: { translation: 'show' | 'blur' | 'hide' };
  /**
   * Device-only: the learner's own Spotify app (a free developer app) and its sign-in, for liked
   * songs and finding a song on Spotify. Never in backups.
   */
  spotify: { clientId: string; accessToken: string; refreshToken: string; expiresAt: number; user: string };
  /** Device-only. */
  ui: {
    motion: MotionPref;
    sidebarCollapsed: boolean;
    perfHud: boolean;
    librarySort: LibrarySort;
    libraryView: 'grid' | 'list';
    deckSort: DeckSort;
    mediaSort: MediaSort;
    /** Home's "first steps" list, once put away. */
    firstStepsHidden: boolean;
  };
  /** Device-only. */
  meta: { deviceId: string; onboardedAt: number | null; lastBackupAt: number | null; plusAt: number | null };
  /**
   * Device-only: the devices this one is paired with (each pairing's secret, which side of it this
   * device is, and when they last synced), and whether API keys go along. Never in backups.
   */
  sync: { devices: PairedDevice[]; includeApiKeys: boolean };
}

export type LessonMode = 'classic' | 'zen';

export interface LessonSettings {
  length: 5 | 10 | 15 | 20;
  mode: LessonMode;
  typing: boolean;
  sounds: boolean;
  haptics: boolean;
  ludusOff: string[];
  grammarOff: string[];
  best: Record<string, number>;
}

export interface PairedDevice {
  /** The other device's id (its settings.meta.deviceId). */
  id: string;
  name: string;
  /** Shared by the two devices only: it names their meeting point and proves who's who. */
  secret: string;
  /** Which side of the pairing this device is: 'a' showed the code, 'b' typed or scanned it. */
  role: 'a' | 'b';
  pairedAt: number;
  lastSyncAt: number | null;
}

export type SettingKey = keyof Settings;

export const DEFAULT_SETTINGS: Settings = {
  theme: 'paper',
  palette: { paper: 'cream', nocturne: 'charcoal' },
  learner: { reasons: [], enjoys: [] },
  reader: {
    font: 'literata',
    sizePx: 20,
    lineHeight: 1.65,
    maxWidthCh: 62,
    mode: 'paged',
    justify: false,
    highlightUnseen: true,
    autoKnownOnPageTurn: false,
    paperLight: 'cream',
    paperDark: 'charcoal',
    contextGlosses: true,
    readings: 'new',
  },
  cards: { font: 'literata', style: 'plain', tint: 'paper', size: 'md' },
  study: { newPerDay: 15, maxReviews: 200, desiredRetention: 0.9, ludusAffectsSchedule: true, autoPromoteMature: true },
  lessons: { length: 10, mode: 'classic', typing: true, sounds: true, haptics: true, ludusOff: [], grammarOff: [], best: {} },
  translation: { chain: ['local', 'mymemory', 'lingva'], lingvaHost: 'https://lingva.ml' },
  llm: { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  apiKeys: { groq: '', gemini: '', tmdb: '', youtube: '' },
  streaming: { services: [], country: '' },
  audio: { rate: 1, skipBackSec: 10, skipFwdSec: 30, sentenceRepeat: 2, repeatGapMs: 1200, whisperModel: 'whisper-large-v3-turbo', downloadProxy: '', transcriber: 'groq', deviceModel: 'base' },
  visio: { native: 'blur', autoPause: false, subtitleScale: 1 },
  voice: { off: false, chosen: {} },
  cantus: { translation: 'show' },
  spotify: { clientId: '', accessToken: '', refreshToken: '', expiresAt: 0, user: '' },
  ui: { motion: 'system', sidebarCollapsed: false, perfHud: false, librarySort: 'recent', libraryView: 'grid', deckSort: 'due', mediaSort: 'recent', firstStepsHidden: false },
  meta: { deviceId: '', onboardedAt: null, lastBackupAt: null, plusAt: null },
  sync: { devices: [], includeApiKeys: false },
};

/** Settings that describe this device rather than the learner; excluded from backup merges. */
export const DEVICE_LOCAL_SETTINGS: ReadonlySet<string> = new Set<SettingKey>(['apiKeys', 'spotify', 'ui', 'meta', 'sync']);

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
