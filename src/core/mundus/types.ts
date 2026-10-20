// Mundus (Lingua 3.0-7): things to watch, read, play and listen to in the language, picked by hand.
// Picks carry no addresses of their own where a search finds them (a search never goes stale);
// only dictionaries and the odd site without a search keep a link.

export type PickLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export type PickKind = 'series' | 'film' | 'book' | 'game' | 'podcast' | 'youtube' | 'dictionary';

export interface Pick {
  /** The title as it is called in the language (its original title). */
  title: string;
  /** The English title, when it differs. */
  en?: string;
  /** Author, creator, director, host or studio. */
  by?: string;
  year?: number;
  /** The level from which it is enjoyable (with subtitles or a dictionary at hand). */
  level: PickLevel;
  /** Why it helps a learner, in one line. */
  why: string;
  /** Streaming services it is known to live on (its own originals), by service id. */
  on?: string[];
  /** A direct address, for dictionaries and sites a search wouldn't find. */
  url?: string;
  /** A search term better than the title (a channel's or a podcast's exact name). */
  search?: string;
}

export interface Picks {
  series: Pick[];
  films: Pick[];
  books: Pick[];
  games: Pick[];
  podcasts: Pick[];
  youtube: Pick[];
  dictionaries: Pick[];
  /** A sentence where a kind is thin in this language (say, few games come in Swahili). */
  notes?: Partial<Record<keyof Omit<Picks, 'notes'>, string>>;
}

export type PickGroup = keyof Omit<Picks, 'notes'>;

export const GROUP_KIND: Record<PickGroup, PickKind> = {
  series: 'series',
  films: 'film',
  books: 'book',
  games: 'game',
  podcasts: 'podcast',
  youtube: 'youtube',
  dictionaries: 'dictionary',
};

/** The levels a filter offers, as bands a learner recognises. */
export type LevelBand = 'all' | 'beginner' | 'intermediate' | 'advanced';

export function inBand(level: PickLevel, band: LevelBand): boolean {
  if (band === 'all') return true;
  if (band === 'beginner') return level === 'A1' || level === 'A2';
  if (band === 'intermediate') return level === 'B1' || level === 'B2';
  return level === 'C1';
}

const ORDER: PickLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

/** Whether a pick is within a learner's reach: at their level or one above (a beginner reaches A2). */
export function withinReach(level: PickLevel, learner: string): boolean {
  return ORDER.indexOf(level) <= Math.max(1, ORDER.indexOf(learner as PickLevel) + 1);
}

/** One series, film or book a day within the learner's reach, the same all day. */
export function pickOfTheDay(picks: Picks, learner: string, day: number): { pick: Pick; group: 'series' | 'films' | 'books' } | undefined {
  const pool = (['series', 'films', 'books'] as const).flatMap((group) => picks[group].filter((p) => withinReach(p.level, learner)).map((pick) => ({ pick, group })));
  return pool.length ? pool[day % pool.length] : undefined;
}
