// Explore (5.2-7): every pick, show and station in one place, the level made large. Pure: the page gathers the items
// (features/explora/ExploreAll.tsx) and these decide how they are banded, coloured and explained.
import type { Level } from '@/core/lang/levels';
import type { PickLevel } from '@/core/mundus/types';

export const LEVELS: PickLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

/** A learner's place on the scale (a beginner counts as A1). */
export const levelIndex = (learner: Level | string): number => Math.max(0, LEVELS.indexOf(learner as PickLevel));

/** One colour per level, from calm to deep, so the level reads at a glance. */
export const LEVEL_HUE: Record<PickLevel, string> = { A1: '#5f9b78', A2: '#86a04f', B1: '#cf9640', B2: '#c97a4e', C1: '#a8506b' };

/** What a level feels like, in a line (the side bar's "why this level"). */
export const LEVEL_WHY: Record<PickLevel, string> = {
  A1: 'Slow, clear speech and everyday words: a good place to start.',
  A2: 'Short sentences and familiar topics, with some support from images and context.',
  B1: 'Natural speed on everyday subjects: you’ll follow with subtitles or a dictionary at hand.',
  B2: 'Fast, idiomatic speech and longer texts, enjoyable without constant help.',
  C1: 'Full speed, slang, humour and cultural references.',
};

export type Band = 'at' | 'stretch' | 'easier' | 'level';
/** What the level filter shows: around the learner's level, everything, or one level. */
export type LevelFilter = 'mine' | 'any' | PickLevel;

export const BAND_NAME: Record<Exclude<Band, 'level'>, string> = { at: 'At your level', stretch: 'A stretch', easier: 'Easier' };

export interface Banded<T> {
  band: Band;
  title: string;
  items: T[];
}

/**
 * The items in bands: at the learner's level, a stretch above, easier below. "Around my level" keeps the stretch to one
 * level and the easier to one; "Any level" keeps them all; one level makes a single list.
 */
export function inBands<T extends { level: PickLevel }>(items: readonly T[], learner: Level | string, filter: LevelFilter): Array<Banded<T>> {
  if (filter !== 'mine' && filter !== 'any') {
    const only = items.filter((i) => i.level === filter);
    return only.length ? [{ band: 'level', title: `Level ${filter}`, items: only }] : [];
  }
  const me = levelIndex(learner);
  const at = items.filter((i) => LEVELS.indexOf(i.level) === me);
  const stretch = items.filter((i) => (filter === 'any' ? LEVELS.indexOf(i.level) > me : LEVELS.indexOf(i.level) === me + 1));
  const easier = items.filter((i) => (filter === 'any' ? LEVELS.indexOf(i.level) < me : LEVELS.indexOf(i.level) === me - 1));
  const sorted = (list: T[], dir: 1 | -1) => [...list].sort((a, b) => dir * (LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level)));
  return [
    { band: 'at' as const, title: `${BAND_NAME.at} · ${LEVELS[me]}`, items: at },
    { band: 'stretch' as const, title: BAND_NAME.stretch, items: sorted(stretch, 1) },
    { band: 'easier' as const, title: BAND_NAME.easier, items: sorted(easier, -1) },
  ].filter((b) => b.items.length);
}

/** Radio and audiobooks carry no curated level: live speech is estimated at B1, a read-aloud book at B2. */
export const ESTIMATED: Record<'radio' | 'audiobooks', PickLevel> = { radio: 'B1', audiobooks: 'B2' };
