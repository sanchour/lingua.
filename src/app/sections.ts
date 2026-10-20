import { BookA, BookOpen, ChartNoAxesColumn, Clapperboard, Earth, Headphones, House, Library, MessagesSquare, Settings2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type SectionId = 'home' | 'codex' | 'thesaurus' | 'sonus' | 'visio' | 'grammatica' | 'colloquium' | 'mundus' | 'ratio' | 'ordo';

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

export const SECTIONS: Section[] = [
  { id: 'home', path: '/', name: 'Home', role: 'Your hearth', icon: House, placement: 'tab' },
  { id: 'codex', path: '/codex', name: 'Codex', role: 'Read', icon: BookOpen, placement: 'tab' },
  { id: 'thesaurus', path: '/thesaurus', name: 'Thesaurus', role: 'Vocabulary', icon: Library, placement: 'tab' },
  { id: 'sonus', path: '/sonus', name: 'Sonus', role: 'Listen & sing', icon: Headphones, placement: 'tab' },
  { id: 'visio', path: '/visio', name: 'Visio', role: 'Watch', icon: Clapperboard, placement: 'tab' },
  { id: 'grammatica', path: '/grammatica', name: 'Grammatica', role: 'Grammar', icon: BookA, placement: 'header' },
  { id: 'colloquium', path: '/colloquium', name: 'Colloquium', role: 'Conversation', icon: MessagesSquare, placement: 'side' },
  { id: 'mundus', path: '/mundus', name: 'Mundus', role: 'The world', icon: Earth, placement: 'header' },
  { id: 'ratio', path: '/ratio', name: 'Ratio', role: 'Stats', icon: ChartNoAxesColumn, placement: 'header' },
  { id: 'ordo', path: '/ordo', name: 'Ordo', role: 'Settings', icon: Settings2, placement: 'header' },
];

export const TAB_SECTIONS = SECTIONS.filter((s) => s.placement === 'tab');
export const HEADER_SECTIONS = SECTIONS.filter((s) => s.placement === 'header');

/** Alt 1 … 9 open the sections in order, and Alt 0 the tenth. */
export const sectionKey = (index: number) => (index < 9 ? index + 1 : 0);
