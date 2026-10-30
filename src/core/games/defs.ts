// The games Ludus has (6-21), the shelf's data. Each later push (G2 to G7) adds its games here and its screen in features/games.
export type GameGroup = 'word' | 'story' | 'project';

export interface GameDef {
  id: string;
  group: GameGroup;
  title: string;
  detail: string;
  /** What the learner's words must be: how many, with a meaning, spelled in letters. */
  needs: { count: number; meaning?: true; letters?: true };
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
];

export const gameById = (id: string | undefined): GameDef | undefined => GAMES.find((g) => g.id === id);
