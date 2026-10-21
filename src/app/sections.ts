import { BookOpen, ChartNoAxesColumn, GraduationCap, House, Lamp, Settings2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DeckIcon } from './DeckIcon';
import { SonusVisioIcon } from './RoomIcons';

export type SectionId = 'home' | 'cursus' | 'codex' | 'thesaurus' | 'sonus' | 'mentis' | 'ratio' | 'ordo';

export interface Section {
  id: SectionId;
  path: string;
  name: string;
  role: string;
  icon: LucideIcon;
  /** iPhone placement: the core sections live in the tab bar, the rest in the header; a 'side' room
   *  is in the desktop sidebar only and opens from Home on a phone (the header has no room left). */
  placement: 'tab' | 'header' | 'side';
  /** A colour of its own when active; others use the accent. */
  tint?: string;
}

/** Lingua 5's rooms, in the sidebar's order (Alt 1…8). Ratio and Settings sit apart at the bottom. */
export const SECTIONS: Section[] = [
  { id: 'home', path: '/', name: 'Home', role: 'Your hearth', icon: House, placement: 'tab' },
  { id: 'cursus', path: '/cursus', name: 'Cursus', role: 'Course & grammar', icon: GraduationCap, placement: 'header' },
  { id: 'codex', path: '/codex', name: 'Codex', role: 'Read', icon: BookOpen, placement: 'tab' },
  { id: 'thesaurus', path: '/thesaurus', name: 'Thesaurus', role: 'Vocabulary', icon: DeckIcon, placement: 'tab' },
  { id: 'sonus', path: '/sonus', name: 'Sonus et Visio', role: 'Listen & watch', icon: SonusVisioIcon, placement: 'tab' },
  { id: 'mentis', path: '/mentis', name: 'Mentis', role: 'Guide, talk & write', icon: Lamp, placement: 'tab' },
  { id: 'ratio', path: '/ratio', name: 'Ratio', role: 'Stats', icon: ChartNoAxesColumn, placement: 'header' },
  { id: 'ordo', path: '/settings', name: 'Settings', role: 'Settings', icon: Settings2, placement: 'header' },
];

export const TAB_SECTIONS = SECTIONS.filter((s) => s.placement === 'tab');
export const HEADER_SECTIONS = SECTIONS.filter((s) => s.placement === 'header');

/** Alt 1 … 9 open the sections in order, and Alt 0 the tenth. */
export const sectionKey = (index: number) => (index < 9 ? index + 1 : 0);
