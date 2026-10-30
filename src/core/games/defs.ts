// The games Ludus has (6-21), the shelf's data. Each later push (G2 to G7) adds its games here and its screen in features/games.
export type GameGroup = 'word' | 'story' | 'project';

export interface GameDef {
  id: string;
  group: GameGroup;
  title: string;
  detail: string;
  /** What the learner's words must be: how many, with a meaning, spelled in letters (at most `maxLetters`). `texts`: a text in Codex to find them in; `list`: that many words of the language's own list (a ladder is not made of the learner's words). */
  needs: { count: number; meaning?: true; letters?: true; maxLetters?: number; texts?: true; list?: number };
  /** Words in one round. */
  round: number;
}

export const GAME_GROUPS: Record<GameGroup, { title: string; detail: string }> = {
  word: { title: 'Word games', detail: 'Played on your own words.' },
  story: { title: 'Story games', detail: 'Stories you play through, with Max or ready-made.' },
  project: { title: 'Projects', detail: 'Small chains across rooms.' },
};

export const GAMES: GameDef[] = [
  { id: 'hangman', group: 'word', title: 'Hangman', detail: 'Name the letters of the word from its meaning. Six wrong letters and it is lost.', needs: { count: 5, meaning: true, letters: true }, round: 5 },
  { id: 'anagram', group: 'word', title: 'Anagrams', detail: 'The letters of the word are mixed up. Put them back in order, from its meaning.', needs: { count: 5, meaning: true, letters: true }, round: 5 },
  { id: 'missing', group: 'word', title: 'Missing letters', detail: 'The word with some of its letters left out. Fill them in from its meaning.', needs: { count: 5, meaning: true, letters: true }, round: 5 },
  { id: 'clues', group: 'word', title: 'Guess from clues', detail: 'Clues come one at a time, the hardest first. The fewer you need, the more stars.', needs: { count: 5, meaning: true }, round: 5 },
  { id: 'wordsearch', group: 'word', title: 'Word search', detail: 'Find your words in a grid of letters, across, down and slanting.', needs: { count: 6, letters: true, maxLetters: 10 }, round: 1 },
  { id: 'hunt', group: 'word', title: 'Word hunt', detail: 'Find your words in a passage from a text you have in Codex.', needs: { count: 5, texts: true }, round: 3 },
  { id: 'ladder', group: 'word', title: 'Word ladder', detail: 'Change one letter at a time to get from one word to another, every step a real word.', needs: { count: 0, letters: true, list: 300 }, round: 3 },
];

export const gameById = (id: string | undefined): GameDef | undefined => GAMES.find((g) => g.id === id);
