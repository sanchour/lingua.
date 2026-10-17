export type Level = 'A0' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export interface LevelInfo {
  id: Level;
  name: string;
  blurb: string;
  /** Top-N most frequent forms that can be pre-marked Known (0 = none). */
  seedKnownTopN: number;
  /** Starter decks activated for this level (Phase 3 materialises them). */
  starterDecks: string[];
}

export const LEVELS: LevelInfo[] = [
  { id: 'A0', name: 'Brand new', blurb: 'Starting from the very first word.', seedKnownTopN: 0, starterDecks: ['Core Basics', 'Top 100'] },
  { id: 'A1', name: 'Beginner', blurb: 'A few greetings and everyday phrases.', seedKnownTopN: 100, starterDecks: ['Top 200', 'Essential Verbs'] },
  { id: 'A2', name: 'Elementary', blurb: 'Simple conversations about familiar things.', seedKnownTopN: 500, starterDecks: ['Top 1000'] },
  { id: 'B1', name: 'Intermediate', blurb: 'Can follow the gist of easy books and shows.', seedKnownTopN: 1000, starterDecks: ['Top 2000'] },
  { id: 'B2', name: 'Upper-intermediate', blurb: 'Reads articles; fluent on familiar topics.', seedKnownTopN: 2000, starterDecks: ['Top 5000'] },
  { id: 'C1', name: 'Advanced', blurb: 'Reads novels; polishing nuance and range.', seedKnownTopN: 5000, starterDecks: ['Top 10000'] },
];

/**
 * The CEFR level a word usually belongs to, from how common it is (rough vocabulary sizes: A1 about
 * 800 words, A2 1,600, B1 3,200, B2 6,000, C1 12,000).
 */
export function cefrForRank(rank: number): 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' {
  if (rank <= 800) return 'A1';
  if (rank <= 1600) return 'A2';
  if (rank <= 3200) return 'B1';
  if (rank <= 6000) return 'B2';
  if (rank <= 12000) return 'C1';
  return 'C2';
}

export function getLevel(id: Level): LevelInfo {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}
