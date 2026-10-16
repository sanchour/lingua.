// Cloth colours and ornaments for designed book covers. The first eight are the automatic ones
// (chosen from the title), so existing covers keep their look.
import type { CoverDesign, CoverOrnament } from '@/data/types';
import { hashString } from '@/core/hash';

export interface Cloth {
  id: string;
  name: string;
  bg: string;
  ink: string;
}

export const CLOTHS: Cloth[] = [
  { id: 'sage', name: 'Sage', bg: '#6b8e78', ink: '#faf6f0' },
  { id: 'terracotta', name: 'Terracotta', bg: '#b8664c', ink: '#fff8f0' },
  { id: 'ink', name: 'Ink', bg: '#3f4b5c', ink: '#f2ece1' },
  { id: 'walnut', name: 'Walnut', bg: '#8a6a4f', ink: '#faf1e4' },
  { id: 'honey', name: 'Honey', bg: '#d2b07f', ink: '#2a2420' },
  { id: 'plum', name: 'Plum', bg: '#5b4b6b', ink: '#f2ece1' },
  { id: 'forest', name: 'Forest', bg: '#2f3e36', ink: '#eae3d5' },
  { id: 'rose', name: 'Rose', bg: '#b98a7b', ink: '#2a2420' },
  { id: 'butter', name: 'Butter', bg: '#e8d49a', ink: '#3a2f20' },
  { id: 'lavender', name: 'Lavender', bg: '#a99bc4', ink: '#2a2235' },
  { id: 'sky', name: 'Sky', bg: '#8fb3c9', ink: '#1f2a33' },
  { id: 'blush', name: 'Blush', bg: '#e7b9b0', ink: '#3a2522' },
  { id: 'midnight', name: 'Midnight', bg: '#23283a', ink: '#e8dcc4' },
  { id: 'cream', name: 'Cream', bg: '#efe3cc', ink: '#3b302a' },
];

export const ORNAMENTS: Array<{ id: CoverOrnament; name: string }> = [
  { id: 'rule', name: 'Rule' },
  { id: 'stars', name: 'Stars' },
  { id: 'sprig', name: 'Sprig' },
  { id: 'moon', name: 'Moon' },
  { id: 'frame', name: 'Frame' },
];

/** The cover a text shows: its own design, or a colour picked from its title. */
export function coverOf(text: { title: string; cover?: CoverDesign }): { cloth: Cloth; ornament: CoverOrnament } {
  const chosen = text.cover && CLOTHS.find((c) => c.id === text.cover!.cloth);
  return {
    cloth: chosen ?? CLOTHS[parseInt(hashString(text.title), 36) % 8],
    ornament: text.cover?.ornament ?? 'rule',
  };
}
