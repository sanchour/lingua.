// Sermo's scene catalogue (5.2-6): about eighty scenes in groups, each with a level range, roles and goals.
// "From your week" isn't here: those cards are made on the page from what the learner read, watched and wrote.
import type { Level } from '@/core/lang/levels';
import { searchKey } from '@/design/primitives';
import { CULTURE } from './culture';
import { EVERYDAY } from './everyday';
import { GAMES } from './games';
import { PRACTICE } from './practice';
import { SOCIAL } from './social';
import { TRAVEL } from './travel';
import type { Scene } from './types';

export type { Scene, SceneGroup } from './types';
export { GROUPS } from './types';

export const SCENES: Scene[] = [...EVERYDAY, ...TRAVEL, ...WORK_AND_STUDY(), ...SOCIAL, ...CULTURE, ...GAMES, ...PRACTICE];

function WORK_AND_STUDY() {
  return WORK;
}
import { WORK } from './work';

const BY_ID = new Map(SCENES.map((s) => [s.id, s]));

export const getScene = (id: string): Scene | undefined => BY_ID.get(id);
export const asScene = (v: unknown): string | undefined => (typeof v === 'string' && BY_ID.has(v) ? v : undefined);

const RANK: Record<Level, number> = { A0: 1, A1: 1, A2: 2, B1: 3, B2: 4, C1: 5 };

/** Whether a scene works at a level (a beginner counts as A1). */
export const fits = (s: Scene, level: Level): boolean => RANK[s.from] <= RANK[level] && RANK[level] <= RANK[s.to];

/** The scenes that work at a level. */
export const scenesFor = (level: Level): Scene[] => SCENES.filter((s) => fits(s, level));

/** One scene a day, turning through those that fit the level (not the grammar one, which needs Grammatica). */
export const sceneOfTheDay = (level: Level, day: number): Scene => {
  const list = scenesFor(level).filter((s) => s.group !== 'practice');
  return list[((day % list.length) + list.length) % list.length];
};

/** Scenes whose title, detail, roles or goals match a search, accent-blind. */
export const searchScenes = (list: Scene[], query: string): Scene[] => {
  const q = searchKey(query.trim());
  if (!q) return list;
  return list.filter((s) => searchKey([s.title, s.detail, s.ai, s.setting, ...s.goals].join(' ')).includes(q));
};
