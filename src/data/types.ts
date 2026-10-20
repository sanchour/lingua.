// Row types for every IndexedDB table. This file is the schema of record (docs/ARCHITECTURE.md → Data).
// Conventions: ids are crypto.randomUUID() unless noted · times are epoch ms · indexed booleans are 0 | 1.

import type { Cefr, Level } from '@/core/lang/levels';

export type Lang = string;
/** 0 Unseen · 1 Known · 2 Learning */
export type WordState = 0 | 1 | 2;
export type Bit = 0 | 1;

/** User-owned rows carry merge metadata for backup/restore (and possible future sync). */
export interface Synced {
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

// ── Profile & settings ──────────────────────────────────────────────────────

export interface LanguageProfile extends Synced {
  /** Target language code, e.g. 'ru'. */
  id: Lang;
  native: Lang;
  level: Level;
  isActive: Bit;
  /** e.g. 'ru-en@1' once a dictionary pack is installed. */
  dictPackId?: string;
  dailyGoal: { reviews: number; readMinutes: number; listenMinutes: number };
  /** Proficiency seeding: pre-mark the top-N frequency forms as Known (0 = off). */
  seededKnownTopN: number;
  /** Set once the seeding has been applied (it needs the language pack). */
  seedAppliedAt?: number;
  /** The flag shown for the language (one of its flags in core/lang/languages); its usual one when unset. */
  flag?: string;
}

export interface SettingRow {
  key: string;
  value: unknown;
  updatedAt: number;
}

// ── Codex ───────────────────────────────────────────────────────────────────

export interface Text extends Synced {
  id: string;
  lang: Lang;
  /** 'comic': one chapter per page, the page's picture first and its speech bubbles after it. */
  kind: 'book' | 'article' | 'transcript' | 'shelfItem' | 'comic';
  source: 'epub' | 'pdf' | 'txt' | 'paste' | 'article' | 'goodreads' | 'sonus' | 'visio' | 'cantus' | 'comic';
  title: string;
  author?: string;
  coverBlobId?: string;
  /** A designed cover (cloth colour and ornament) for texts without a picture of their own. */
  cover?: CoverDesign;
  mediaId?: string;
  /** Where an article came from. */
  sourceUrl?: string;
  shelf?: 'to-read' | 'reading' | 'read';
  goodreads?: { bookId?: string; isbn13?: string; rating?: number; dateRead?: string; shelves?: string[] };
  /** The reading level the learner gave it (Lingua's own guess is in `stats.level`). */
  level?: Cefr;
  chapterCount: number;
  wordCount: number;
  lastOpenedAt?: number;
  finishedAt?: number;
  /** Comprehension, recomputed as words become known. */
  stats?: TextStats;
}

export type CoverOrnament = 'rule' | 'stars' | 'sprig' | 'moon' | 'frame';

export interface CoverDesign {
  /** Cloth colour id (features/codex/library/covers.ts). */
  cloth: string;
  ornament: CoverOrnament;
}

export interface TextStats {
  uniqueWords: number;
  /** Share of running words (tokens) that are Known or Learning, 0–1. */
  knownShare: number;
  /** Distinct forms still Unseen. */
  newWords: number;
  /** Lingua's guess at the reading level, from how common its words are. */
  level?: Cefr;
  computedAt: number;
}

/** Distinct word forms of a text with their counts (derived from chapters; rebuilt when missing). */
export interface TextVocab {
  textId: string;
  lang: Lang;
  norms: string[];
  counts: number[];
  tokens: number;
}

export type Block =
  /** `box`: a comic's speech bubble, where it sits on the page ([x, y, width, height], 0–1). */
  | { t: 'p' | 'h' | 'quote'; text: string; cue?: number; box?: [number, number, number, number] }
  /** `w`, `h`: a comic page's size in pixels, so the page keeps its shape while it loads. */
  | { t: 'img'; blobId: string; alt?: string; w?: number; h?: number };

/**
 * A chapter (or part of one). Edited chapters carry `updatedAt` and merge newest-wins; removed ones
 * stay as empty tombstones (`deletedAt`) so a backup can't bring them back. Imported chapters that
 * were never edited have neither.
 */
export interface Chapter {
  id: string;
  textId: string;
  index: number;
  title?: string;
  /** Long chapters are stored in parts: [part, of]. */
  part?: [number, number];
  wordCount: number;
  blocks: Block[];
  /** Comics: when the page's bubbles were read (by OCR on the device). */
  readAt?: number;
  updatedAt?: number;
  deletedAt?: number;
}

export interface ReadingProgress {
  textId: string;
  chapterIndex: number;
  blockIndex: number;
  percent: number;
  updatedAt: number;
}

// ── Word engine & dictionary ────────────────────────────────────────────────

export interface Word extends Synced {
  /** `${lang}:${norm}` — deterministic so both devices produce the same id. */
  id: string;
  lang: Lang;
  norm: string;
  lemma?: string;
  state: WordState;
  stateChangedAt: number;
  gloss?: string;
  note?: string;
  noteId?: string;
}

export interface FrequencyRow {
  /** `${lang}:${norm}` */
  id: string;
  lang: Lang;
  norm: string;
  rank: number;
  lemma?: string;
  gloss?: string;
  pos?: string;
}

export interface DictForm {
  pack: string;
  form: string;
  lemmas: string[];
  /** Short gloss (≤ 60 chars) for the instant tooltip. */
  g: string;
  /** Grammatical description, e.g. "plural past of чита́ть". */
  d?: string;
  /** How it reads: pinyin for Mandarin (xuéxí), kana for Japanese (たべました). */
  r?: string;
}

export interface DictEntry {
  pack: string;
  lemma: string;
  /** Headword as written in dictionaries (stress marks, German capitals), when it differs. */
  head?: string;
  /** Pronunciation; for Mandarin and Japanese, the reading (pinyin, kana). */
  ipa?: string;
  gender?: string;
  senses: { pos: string; glosses: string[]; tags?: string[] }[];
  forms?: { form: string; tags: string[] }[];
}

/** Usage examples for a lemma (from Wiktionary), with the span of the word for cloze exercises. */
export interface DictExample {
  pack: string;
  lemma: string;
  ex: Array<[sentence: string, translation: string, start: number, end: number]>;
}

/** A lemma's inflection table from the language pack: rows of [form as written, tags]. */
export interface DictParadigm {
  pack: string;
  lemma: string;
  pos: string;
  forms: Array<[form: string, tags: string]>;
}

/** The ready-made deck lists of an installed language pack (core/lang/starter.ts). */
export interface StarterList {
  lang: Lang;
  version: number;
  /** Lemma keys by frequency, for the Top-N decks. */
  lemmaFreq: string[];
  /** Theme id → [term, meaning, part of speech, gender]. */
  themes: Record<string, Array<[string, string, string, string]>>;
}

export interface DictPack {
  id: string;
  lang: Lang;
  native: Lang;
  version: number;
  source: 'kaikki' | 'freedict';
  forms: number;
  entries: number;
  sizeBytes: number;
  installedAt: number;
}

export interface TranslationCacheRow {
  /** `${provider}:${src}>${dst}:${hash}` */
  id: string;
  text: string;
  result: string;
  provider: string;
  createdAt: number;
}

export interface LlmCacheRow {
  /** hash(kind + model + prompt) */
  id: string;
  kind: 'wordInContext' | 'sentence' | 'cloze' | 'subtitleLine' | 'journalCheck' | 'journalPrompt' | 'lyrics';
  model: string;
  response: unknown;
  createdAt: number;
}

// ── Thesaurus ───────────────────────────────────────────────────────────────

export interface Folder extends Synced {
  id: string;
  lang: Lang;
  parentId: string | null;
  name: string;
  order: number;
  icon?: string;
}

export interface DeckConfig {
  newPerDay: number;
  maxReviews: number;
  desiredRetention: number;
  directions: Array<'recognition' | 'production'>;
  defaultMode: 'classic' | 'ludus';
}

export interface Deck extends Synced {
  id: string;
  lang: Lang;
  folderId: string | null;
  name: string;
  description?: string;
  order: number;
  kind: 'custom' | 'mined' | 'starterFrequency' | 'starterTheme' | 'apkg' | 'csv' | 'visio' | 'cantus';
  starter?: { packId: string; rankFrom?: number; rankTo?: number; theme?: string; materialized: Bit };
  config: DeckConfig;
}

export interface Note extends Synced {
  id: string;
  deckId: string;
  lang: Lang;
  term: string;
  meaning: string;
  lemma?: string;
  pos?: string;
  ipa?: string;
  gender?: string;
  freqRank?: number;
  example?: { text: string; translation?: string; cloze?: [start: number, end: number] };
  context?: {
    sentence: string;
    textId?: string;
    chapterIndex?: number;
    blockIndex?: number;
    mediaId?: string;
    /** Heard in a song (Cantus): the song, and the line's time in it. */
    songId?: string;
    startMs?: number;
    endMs?: number;
  };
  imageBlobId?: string;
  audioBlobId?: string;
  tags: string[];
  source: 'manual' | 'codex' | 'sonus' | 'visio' | 'cantus' | 'starter' | 'apkg' | 'csv';
  wordId?: string;
  /** Unmapped Anki / CSV fields, preserved verbatim. */
  extra?: Record<string, string>;
}

/** FSRS fields mirror ts-fsrs `Card` (camelCased); see core/srs/scheduler.ts. */
export interface Card extends Synced {
  id: string;
  noteId: string;
  deckId: string;
  direction: 'recognition' | 'production';
  due: number;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  /** 0 New · 1 Learning · 2 Review · 3 Relearning */
  state: 0 | 1 | 2 | 3;
  lastReview?: number;
  suspended: Bit;
}

/** `grammar` is a Grammatica drill (its log's deckId is `grammar:<lang>`, so vocabulary statistics leave it out). */
export type ReviewMode = 'classic' | 'mcq' | 'match' | 'cloze' | 'build' | 'type' | 'listen' | 'speak' | 'grammar';

/** Append-only; unioned on merge. */
export interface ReviewLog {
  id: string;
  cardId: string;
  deckId: string;
  reviewedAt: number;
  durationMs: number;
  rating: 1 | 2 | 3 | 4;
  mode: ReviewMode;
  affectedSchedule: Bit;
  stateBefore: 0 | 1 | 2 | 3;
  stabilityAfter: number;
  difficultyAfter: number;
  elapsedDays: number;
  scheduledDays: number;
}

// ── Sonus & Visio ───────────────────────────────────────────────────────────

export interface Media extends Synced {
  id: string;
  lang: Lang;
  /** `radio` is a live station: played, never stored as media (see SavedStation). */
  kind: 'audio' | 'video' | 'spotify' | 'radio';
  title: string;
  collection?: string;
  episode?: number;
  artist?: string;
  blobId?: string;
  mime?: string;
  sizeBytes?: number;
  durationMs?: number;
  coverBlobId?: string;
  spotify?: { uri: string; type: 'episode' | 'show' | 'playlist' | 'track'; embedUrl: string };
  textId?: string;
  lastPlayedAt?: number;
  /** Podcast episodes: the feed, the episode's id in it, and where the audio streams from. */
  feedId?: string;
  guid?: string;
  remoteUrl?: string;
  /** Artwork on the web (podcasts, Spotify); `coverBlobId` is used for artwork stored offline. */
  coverUrl?: string;
  publishedAt?: number;
  description?: string;
  /** Audiobooks and courses: the parts of one share `bookId`, and `episode` is the part's number. */
  bookId?: string;
  bookKind?: 'audiobook' | 'course';
  /** Chapters inside the file (an M4B's, or an MP3's ID3 chapters). */
  chapters?: AudioChapter[];
  /** A course's lesson, marked done. */
  doneAt?: number;
  /** The Codex text an audiobook is read along with (its sentences light up in the player). */
  readAlongTextId?: string;
}

/** Colloquium: a conversation with the learner's own AI, in the language. */
export interface Chat extends Synced {
  id: string;
  lang: Lang;
  /** The scene it started from (core/colloquium/prompts.ts). */
  scene: string;
  title: string;
  /** The opening prompt, in the language: sent first, not shown as a message. */
  prompt?: string;
  messages: ChatMessage[];
}
export interface ChatMessage {
  role: 'me' | 'ai';
  text: string;
  at: number;
  /** The AI's line in English. */
  en?: string;
  /** For the learner's lines: what to fix, quoted from the line. */
  corrections?: Array<{ original: string; suggestion: string; explanation: string }>;
  /** For the AI's lines: words worth keeping, with their meaning. */
  words?: Array<{ word: string; meaning: string }>;
}

export interface AudioChapter {
  title: string;
  startMs: number;
}

/** A podcast subscription. Episodes stay in the feed row until one is played or downloaded. */
export interface Feed extends Synced {
  id: string;
  lang: Lang;
  url: string;
  title: string;
  author?: string;
  description?: string;
  imageUrl?: string;
  link?: string;
  episodes: FeedEpisode[];
  lastFetchedAt: number;
}

export interface FeedEpisode {
  guid: string;
  title: string;
  url: string;
  mime?: string;
  sizeBytes?: number;
  publishedAt?: number;
  durationMs?: number;
  description?: string;
  imageUrl?: string;
}

export interface Cue {
  startMs: number;
  endMs: number;
  text: string;
  words?: { w: string; startMs: number; endMs: number }[];
}

export interface Transcript extends Synced {
  id: string;
  mediaId: string;
  lang: Lang;
  role: 'target' | 'native';
  /**
   * `text`: a plain transcript without timings, spread over the audio by length (approximate).
   * `book`: an audiobook's own text from Codex, timed by matching it with Whisper's.
   */
  source: 'srt' | 'vtt' | 'text' | 'whisper-groq' | 'whisper-local' | 'machine' | 'book';
  offsetMs: number;
  cues: Cue[];
  /** With `book`: the transcript it was timed from, to go back to. */
  original?: { source: Transcript['source']; cues: Cue[] };
}

export interface PlaybackProgress {
  mediaId: string;
  positionMs: number;
  rate: number;
  completed: Bit;
  updatedAt: number;
}

/** Large binaries live apart so list queries never load them. */
/** A word or line spoken by a natural voice, kept on this device (never backed up). */
/** A radio station from radio-browser.info, an open directory kept by its community. */
export interface RadioStation {
  /** radio-browser's station id. */
  id: string;
  name: string;
  /** The https stream. */
  url: string;
  homepage?: string;
  favicon?: string;
  country?: string;
  /** ISO 3166, upper case (`ES`). */
  countryCode?: string;
  state?: string;
  tags: string[];
  codec?: string;
  bitrate?: number;
  hls: boolean;
  lat?: number;
  lon?: number;
  /** Listens lately and votes on radio-browser, for the order. */
  clicks: number;
  votes: number;
}

/** A station kept on the device and synced: a favourite, or one played lately. */
export interface SavedStation extends RadioStation, Synced {
  lang: Lang;
  favorite: 0 | 1;
  playedAt?: number;
}

export interface SpeechRow {
  /** `${voice}|${text}` */
  id: string;
  lang: Lang;
  text: string;
  voice: string;
  blob: Blob;
  createdAt: number;
}

export interface BlobRow {
  id: string;
  kind: 'audio' | 'video' | 'image' | 'cover';
  mime: string;
  size: number;
  blob: Blob;
  createdAt: number;
}

// ── Cantus ──────────────────────────────────────────────────────────────────

export interface LyricLine {
  /** When the line starts, for timed lyrics. */
  startMs?: number;
  /** Empty for a break between verses. */
  text: string;
}

/**
 * A song: found through Apple's catalogue (or Spotify), with its lyrics from LRCLIB. Songs you open
 * are kept so they open instantly next time; `savedAt` puts one in Your songs.
 */
export interface Song extends Synced {
  /** `${lang}:itunes:${id}`, `${lang}:spotify:${id}` or a random id. */
  id: string;
  lang: Lang;
  title: string;
  artist: string;
  album?: string;
  year?: number;
  genre?: string;
  artworkUrl?: string;
  durationMs?: number;
  itunesId?: number;
  appleUrl?: string;
  /** Apple's 30-second preview. */
  previewUrl?: string;
  spotifyId?: string;
  youtubeId?: string;
  lrclibId?: number;
  /** Where the lyrics came from, for the credit under them (none: LRCLIB, as before 2.0-4b). */
  lyricsFrom?: 'lrclib' | 'lyrics.ovh' | 'pasted';
  /** Empty until lyrics are found (or when none exist). */
  lines: LyricLine[];
  /** Lyrics were looked for and none were found; or the song has no words. */
  lyricsMissing?: Bit;
  instrumental?: Bit;
  /** An English line for each lyric line (same length), from the AI or the free translators. */
  translation?: { lines: string[]; by: 'ai' | 'online' };
  /** Colours taken from the artwork for the song's page. */
  palette?: { base: string; deep: string; soft: string };
  /** Moves the lyrics' timing against the music (ms; positive = lyrics later). */
  offsetMs?: number;
  /** Where in the song Apple's 30-second preview starts (ms), once a tap on a line has said. */
  previewAtMs?: number;
  savedAt?: number;
  lastPlayedAt?: number;
  /** How many times the song has been opened (for "Most played by you"). */
  plays?: number;
  /** The lyrics opened in Codex as a text. */
  textId?: string;
}

// ── Ratio ───────────────────────────────────────────────────────────────────

export interface ActivitySession {
  id: string;
  lang: Lang;
  /** 'sing': time with a song in Cantus (counted as listening too). */
  type: 'read' | 'listen' | 'watch' | 'review' | 'ludus' | 'write' | 'sing' | 'grammar';
  refId?: string;
  startedAt: number;
  endedAt: number;
  activeMs: number;
  wordsRead?: number;
  cards?: number;
  correct?: number;
}

// ── Diarium ─────────────────────────────────────────────────────────────────

export type CorrectionCategory =
  | 'grammar'
  | 'spelling'
  | 'word choice'
  | 'word order'
  | 'agreement'
  | 'tense/aspect'
  | 'case'
  | 'punctuation'
  | 'style';

export interface JournalCorrection {
  original: string;
  suggestion: string;
  category: CorrectionCategory;
  explanation: string;
  severity: 'minor' | 'major';
}

/** The AI's reading of an entry (services/llm/journal.ts). */
export interface JournalReview {
  /** The text it reviewed (an entry may have changed since). */
  text: string;
  corrected: string;
  natural: string;
  corrections: JournalCorrection[];
  scores: { grammar: number; vocabulary: number; coherence: number; overall: number };
  cefr: string;
  strengths: string[];
  tip: string;
  model: string;
  reviewedAt: number;
}

export interface JournalEntry extends Synced {
  id: string;
  lang: Lang;
  /** The day it belongs to (YYYY-MM-DD), local time. */
  date: string;
  title?: string;
  prompt?: string;
  /** The prompt in English. */
  promptEn?: string;
  text: string;
  words: number;
  /** Earlier checked texts, newest last. */
  versions?: Array<{ text: string; at: number }>;
  review?: JournalReview;
}

// ── Tabula & Iter ───────────────────────────────────────────────────────────

export type CefrLevel = 'A0' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type CapabilityStatus = 'native' | 'natural' | 'background' | 'learning' | 'not-started';

/** One row of the polyglot table, for any language (also ones Lingua doesn't teach). */
export interface Capability extends Synced {
  /** A Lingua language code, or `x-<slug>` for other languages. */
  id: string;
  name: string;
  level: CefrLevel;
  status: CapabilityStatus;
  methods: string[];
  /** YYYY-MM-DD */
  started?: string;
  skills?: Partial<Record<'reading' | 'listening' | 'speaking' | 'writing', CefrLevel>>;
  /** Hours done outside Lingua before it was used (added to logged hours). */
  extraHours?: number;
  certificates?: Array<{ name: string; level?: string; date?: string }>;
  notes?: string;
  order: number;
}

export type JourneyKind =
  | 'started'
  | 'words'
  | 'book'
  | 'hours'
  | 'streak'
  | 'journal'
  | 'grade'
  | 'level'
  | 'deck'
  | 'song'
  | 'manual';

/** A moment on the journey: automatic milestones and the learner's own entries. */
export interface JourneyEvent extends Synced {
  /** Automatic milestones have deterministic ids (`${lang}:words:1000`) so they're recorded once. */
  id: string;
  lang: Lang;
  kind: JourneyKind;
  at: number;
  title: string;
  detail?: string;
  /** Manual entries: class, tutoring, exam, trip, conversation, note. */
  category?: string;
  photoBlobId?: string;
  value?: number;
}

/** Study done outside Lingua, so hours reflect everything. */
export interface StudyLog extends Synced {
  id: string;
  lang: Lang;
  at: number;
  minutes: number;
  activity: 'class' | 'tutor' | 'app' | 'conversation' | 'podcast' | 'reading' | 'other';
  note?: string;
}

export interface Goal extends Synced {
  id: string;
  lang: Lang;
  kind: 'level' | 'hours-week' | 'words-week' | 'books-year';
  /** Target level for 'level', otherwise a number. */
  target: CefrLevel | number;
  /** YYYY-MM-DD, for level goals. */
  by?: string;
  year?: number;
}

export interface DailyStat {
  /** `${lang}:${YYYY-MM-DD}` */
  id: string;
  lang: Lang;
  date: string;
  readMs: number;
  wordsRead: number;
  listenMs: number;
  watchMs: number;
  /** Diarium (added later, so older rows may lack them). */
  writeMs?: number;
  wordsWritten?: number;
  /** Cantus (added later): time with songs, also counted in `listenMs`. */
  songMs?: number;
  reviews: number;
  againCount: number;
  newCards: number;
  knownTotal: number;
  learningTotal: number;
  newKnown: number;
  newLearning: number;
  goalMet: Bit;
  updatedAt: number;
}

// ── Mundus ──────────────────────────────────────────────────────────────────

/** A "beyond the app" challenge done on a day (Lingua 3.0-7). Undoing it soft-deletes the row. */
export interface ChallengeDone extends Synced {
  /** `${lang}:${tipId}:${YYYY-MM-DD}` */
  id: string;
  lang: Lang;
  tipId: string;
  /** YYYY-MM-DD, local time. */
  date: string;
}

// ── Grammatica (Lingua 3.0-8) ───────────────────────────────────────────────

/** A grammar drill item's schedule: one FSRS card per item, made the first time it is answered. */
export interface GrammarItemRow extends Synced {
  /** `${lang}:${topic}:${key}`, the key being a hash of the item's sentence. */
  id: string;
  lang: Lang;
  topic: string;
  key: string;
  due: number;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  /** 0 New · 1 Learning · 2 Review · 3 Relearning */
  state: 0 | 1 | 2 | 3;
  lastReview?: number;
}

/** Where a learner stands in a topic: the step being worked on (1–5), 6 once it is learned. */
export interface GrammarProgressRow extends Synced {
  /** `${lang}:${topic}` */
  id: string;
  lang: Lang;
  topic: string;
  step: number;
  lessons: number;
  /** First-try accuracy on the current step in the last lesson (0–1). */
  lastScore?: number;
  lastStudied?: number;
  /** Marked as known by the placement check. */
  placed?: 1;
}
