import Dexie from 'dexie';
import type { EntityTable, Table } from 'dexie';
import type {
  ActivitySession,
  BlobRow,
  Card,
  Chapter,
  DailyStat,
  Deck,
  DictEntry,
  DictExample,
  DictForm,
  DictPack,
  Folder,
  FrequencyRow,
  LanguageProfile,
  LlmCacheRow,
  Media,
  Note,
  PlaybackProgress,
  ReadingProgress,
  ReviewLog,
  SettingRow,
  StarterList,
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

const SCHEMA = { ...SCHEMA_V1, ...SCHEMA_V2, ...SCHEMA_V3 };
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
};

export function createDb(name = 'lingua'): LinguaDB {
  const db = new Dexie(name) as LinguaDB;
  db.version(1).stores(SCHEMA_V1);
  db.version(2).stores(SCHEMA_V2);
  db.version(3).stores(SCHEMA_V3);
  return db;
}

export const db = createDb();
