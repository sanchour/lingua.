import Dexie from 'dexie';
import type { EntityTable, Table } from 'dexie';
import type {
  ActivitySession,
  BlobRow,
  Capability,
  Card,
  Chapter,
  DailyStat,
  Deck,
  DictEntry,
  DictExample,
  DictForm,
  DictPack,
  DictParadigm,
  Feed,
  Folder,
  FrequencyRow,
  Goal,
  JournalEntry,
  JourneyEvent,
  LanguageProfile,
  LlmCacheRow,
  Media,
  Note,
  Song,
  PlaybackProgress,
  ReadingProgress,
  ReviewLog,
  SettingRow,
  StarterList,
  StudyLog,
  Text,
  TextVocab,
  TranslationCacheRow,
  Transcript,
  Word,
} from './types';

/** Version 1: the original schema. New tables arrive in later versions (additive, non-destructive). */
export const SCHEMA_V1 = {
  languages: 'id, isActive',
  settings: 'key',
  texts: 'id, lang, kind, shelf, lastOpenedAt, updatedAt',
  chapters: 'id, [textId+index]',
  readingProgress: 'textId, updatedAt',
  words: 'id, [lang+state], [lang+lemma], updatedAt',
  frequency: 'id, [lang+rank]',
  dictForms: '[pack+form]',
  dictEntries: '[pack+lemma]',
  dictPacks: 'id',
  translationCache: 'id, createdAt',
  llmCache: 'id, createdAt',
  folders: 'id, lang, parentId',
  decks: 'id, lang, folderId, kind, updatedAt',
  notes: 'id, deckId, wordId, lang, updatedAt, *tags',
  cards: 'id, noteId, [deckId+due], [deckId+state], due, updatedAt',
  reviewLogs: 'id, cardId, [deckId+reviewedAt], reviewedAt',
  media: 'id, lang, kind, collection, lastPlayedAt, updatedAt',
  transcripts: 'id, [mediaId+role]',
  playbackProgress: 'mediaId, updatedAt',
  blobs: 'id, kind',
  sessions: 'id, [lang+startedAt], type',
  dailyStats: 'id, [lang+date]',
} as const;

/** Version 2 (Phase 2): per-text vocabulary for comprehension statistics. */
export const SCHEMA_V2 = {
  textVocab: 'textId',
} as const;

/** Version 3 (Phase 3): example sentences and ready-made deck lists from the language packs. */
export const SCHEMA_V3 = {
  dictExamples: '[pack+lemma]',
  starterLists: 'lang',
} as const;

/** Version 4 (Phase 4): podcast feeds, and media findable by feed. */
export const SCHEMA_V4 = {
  feeds: 'id, lang, updatedAt',
  media: 'id, lang, kind, collection, feedId, lastPlayedAt, updatedAt',
} as const;

/** Version 5: inflection tables (conjugations, declensions) from the language packs. */
export const SCHEMA_V5 = {
  dictParadigms: '[pack+lemma]',
} as const;

/** Version 6 (Phases 5–6): the Diarium journal, Tabula, and Iter's journey, study log and goals. */
export const SCHEMA_V6 = {
  journalEntries: 'id, lang, [lang+date], updatedAt',
  capabilities: 'id, order, updatedAt',
  journeyEvents: 'id, lang, at, kind, updatedAt',
  studyLogs: 'id, lang, at, updatedAt',
  goals: 'id, lang, updatedAt',
} as const;

/** Version 7 (Lingua 2.0): Cantus, songs with their lyrics. */
export const SCHEMA_V7 = {
  songs: 'id, lang, [lang+savedAt], lastPlayedAt, updatedAt',
} as const;

const SCHEMA = { ...SCHEMA_V1, ...SCHEMA_V2, ...SCHEMA_V3, ...SCHEMA_V4, ...SCHEMA_V5, ...SCHEMA_V6, ...SCHEMA_V7 };
export type TableName = keyof typeof SCHEMA;
export const TABLE_NAMES = Object.keys(SCHEMA) as TableName[];

export type LinguaDB = Dexie & {
  languages: EntityTable<LanguageProfile, 'id'>;
  settings: EntityTable<SettingRow, 'key'>;
  texts: EntityTable<Text, 'id'>;
  chapters: EntityTable<Chapter, 'id'>;
  readingProgress: EntityTable<ReadingProgress, 'textId'>;
  words: EntityTable<Word, 'id'>;
  frequency: EntityTable<FrequencyRow, 'id'>;
  dictForms: Table<DictForm, [string, string]>;
  dictEntries: Table<DictEntry, [string, string]>;
  dictPacks: EntityTable<DictPack, 'id'>;
  translationCache: EntityTable<TranslationCacheRow, 'id'>;
  llmCache: EntityTable<LlmCacheRow, 'id'>;
  folders: EntityTable<Folder, 'id'>;
  decks: EntityTable<Deck, 'id'>;
  notes: EntityTable<Note, 'id'>;
  cards: EntityTable<Card, 'id'>;
  reviewLogs: EntityTable<ReviewLog, 'id'>;
  media: EntityTable<Media, 'id'>;
  transcripts: EntityTable<Transcript, 'id'>;
  playbackProgress: EntityTable<PlaybackProgress, 'mediaId'>;
  blobs: EntityTable<BlobRow, 'id'>;
  sessions: EntityTable<ActivitySession, 'id'>;
  dailyStats: EntityTable<DailyStat, 'id'>;
  textVocab: EntityTable<TextVocab, 'textId'>;
  dictExamples: Table<DictExample, [string, string]>;
  starterLists: EntityTable<StarterList, 'lang'>;
  feeds: EntityTable<Feed, 'id'>;
  dictParadigms: Table<DictParadigm, [string, string]>;
  journalEntries: EntityTable<JournalEntry, 'id'>;
  capabilities: EntityTable<Capability, 'id'>;
  journeyEvents: EntityTable<JourneyEvent, 'id'>;
  studyLogs: EntityTable<StudyLog, 'id'>;
  goals: EntityTable<Goal, 'id'>;
  songs: EntityTable<Song, 'id'>;
};

export function createDb(name = 'lingua'): LinguaDB {
  const db = new Dexie(name) as LinguaDB;
  db.version(1).stores(SCHEMA_V1);
  db.version(2).stores(SCHEMA_V2);
  db.version(3).stores(SCHEMA_V3);
  db.version(4).stores(SCHEMA_V4);
  db.version(5).stores(SCHEMA_V5);
  db.version(6).stores(SCHEMA_V6);
  db.version(7).stores(SCHEMA_V7);
  return db;
}

export const db = createDb();
