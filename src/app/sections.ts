import { BookOpen, ChartNoAxesColumn, Clapperboard, Compass, GraduationCap, Headphones, House, Lamp, Library, Settings2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DeckIcon } from './DeckIcon';

export type SectionId =
  | 'home'
  | 'cursus'
  | 'explora'
  | 'bibliotheca'
  | 'codex'
  | 'thesaurus'
  | 'sonus'
  | 'visio'
  | 'mentis'
  | 'ratio'
  | 'ordo';

export interface Section {
  id: SectionId;
  path: string;
  name: string;
  role: string;
  icon: LucideIcon;
  /** Group in the sidebar: primary top-level pages, collapsible tools, or bottom utility links. */
  group: 'primary' | 'tool' | 'bottom';
  /** Touch placement: 'tab' in the main navigation bar, 'header' in the top right header. */
  placement: 'tab' | 'header' | 'side';
  /** A colour of its own when active; others use the accent. */
  tint?: string;
}

/**
 * Lingua 6's rooms and tools in sidebar order:
 * Home, Cursus, Explora, Bibliotheca, then Tools (Codex, Thesaurus, Sonus, Visio, Mentis),
 * with Ratio and Settings pinned at the bottom.
 */
export const SECTIONS: Section[] = [
  { id: 'home', path: '/', name: 'Home', role: 'Your hearth', icon: House, group: 'primary', placement: 'tab' },
  { id: 'cursus', path: '/cursus', name: 'Cursus', role: 'Course & grammar', icon: GraduationCap, group: 'primary', placement: 'tab' },
  { id: 'explora', path: '/explora', name: 'Explora', role: 'Discover content', icon: Compass, group: 'primary', placement: 'tab' },
  { id: 'bibliotheca', path: '/bibliotheca', name: 'Bibliotheca', role: 'Your library', icon: Library, group: 'primary', placement: 'tab' },
  { id: 'codex', path: '/codex', name: 'Codex', role: 'Read', icon: BookOpen, group: 'tool', placement: 'side' },
  { id: 'thesaurus', path: '/thesaurus', name: 'Thesaurus', role: 'Vocabulary', icon: DeckIcon, group: 'tool', placement: 'side' },
  { id: 'sonus', path: '/sonus', name: 'Sonus', role: 'Listen', icon: Headphones, group: 'tool', placement: 'side' },
  { id: 'visio', path: '/visio', name: 'Visio', role: 'Watch', icon: Clapperboard, group: 'tool', placement: 'side' },
  { id: 'mentis', path: '/mentis', name: 'Mentis', role: 'Guide, talk & write', icon: Lamp, group: 'tool', placement: 'side' },
  { id: 'ratio', path: '/ratio', name: 'Ratio', role: 'Stats', icon: ChartNoAxesColumn, group: 'bottom', placement: 'header' },
  { id: 'ordo', path: '/settings', name: 'Settings', role: 'Settings', icon: Settings2, group: 'bottom', placement: 'header' },
];

export const PRIMARY_SECTIONS = SECTIONS.filter((s) => s.group === 'primary');
export const TOOL_SECTIONS = SECTIONS.filter((s) => s.group === 'tool');
export const BOTTOM_SECTIONS = SECTIONS.filter((s) => s.group === 'bottom');

export const TAB_SECTIONS = SECTIONS.filter((s) => s.placement === 'tab');
export const HEADER_SECTIONS = SECTIONS.filter((s) => s.placement === 'header');

/** Alt 1 … 9 open the sections in order, and Alt 0 the tenth. */
export const sectionKey = (index: number) => (index < 9 ? index + 1 : 0);
