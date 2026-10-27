/** The first start's pages, in order (5.1-2b), and their names for the Device lab's replay (7-0d). */
export type Page = 'name' | 'welcome' | 'about' | 'language' | 'level' | 'speak' | 'why' | 'goal' | 'light' | 'plans';

export const FIRST: Page[] = ['name', 'welcome', 'about', 'language', 'level', 'speak', 'why', 'goal', 'light', 'plans'];

export const PAGE_NAMES: Record<Page, string> = {
  name: 'Your name',
  welcome: 'Welcome',
  about: 'What Lingua does',
  language: 'Language',
  level: 'Level',
  speak: 'You speak',
  why: 'Why',
  goal: 'Goal',
  light: 'Light',
  plans: 'Plans',
};
