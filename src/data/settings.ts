import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { PlanState } from './plan';
import type { LinguaDB } from './db';
import type { SettingRow } from './types';
import type { NocturnePaletteId, PaperPaletteId } from '@/design/palettes';

export const READER_FONT_IDS = ['literata', 'lora', 'newsreader', 'merriweather', 'atkinson', 'comfortaa', 'lexend'] as const;
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
export type DeckSort = 'due' | 'name' | 'recent' | 'size' | 'hand';
/** Thesaurus › Discover (5.1-3b): the order of its decks, and the shelves they stand on. */
export type DiscoverSort = 'suggested' | 'size' | 'easiest';
export type DiscoverGroup = 'kind' | 'level';
export type MediaSort = 'recent' | 'added' | 'title' | 'longest' | 'shortest';
export type GoodreadsSort = 'added' | 'read' | 'rating' | 'author' | 'title' | 'year';
export type GoodreadsGroup = 'none' | 'shelf' | 'author' | 'yearRead';
/** System follows the device; Reduced keeps movement minimal; Full adds richer, longer motion. */
export type MotionPref = 'system' | 'reduced' | 'full';

/** Why someone learns, from onboarding (kept for later suggestions). */
/** Why someone learns. 'study' and 'sharp' came with 5.1-2b; 'books', 'talk' and 'fun' are kept for choices made before. */
export type LearningReason = 'travel' | 'family' | 'work' | 'culture' | 'study' | 'sharp' | 'books' | 'talk' | 'fun';
/** The kinds of practice someone enjoys most, in their order: Home lists these first. */
export type Enjoyment = 'reading' | 'listening' | 'music' | 'watching' | 'writing' | 'speaking' | 'cards';

/** How a word state is drawn in the reader ("T" › Words, 5.1-3a). */
export type WordLookState = 'known' | 'learning' | 'unseen';
export type WordColor = 'accent' | 'sage' | 'gold' | 'blue' | 'plum' | 'ink';
export interface WordLook {
  style: 'none' | 'underline' | 'dotted' | 'highlight' | 'faint';
  color: WordColor;
}


export type TutorPreset = "teacher" | "editor" | "coach";
export type TutorComplexity = "simple" | "balanced" | "technical";
export type TutorSentenceLength = "short" | "medium" | "detailed";
export type TutorExposure = "immersion" | "mostly" | "bilingual" | "native";
export type TutorCorrection = "gentle" | "balanced" | "strict";
export type TutorTranslation = "full" | "hover" | "minimal";

export interface TutorSettings {
  preset: TutorPreset;
  depth: "short" | "thorough";
  examplesFirst: boolean;
  complexity: TutorComplexity;
  sentenceLength: TutorSentenceLength;
  targetExposure: TutorExposure;
  correctionFrequency: TutorCorrection;
  translationAmount: TutorTranslation;
  speechSpeed: number;
  interests: string[];
}

export const TUTOR_PRESETS: Record<TutorPreset, {
  name: string;
  description: string;
  settings: Omit<TutorSettings, "preset" | "interests">;
}> = {
  teacher: {
    name: "Patient Teacher",
    description: "Encouraging, step-by-step explanations with analogies, clear translations, and balanced hints.",
    settings: {
      depth: "thorough",
      examplesFirst: true,
      complexity: "simple",
      sentenceLength: "medium",
      targetExposure: "bilingual",
      correctionFrequency: "balanced",
      translationAmount: "full",
      speechSpeed: 0.9,
    },
  },
  editor: {
    name: "Writing Editor",
    description: "Precise, technical analysis of register, nuance, collocations, punctuation, and idioms.",
    settings: {
      depth: "short",
      examplesFirst: false,
      complexity: "technical",
      sentenceLength: "short",
      targetExposure: "mostly",
      correctionFrequency: "strict",
      translationAmount: "hover",
      speechSpeed: 1.0,
    },
  },
  coach: {
    name: "Language Coach",
    description: "High-energy immersion, pragmatic communication, fluency-focused tips, and conversational hints.",
    settings: {
      depth: "short",
      examplesFirst: true,
      complexity: "balanced",
      sentenceLength: "short",
      targetExposure: "mostly",
      correctionFrequency: "gentle",
      translationAmount: "minimal",
      speechSpeed: 1.0,
    },
  },
};

export interface HabitSettings {
  /** Optional streak tracking (6-17, F1157). Default true. When false, streak badges and flame indicators are hidden. */
  streakEnabled: boolean;
  /** Rest days (0=Sun, 1=Mon, ..., 6=Sat) where not studying does not break a streak (6-17, F1160). Default []. */
  restDays: number[];
  /** Flexible weekly targets that bend (6-17, F1159): weekly target in minutes that dynamically spreads over remaining active days. */
  flexibleWeeklyMinutes: number;
  /** Study reminders (6-17, F1161, F1510, F1525). Off by default per Q5. */
  remindersEnabled: boolean;
  /** Reminder times in 24h HH:mm format, e.g. ['09:00', '19:30'] (6-17, F1162). */
  reminderTimes: string[];
  /** Quiet hours during which notifications are suppressed (6-17, F1163), e.g. '22:00' to '08:00'. */
  quietHours: { enabled: boolean; start: string; end: string };
  /** Custom self-set learner rewards (6-17, F1178), e.g. "Buy book in target language when 1000 words reached". */
  rewards: Array<{ id: string; milestone: string; reward: string; unlockedAt?: number }>;
  /** Active habit formation plan (F1173) or restart plan (F1174). */
  activePlan?: {
    type: 'habit' | 'restart';
    title: string;
    description: string;
    steps: Array<{ day: number; label: string; done?: boolean }>;
    startedAt: number;
  };
}

export interface Settings {
  theme: ThemePref;
  /** The look within Paper and within Nocturne (design/palettes): a page colour and its accent. */
  palette: { paper: PaperPaletteId; nocturne: NocturnePaletteId };
  /** Why they learn, what they enjoy, and what to call them (the first start's name, 5.1-2b). */
  learner: { reasons: LearningReason[]; enjoys: Enjoyment[]; name?: string };
  reader: {
    font: ReaderFontId;
    sizePx: number;
    lineHeight: number;
    /** Extra letter spacing in em (0..0.2), especially for dyslexia-friendly reading (6-25, F1531). */
    letterSpacing?: number;
    /** Extra word spacing in em (0..0.4), especially for dyslexia-friendly reading (6-25, F1531). */
    wordSpacing?: number;
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
    /** Pinyin, kana or a transliteration over words you don't know yet, over every word, fading as a word is learned (full while unseen, faint while learning, gone once known), or none. */
    readings: 'new' | 'all' | 'fade' | 'off';
    /** How Known, Learning and Unseen words look; unset is the usual look. Unseen marks show with `highlightUnseen`. */
    words?: Partial<Record<WordLookState, WordLook>>;
    /** The end page of a text: "Check yourself", the two story questions with AI, and "In your own words". */
    endCheck: boolean;
    endStory: boolean;
    endOwnWords: boolean;
  };
  /** How flashcards look (Thesaurus). */
  cards: { font: ReaderFontId; style: CardStyleId; tint: CardTintId; size: 'sm' | 'md' | 'lg'; width: CardWidth };
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
  tutor: TutorSettings;
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
  visio: { native: 'show' | 'blur' | 'after' | 'hide' | 'adaptive'; autoPause: boolean; subtitleScale: number };
  /**
   * Natural voices: off, or which voice speaks each locale (a Gemini voice-library id the learner
   * picked; the first good one when unset), and without a key which of the device's voices (its
   * voiceURI; the best one when unset).
   */
  voice: { off: boolean; chosen: Record<string, { id: string; name: string }>; device?: Record<string, string> };
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
    /** Codex › Goodreads (5.1-3a); its view (covers or list) is the library's. */
    goodreadsSort: GoodreadsSort;
    goodreadsGroup: GoodreadsGroup;
    deckSort: DeckSort;
    /** Thesaurus › My decks as a table or as cards (5.1-3b). */
    deckView: 'list' | 'cards';
    discoverSort: DiscoverSort;
    discoverGroup: DiscoverGroup;
    mediaSort: MediaSort;
    /** Home's "first steps" list, once put away. */
    firstStepsHidden: boolean;
    /** Cursus opens on the tab used last (none yet: Course for tier 1, Grammatica otherwise). */
    cursusTab: '' | 'course' | 'grammatica' | 'alphabets' | 'sounds' | 'typing';
    /** Sonus et Visio's library filter. */
    sonusShow: MediaShow;
    /** Home's layout: Today (5.1-2c) or the one before it. */
    homeLayout: 'today' | 'classic';
    /** A touch of the studied language in the design (5.1-4b, design/flavours.ts). */
    flavour: boolean;
    /** Settings › Lab › Design notes (7-0b): click any element to pin a note. Off for learners. */
    designNotes: boolean;
    /** The small lines that explain a setting or a card ([data-hint]); off hides them everywhere. */
    hints: boolean;
    /** Settings as a calm page of the essentials, or every group and option. */
    settingsMode: 'simple' | 'full';
    /** Command symbols in shortcuts: auto-detect from platform, or force mac / windows. */
    keyboardStyle: 'auto' | 'mac' | 'windows';
    /** High-contrast mode with WCAG AAA 7:1 text-to-background contrast (6-25, F1534). */
    highContrast?: boolean;
    /** Shapes and patterns beside colors so state is never conveyed by color alone (6-25, F1536). */
    colorBlindMode?: boolean;
  };
  /** Device-only. */
  meta: {
    deviceId: string;
    onboardedAt: number | null;
    lastBackupAt: number | null;
    /** Lingua 4.0-1's placeholder; carried into `plan` (data/plan.ts) and then cleared. */
    plusAt: number | null;
    /** Lingua+ and Max on this device (5.1-2a). */
    plan: PlanState | null;
  };
  /**
   * Device-only: the devices this one is paired with (each pairing's secret, which side of it this
   * device is, and when they last synced), and whether API keys go along. Never in backups.
   */
  sync: { devices: PairedDevice[]; includeApiKeys: boolean };
  /** Goals, habits, streaks, reminders and rewards (6-17). */
  habits: HabitSettings;
}

/** Sonus et Visio's library: everything, or only what you listen to or watch. */
export type MediaShow = 'all' | 'listen' | 'watch';

/** How wide a flashcard is on desktop (Lingua 5.2-1): about 460, 576 (as before) or 840 px. */
export type CardWidth = 'thin' | 'normal' | 'wide';

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
  // New installs follow the device's light (Lingua 5.1-1); see rowsToSettings for earlier ones.
  theme: 'system',
  palette: { paper: 'cream', nocturne: 'charcoal' },
  learner: { reasons: [], enjoys: [] },
  reader: {
    font: 'literata',
    sizePx: 20,
    lineHeight: 1.65,
    letterSpacing: 0,
    wordSpacing: 0,
    maxWidthCh: 62,
    mode: 'paged',
    justify: false,
    highlightUnseen: true,
    autoKnownOnPageTurn: false,
    paperLight: 'cream',
    paperDark: 'charcoal',
    contextGlosses: true,
    readings: 'new',
    endCheck: true,
    endStory: true,
    endOwnWords: true,
  },
  cards: { font: 'literata', style: 'plain', tint: 'paper', size: 'md', width: 'normal' },
  study: { newPerDay: 15, maxReviews: 200, desiredRetention: 0.9, ludusAffectsSchedule: true, autoPromoteMature: true },
  lessons: { length: 10, mode: 'classic', typing: true, sounds: true, haptics: true, ludusOff: [], grammarOff: [], best: {} },
  translation: { chain: ['local', 'mymemory', 'lingva'], lingvaHost: 'https://lingva.ml' },
  llm: { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  tutor: {
    preset: 'teacher',
    depth: 'thorough',
    examplesFirst: true,
    complexity: 'simple',
    sentenceLength: 'medium',
    targetExposure: 'bilingual',
    correctionFrequency: 'balanced',
    translationAmount: 'full',
    speechSpeed: 0.9,
    interests: ['culture', 'literature', 'travel'],
  },
  apiKeys: { groq: '', gemini: '', tmdb: '', youtube: '' },
  streaming: { services: [], country: '' },
  audio: { rate: 1, skipBackSec: 10, skipFwdSec: 30, sentenceRepeat: 2, repeatGapMs: 1200, whisperModel: 'whisper-large-v3-turbo', downloadProxy: '', transcriber: 'groq', deviceModel: 'base' },
  visio: { native: 'blur', autoPause: false, subtitleScale: 1 },
  voice: { off: false, chosen: {} },
  cantus: { translation: 'show' },
  spotify: { clientId: '', accessToken: '', refreshToken: '', expiresAt: 0, user: '' },
  ui: { motion: 'system', sidebarCollapsed: false, perfHud: false, librarySort: 'recent', libraryView: 'grid', goodreadsSort: 'added', goodreadsGroup: 'shelf', deckSort: 'due', deckView: 'list', discoverSort: 'suggested', discoverGroup: 'kind', mediaSort: 'recent', firstStepsHidden: false, cursusTab: '', sonusShow: 'all', homeLayout: 'today', flavour: true, designNotes: false, hints: true, settingsMode: 'simple', keyboardStyle: 'auto', highContrast: false, colorBlindMode: false },
  meta: { deviceId: '', onboardedAt: null, lastBackupAt: null, plusAt: null, plan: null },
  sync: { devices: [], includeApiKeys: false },
  habits: {
    streakEnabled: true,
    restDays: [],
    flexibleWeeklyMinutes: 120,
    remindersEnabled: false,
    reminderTimes: ['19:30'],
    quietHours: { enabled: true, start: '22:00', end: '08:00' },
    rewards: [],
  },
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
  // An install from before 5.1-1 that never chose a light kept the old default, paper.
  const onboarded = (rows.find((r) => r.key === 'meta')?.value as Partial<Settings['meta']> | undefined)?.onboardedAt;
  if (!rows.some((r) => r.key === 'theme') && typeof onboarded === 'number') out.theme = 'paper';
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
