import { BookOpen, ChartNoAxesColumn, Clapperboard, Headphones, House, Library, Music2, Settings2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type SectionId = 'home' | 'codex' | 'thesaurus' | 'sonus' | 'cantus' | 'visio' | 'ratio' | 'ordo';

export interface Section {
  id: SectionId;
  path: string;
  name: string;
  role: string;
  icon: LucideIcon;
  /** iPhone placement: the core sections live in the tab bar, the rest in the header. */
  placement: 'tab' | 'header';
  /** A colour of its own when active (Cantus); others use the accent. */
  tint?: string;
}

export const SECTIONS: Section[] = [
  { id: 'home', path: '/', name: 'Home', role: 'Your hearth', icon: House, placement: 'tab' },
  { id: 'codex', path: '/codex', name: 'Codex', role: 'Read', icon: BookOpen, placement: 'tab' },
  { id: 'thesaurus', path: '/thesaurus', name: 'Thesaurus', role: 'Vocabulary', icon: Library, placement: 'tab' },
  { id: 'sonus', path: '/sonus', name: 'Sonus', role: 'Listen', icon: Headphones, placement: 'tab' },
  { id: 'cantus', path: '/cantus', name: 'Cantus', role: 'Sing', icon: Music2, placement: 'tab', tint: 'cantus' },
  { id: 'visio', path: '/visio', name: 'Visio', role: 'Watch', icon: Clapperboard, placement: 'tab' },
  { id: 'ratio', path: '/ratio', name: 'Ratio', role: 'Stats', icon: ChartNoAxesColumn, placement: 'header' },
  { id: 'ordo', path: '/ordo', name: 'Ordo', role: 'Settings', icon: Settings2, placement: 'header' },
];

export const TAB_SECTIONS = SECTIONS.filter((s) => s.placement === 'tab');
export const HEADER_SECTIONS = SECTIONS.filter((s) => s.placement === 'header');
