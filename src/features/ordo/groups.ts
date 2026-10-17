// How Ordo is arranged: a few groups, each a page of one or more sections, and an index of every
// setting so the search can take you straight to it.
import type { LucideIcon } from 'lucide-react';
import { BookOpenText, Database, GraduationCap, Headphones, Info, Languages, Music2, Palette, Sparkles } from 'lucide-react';
import { searchKey } from '@/design/primitives';

export type SectionId = 'appearance' | 'reading' | 'study' | 'cards' | 'listening' | 'music' | 'language' | 'ai' | 'storage' | 'backup' | 'reset' | 'keyboard' | 'performance' | 'about';

export interface SettingsGroup {
  id: string;
  title: string;
  icon: LucideIcon;
  /** Tile colour on the overview, mixed into the theme's surface. */
  color: string;
  sections: SectionId[];
}

/** The overview shows "Your learning" first, then the app itself. */
export const GROUPS: SettingsGroup[] = [
  { id: 'reading', title: 'Reading', icon: BookOpenText, color: '#c98a6b', sections: ['reading'] },
  { id: 'study', title: 'Study and cards', icon: GraduationCap, color: '#7f9f7a', sections: ['study', 'cards'] },
  { id: 'listening', title: 'Listening', icon: Headphones, color: '#6f9cc0', sections: ['listening'] },
  { id: 'music', title: 'Music', icon: Music2, color: '#b4587e', sections: ['music'] },
  { id: 'languages', title: 'Languages', icon: Languages, color: '#9d8fcb', sections: ['language'] },
  { id: 'look', title: 'Look and feel', icon: Palette, color: '#c9a650', sections: ['appearance'] },
  { id: 'ai', title: 'AI and translation', icon: Sparkles, color: '#cf8299', sections: ['ai'] },
  { id: 'data', title: 'Your data', icon: Database, color: '#5f9e96', sections: ['storage', 'backup', 'reset'] },
  { id: 'about', title: 'About and more', icon: Info, color: '#948d82', sections: ['keyboard', 'performance', 'about'] },
];

/** "2.0.0" reads as "2.0"; a patch release keeps its third number. */
export const APP_VERSION = __APP_VERSION__.replace(/^(\d+\.\d+)\.0$/, '$1');

export const LEARNING_GROUPS = ['reading', 'study', 'listening', 'music', 'languages'];

export function groupOf(section: string): SettingsGroup | undefined {
  return GROUPS.find((g) => (g.sections as string[]).includes(section));
}

export function getGroup(id: string | undefined): SettingsGroup | undefined {
  return GROUPS.find((g) => g.id === id);
}

export interface SettingEntry {
  /** What the search shows; also the words on screen it finds and lights up, unless `find` says otherwise. */
  label: string;
  find?: string;
  section: SectionId;
  /** Other words people search with. */
  also?: string;
}

/** Every setting, in page order. */
export const SETTINGS_INDEX: SettingEntry[] = [
  { label: 'Theme', section: 'appearance', also: 'paper nocturne dark mode light night colour color system appearance' },
  { label: 'Motion', section: 'appearance', also: 'animation reduce motion transitions movement' },

  { label: 'Reading font', section: 'reading', also: 'typeface literata lora newsreader merriweather atkinson comfortaa serif sans' },
  { label: 'Text size', section: 'reading', also: 'font size bigger smaller zoom' },
  { label: 'Line spacing', section: 'reading', also: 'line height leading' },
  { label: 'Day paper', section: 'reading', also: 'page colour background cream sepia ivory parchment' },
  { label: 'Night paper', section: 'reading', also: 'page colour dark background charcoal' },
  { label: 'Page style', section: 'reading', also: 'page flip smooth scroll paged scrolling' },
  { label: 'Highlight unseen words', section: 'reading', also: 'underline new words' },
  { label: 'Mark unseen words as known when I turn the page', section: 'reading', also: 'known lingq auto' },
  { label: 'Translations that read the sentence', section: 'reading', also: 'context ai gloss meaning' },

  { label: 'New cards a day, for new decks', section: 'study', also: 'new per day limit pace' },
  { label: 'Remember, for new decks', section: 'study', also: 'retention fsrs recall percent' },
  { label: 'Ludus counts as review', section: 'study', also: 'games practice schedule' },
  { label: 'Settled cards become Known', section: 'study', also: 'mature known highlight' },
  { label: 'Card font', section: 'cards', also: 'flashcard typeface' },
  { label: 'Card style', section: 'cards', also: 'flashcard look index bookplate linen plain' },
  { label: 'Card colour', section: 'cards', also: 'flashcard tint color' },
  { label: 'Card text size', section: 'cards', also: 'flashcard size' },

  { label: 'Speed for new episodes', section: 'listening', also: 'playback rate podcast audio sonus' },
  { label: 'Skip back', section: 'listening', also: 'rewind seconds' },
  { label: 'Skip forward', section: 'listening', also: 'seconds jump' },
  { label: 'Each sentence plays', section: 'listening', also: 'repeat shadowing' },
  { label: 'Pause between repeats', section: 'listening', also: 'gap shadowing' },
  { label: 'Where transcripts are made', section: 'listening', also: 'transcript subtitles whisper groq device private visio' },
  { label: 'Whisper model', section: 'listening', also: 'transcript turbo large' },
  { label: 'Model on this device', section: 'listening', also: 'whisper tiny base small offline' },
  { label: 'Download relay address', section: 'listening', also: 'proxy podcast download cors' },

  { label: 'English under each line', section: 'music', also: 'cantus songs lyrics translation blur hide' },
  { label: 'Spotify liked songs', section: 'music', also: 'spotify connect client id music cantus library' },
  { label: 'Where lyrics come from', section: 'music', also: 'genius lyrics words songs lyrics.ovh lrclib timed paste' },

  { label: 'Level', find: 'Level in', section: 'language', also: 'a1 a2 b1 b2 c1 beginner' },
  { label: 'Daily goal', section: 'language', also: 'reviews minutes reading listening goal' },
  { label: 'I already speak', section: 'language', also: 'native language' },
  { label: 'Learn another language', section: 'language', also: 'add new language switch start' },
  { label: 'What you enjoy most', section: 'language', also: 'interests recommendations home suggestions' },

  { label: 'AI provider', section: 'ai', also: 'groq gemini llm' },
  { label: 'API key', section: 'ai', also: 'key groq gemini connect free' },
  { label: 'Model', section: 'ai', also: 'llama llm' },
  { label: 'Online fallback: MyMemory', section: 'ai', also: 'translation translator online' },
  { label: 'Online fallback: Lingva', section: 'ai', also: 'translation translator online google' },

  { label: 'Storage used', section: 'storage', also: 'space disk quota protect persist' },
  { label: 'Create backup', section: 'backup', also: 'export save move devices sync transfer phone computer' },
  { label: 'Restore from file', section: 'backup', also: 'import backup move devices' },
  { label: 'Include audio, video and images', section: 'backup', also: 'media backup' },
  { label: 'Include API keys', section: 'backup', also: 'backup keys' },
  { label: 'Books for Goodreads', section: 'backup', also: 'export csv goodreads' },
  { label: 'Reset a language', find: 'Reset ', section: 'reset', also: 'start over progress' },
  { label: 'Erase everything', section: 'reset', also: 'delete wipe clear all data' },

  { label: 'Keyboard shortcuts', section: 'keyboard', also: 'keys hotkeys' },
  { label: 'FPS monitor', section: 'performance', also: 'frame rate speed performance' },
  { label: 'About Lingua', section: 'about', also: 'version credits licences licenses' },
];

const SECTION_TITLES: Record<SectionId, string> = {
  appearance: 'Preferences',
  reading: 'Reading',
  study: 'Study',
  cards: 'Flashcards',
  listening: 'Listening',
  music: 'Music',
  language: 'Languages',
  ai: 'AI & translation',
  storage: 'Storage',
  backup: 'Backup & move devices',
  reset: 'Reset',
  keyboard: 'Keyboard shortcuts',
  performance: 'Performance',
  about: 'About Lingua',
};

export const sectionTitle = (id: SectionId) => SECTION_TITLES[id];

/** Settings matching every word of the query, best first: label starts, then label words, then other words. */
export function searchSettings(query: string, hidden: ReadonlySet<SectionId> = new Set()): SettingEntry[] {
  const words = searchKey(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const scored: Array<[SettingEntry, number]> = [];
  for (const entry of SETTINGS_INDEX) {
    if (hidden.has(entry.section)) continue;
    const label = searchKey(entry.label);
    const rest = searchKey(`${SECTION_TITLES[entry.section]} ${entry.also ?? ''}`);
    let score = 0;
    for (const w of words) {
      if (label.startsWith(w)) score += 3;
      else if (new RegExp(`(?:^|[^\\p{L}])${escape(w)}`, 'u').test(label)) score += 2;
      else if (rest.includes(w)) score += 1;
      else {
        score = 0;
        break;
      }
    }
    if (score) scored.push([entry, score]);
  }
  return scored.sort((a, b) => b[1] - a[1]).map(([e]) => e);
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
