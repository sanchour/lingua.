// What a learner has done in each game (6-21): plays, and the best round. Stars and time only, no points, no ranking (Q5).
export interface Best {
  plays: number;
  /** The best round: its stars, what it could have earned, and its time. */
  stars: number;
  of: number;
  ms: number;
  lastAt: number;
}

export interface RoundResult {
  stars: number;
  /** What the round could have earned at most. */
  of: number;
  ms: number;
  at: number;
}

export type Bests = Record<string, Best>;

/** The new best after a round, and whether it beat the old one: a larger share of the stars it could have earned, or the same share faster (a round can have fewer words, so shares are compared). */
export function afterRound(old: Best | undefined, round: RoundResult): { best: Best; beat: boolean } {
  const plays = (old?.plays ?? 0) + 1;
  const share = round.of ? round.stars / round.of : 0;
  const oldShare = old ? old.stars / (old.of || round.of || 1) : 0;
  const better = !old || share > oldShare || (share === oldShare && round.stars > 0 && round.ms < old.ms);
  const best: Best = better ? { plays, stars: round.stars, of: round.of, ms: round.ms, lastAt: round.at } : { ...old, plays, lastAt: round.at };
  return { best, beat: better && !!old };
}

/** '1:05' or '0:42'. */
export function clock(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
