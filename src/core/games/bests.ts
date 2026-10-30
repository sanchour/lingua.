// What a learner has done in each game (6-21): plays, and the best round. Stars and time only, no points, no ranking (Q5).
export interface Best {
  plays: number;
  /** The most stars in one round, and the fewest milliseconds of a round that earned them. */
  stars: number;
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

/** The new best after a round, and whether it beat the old one (more stars, or the same stars faster). A round with fewer words never beats one with more. */
export function afterRound(old: Best | undefined, round: RoundResult): { best: Best; beat: boolean } {
  const plays = (old?.plays ?? 0) + 1;
  const better = !old || round.stars > old.stars || (round.stars === old.stars && round.stars > 0 && round.ms < old.ms);
  const best: Best = better ? { plays, stars: round.stars, ms: round.ms, lastAt: round.at } : { ...old, plays, lastAt: round.at };
  return { best, beat: better && !!old };
}

/** '1:05' or '0:42'. */
export function clock(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
