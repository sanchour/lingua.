// Sermo's scenes (5.2-6): a situation to talk through with an AI, its level range, who plays whom, and what the
// learner should manage. Written in English; the prompt puts them in the language's own frame.
import type { Level } from '@/core/lang/levels';

export type SceneGroup = 'everyday' | 'travel' | 'work' | 'social' | 'culture' | 'games' | 'practice' | 'week';

export interface Scene {
  id: string;
  group: SceneGroup;
  title: string;
  detail: string;
  /** The levels it works at. */
  from: Level;
  to: Level;
  /** A picture for the card: a name the page turns into an icon. */
  icon: string;
  /** Who the AI plays, and who the learner is. */
  ai: string;
  you: string;
  /** The situation, in a sentence or two. */
  setting: string;
  /** Three to five things to manage in the conversation. */
  goals: string[];
}

export const GROUPS: Array<{ id: SceneGroup; title: string; detail: string }> = [
  { id: 'everyday', title: 'Everyday', detail: 'Shops, services and the people around you' },
  { id: 'travel', title: 'Travel', detail: 'Getting there, getting around, getting help' },
  { id: 'work', title: 'Work and study', detail: 'Interviews, meetings, colleagues' },
  { id: 'social', title: 'Social', detail: 'Friends, family, plans and feelings' },
  { id: 'culture', title: 'Culture and ideas', detail: 'Films, books, news and opinions' },
  { id: 'games', title: 'Stories and games', detail: 'Play with the language' },
  { id: 'practice', title: 'Practice', detail: 'One piece of grammar, in conversation' },
  { id: 'week', title: 'From your week', detail: 'What you read, watched and wrote' },
];

/** A scene from its parts, so the lists read like a table. */
export const scene = (
  id: string,
  group: SceneGroup,
  title: string,
  detail: string,
  [from, to]: [Level, Level],
  icon: string,
  [ai, you]: [string, string],
  setting: string,
  goals: string[],
): Scene => ({ id, group, title, detail, from, to, icon, ai, you, setting, goals });
