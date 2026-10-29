import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { LanguageProfile } from '@/data/types';
import { ExportDataPanel } from './ExportDataPanel';

describe('ExportDataPanel', () => {
  it('renders export buttons for vocabulary CSV, journal, grammar notes, highlights, conversations, phrasebook, stats, report, and .ics calendar', () => {
    const profile: LanguageProfile = {
      id: 'es',
      native: 'en',
      level: 'B1',
      isActive: 1,
      dailyGoal: { reviews: 25, readMinutes: 15, listenMinutes: 15 },
      seededKnownTopN: 0,
      createdAt: 1000,
      updatedAt: 1000,
    };

    const html = renderToStaticMarkup(createElement(ExportDataPanel, { language: profile }));
    expect(html).toContain('Export &amp; integrations (Spanish)');
    expect(html).toContain('Vocabulary (.csv)');
    expect(html).toContain('Journal (.md)');
    expect(html).toContain('Journal (.txt)');
    expect(html).toContain('Grammar notes (.md)');
    expect(html).toContain('Reading highlights (.md)');
    expect(html).toContain('Reading journal (.md)');
    expect(html).toContain('Conversations (.md)');
    expect(html).toContain('Phrasebook (.md)');
    expect(html).toContain('Phrasebook (.csv)');
    expect(html).toContain('Statistics (.csv)');
    expect(html).toContain('Progress report (.html)');
    expect(html).toContain('Study calendar (.ics)');
  });
});
