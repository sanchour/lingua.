import Dexie from 'dexie';
import type { EntityTable, Table } from 'dexie';
import type { FullDictRow } from '@/core/dictionary/format';
import type {
  ActivitySession,
  BlobRow,
  Capability,
  Card,
  ChallengeDone,
  Chapter,
  Chat,
  Sighting,
  DailyStat,
  Deck,
  DictEntry,
  DictExample,
  DictForm,
  DictPack,
  DictParadigm,
  GrammarItemRow,
  GrammarProgressRow,
  CourseProgressRow,
  TypingRow,
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
  SavedStation,
  SpeechRow,
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

/** Version 8 (Lingua 3.0-4): spoken words and lines, kept so each is generated once. */
export const SCHEMA_V8 = {
  speech: 'id, createdAt',
} as const;

/** Version 9 (Lingua 3.0-5): radio stations you keep (favourites, played lately). */
export const SCHEMA_V9 = {
  stations: 'id, lang, updatedAt',
} as const;

/** Version 10 (Lingua 3.0-6): audiobooks and courses, their parts findable by book. */
export const SCHEMA_V10 = {
  media: 'id, lang, kind, collection, feedId, bookId, lastPlayedAt, updatedAt',
} as const;

/** Version 12 (Lingua 3.0-7): Mundus's "beyond the app" challenges done, one row per challenge and day. */
export const SCHEMA_V12 = {
  challenges: 'id, lang, date, updatedAt',
} as const;

/** Version 13 (Lingua 3.0-8): Grammatica, a schedule per drill item and each topic's step. */
export const SCHEMA_V13 = {
  grammarItems: 'id, [lang+topic], [lang+due], updatedAt',
  grammarProgress: 'id, lang, updatedAt',
} as const;

/** Version 14 (Lingua 3.0-6): Colloquium's chats with the learner's own AI. They came after Mundus (12) and
 *  Grammatica (13): a device already at 13 never runs a lower version's upgrade, so 11 stays unused. */
export const SCHEMA_V14 = {
  chats: 'id, lang, updatedAt',
} as const;

/** Version 15 (Lingua 4.0-2): where each word was met, and the full dictionary of the core languages. */
export const SCHEMA_V15 = {
  sightings: 'id, [lang+norm], [lang+lemma], [lang+at], updatedAt',
  fullDict: '[lang+key], [lang+fold], lang',
} as const;

/** Version 16 (Lingua 5, Cursus): the course, one row per language and unit. */
export const SCHEMA_V16 = {
  courseProgress: 'id, lang, updatedAt',
} as const;

/** Version 17 (Lingua 5.1-4a): typing practice, one row per language. */
export const SCHEMA_V17 = {
  typing: 'id, lang, updatedAt',
} as const;

/** Version 18 (Lingua 6-1, the word record): favourite and important words, and (6-2) the inbox, found by language. */
export const SCHEMA_V18 = {
  words: 'id, [lang+state], [lang+lemma], [lang+favourite], [lang+important], [lang+inbox], updatedAt',
} as const;

/** Version 19 (Lingua 6-2): archived decks are found by language, cards of a deck by their place. */
export const SCHEMA_V19 = {
  decks: 'id, lang, folderId, kind, [lang+archived], updatedAt',
  notes: 'id, deckId, wordId, lang, [deckId+order], updatedAt, *tags',
} as const;

const SCHEMA = { ...SCHEMA_V1, ...SCHEMA_V2, ...SCHEMA_V3, ...SCHEMA_V4, ...SCHEMA_V5, ...SCHEMA_V6, ...SCHEMA_V7, ...SCHEMA_V8, ...SCHEMA_V9, ...SCHEMA_V10, ...SCHEMA_V12, ...SCHEMA_V13, ...SCHEMA_V14, ...SCHEMA_V15, ...SCHEMA_V16, ...SCHEMA_V17, ...SCHEMA_V18, ...SCHEMA_V19 };
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
  speech: EntityTable<SpeechRow, 'id'>;
  stations: EntityTable<SavedStation, 'id'>;
  challenges: EntityTable<ChallengeDone, 'id'>;
  grammarItems: EntityTable<GrammarItemRow, 'id'>;
  grammarProgress: EntityTable<GrammarProgressRow, 'id'>;
  chats: EntityTable<Chat, 'id'>;
  sightings: EntityTable<Sighting, 'id'>;
  fullDict: Table<FullDictRow, [string, string]>;
  courseProgress: EntityTable<CourseProgressRow, 'id'>;
  typing: EntityTable<TypingRow, 'id'>;
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
  db.version(8).stores(SCHEMA_V8);
  db.version(9).stores(SCHEMA_V9);
  db.version(10).stores(SCHEMA_V10);
  db.version(12).stores(SCHEMA_V12);
  db.version(13).stores(SCHEMA_V13);
  db.version(14).stores(SCHEMA_V14);
  db.version(15).stores(SCHEMA_V15);
  db.version(16).stores(SCHEMA_V16);
  db.version(17).stores(SCHEMA_V17);
  db.version(18).stores(SCHEMA_V18);
  db.version(19).stores(SCHEMA_V19);
  return db;
}

export const db = createDb();
