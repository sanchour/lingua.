// Ordo's map of settings: every section has one home, and the search finds settings by their
// own words and by the words people use for them.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GROUPS, SETTINGS_INDEX, groupOf, searchSettings } from './groups';

const SECTION_FILES: Record<string, string[]> = {
  appearance: ['sections/AppearanceSection.tsx'],
  reading: ['sections/ReadingSection.tsx'],
  study: ['sections/StudySection.tsx'],
  cards: ['sections/CardsSection.tsx', '../thesaurus/common/CardLookPanel.tsx'],
  listening: ['sections/ListeningSection.tsx'],
  music: ['sections/MusicSection.tsx'],
  language: ['sections/LanguageSection.tsx', 'sections/VoicePanel.tsx'],
  ai: ['sections/AiSection.tsx'],
  plus: ['sections/PlusSection.tsx'],
  sync: ['sections/SyncSection.tsx'],
  storage: ['sections/StorageSection.tsx'],
  backup: ['sections/BackupSection.tsx'],
  reset: ['sections/ResetSection.tsx'],
  keyboard: ['sections/KeyboardSection.tsx'],
  performance: ['sections/PerformanceSection.tsx'],
  about: ['sections/AboutSection.tsx'],
};

const source = (section: string) => SECTION_FILES[section].map((f) => readFileSync(new URL(f, import.meta.url), 'utf8')).join('\n');

describe('Ordo groups', () => {
  it('puts every section in exactly one group', () => {
    const all = GROUPS.flatMap((g) => g.sections);
    expect(new Set(all).size).toBe(all.length);
    expect(all.sort()).toEqual(Object.keys(SECTION_FILES).sort());
  });

  it('indexes settings by words that are really on their page', () => {
    const missing = SETTINGS_INDEX.filter((e) => !source(e.section).includes(e.find ?? e.label)).map((e) => `${e.section}: ${e.label}`);
    expect(missing).toEqual([]);
  });

  it('finds settings by their names and by everyday words', () => {
    const first = (q: string) => searchSettings(q)[0]?.label;
    expect(first('dark')).toBe('Theme');
    expect(first('font size')).toBe('Text size');
    expect(first('backup')).toBe('Create backup');
    expect(first('groq key')).toBe('API key');
    expect(first('retention')).toBe('Remember, for new decks');
    expect(first('erase')).toBe('Erase everything');
    expect(searchSettings('zzzz')).toEqual([]);
  });

  it('leaves out sections this device does not show', () => {
    expect(searchSettings('shortcuts', new Set(['keyboard']))).toEqual([]);
    expect(groupOf('reset')?.id).toBe('data');
  });
});
