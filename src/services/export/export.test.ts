import { describe, expect, it } from 'vitest';
import type { Chat, DailyStat, Deck, Goal, JournalEntry, Note, Text, Word } from '@/data/types';
import {
  bilingualReadingJournalToMarkdown,
  conversationsToMarkdown,
  csvCell,
  deckToCsv,
  entriesToMarkdown,
  entriesToText,
  frontMatter,
  goalsToIcsEvents,
  grammarNotesToMarkdown,
  highlightsToMarkdown,
  notesToMarkdown,
  phrasebookToCsv,
  phrasebookToMarkdown,
  progressReportToHtml,
  scheduleToIcs,
  statsToCsv,
  wikilink,
  wordsToCsv,
} from './index';

describe('services/export', () => {
  it('escapes RFC 4180 CSV cells properly', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('with, comma')).toBe('"with, comma"');
    expect(csvCell('he said "hola"')).toBe('"he said ""hola"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it('builds YAML front matter and wikilinks', () => {
    const fm = frontMatter({ title: 'My Deck: Spanish', lang: 'es', count: 12, tags: ['vocab', 'a1'] });
    expect(fm).toContain('---');
    expect(fm).toContain('title: "My Deck: Spanish"');
    expect(fm).toContain('lang: es');
    expect(fm).toContain('count: 12');
    expect(fm).toContain('tags: [vocab, a1]');
    expect(wikilink('hablar', 'habló')).toBe('[[hablar|habló]]');
    expect(wikilink('casa')).toBe('[[casa]]');
  });

  it('exports vocabulary words to CSV (F1490)', () => {
    const words: Word[] = [
      {
        id: 'es:casa',
        lang: 'es',
        norm: 'casa',
        lemma: 'casa',
        state: 1,
        stateChangedAt: 1000,
        gloss: 'house, home',
        tags: ['home', 'basic'],
        favourite: 1,
        important: 0,
        note: 'feminine noun',
        createdAt: 1000,
        updatedAt: 1000,
      },
    ];
    const csv = wordsToCsv(words);
    expect(csv).toContain('term,lemma,lang,state,gloss,tags,favourite,important,note\r\n');
    expect(csv).toContain('casa,casa,es,known,"house, home",home; basic,1,0,feminine noun\r\n');
  });

  it('exports deck notes to CSV and Markdown with wikilinks (F1492, F1493, F1511)', () => {
    const deck: Pick<Deck, 'name' | 'lang' | 'description'> = {
      name: 'Core Spanish',
      lang: 'es',
      description: 'Essential daily words',
    };
    const notes: Note[] = [
      {
        id: 'n1',
        deckId: 'd1',
        lang: 'es',
        term: 'manzana',
        lemma: 'manzana',
        meaning: 'apple',
        pos: 'noun',
        gender: 'f',
        ipa: 'manˈsana',
        example: { text: 'Como una manzana.', translation: 'I eat an apple.' },
        tags: ['food', 'fruit'],
        mnemonic: 'Manzana sounds like man-sana (healthy man eats apples)',
        source: 'manual',
        createdAt: 1000,
        updatedAt: 1000,
      },
    ];

    const csv = deckToCsv(deck, notes);
    expect(csv).toContain('manzana,apple,manzana,noun,f,manˈsana,Como una manzana.,I eat an apple.,food fruit');

    const md = notesToMarkdown(deck, notes);
    expect(md).toContain('type: lingua-deck');
    expect(md).toContain('## [[manzana]]');
    expect(md).toContain('- **Meaning:** apple');
    expect(md).toContain('- **Example:** Como una manzana.');
    expect(md).toContain('- **Tags:** #food #fruit');
  });

  it('exports journal entries to Markdown and plain text (F0692, F1492)', () => {
    const entries: JournalEntry[] = [
      {
        id: 'j1',
        lang: 'es',
        date: '2026-10-29',
        title: 'Un día en Madrid',
        prompt: 'Describe your morning.',
        text: 'Fui al parque y tomé un café.',
        words: 7,
        review: {
          text: 'Fui al parque y tomé un café.',
          corrected: 'Fui al parque y tomé un café con leche.',
          natural: 'Fui al parque y me tomé un café.',
          corrections: [
            {
              original: 'tomé',
              suggestion: 'me tomé',
              category: 'style',
              explanation: 'Pronominal is more idiomatic.',
              severity: 'minor',
            },
          ],
          scores: { grammar: 95, vocabulary: 90, coherence: 92, overall: 92 },
          cefr: 'B1',
          strengths: ['Good past tense'],
          tip: 'Keep using connectors',
          model: 'test',
          reviewedAt: 2000,
        },
        createdAt: 1000,
        updatedAt: 2000,
      },
    ];

    const md = entriesToMarkdown(entries, 'es');
    expect(md).toContain('## Un día en Madrid (2026-10-29)');
    expect(md).toContain('Fui al parque y tomé un café.');
    expect(md).toContain('### Review (B1 · Score 92/100)');
    expect(md).toContain('~~tomé~~ → **me tomé**');

    const txt = entriesToText(entries);
    expect(txt).toContain('2026-10-29 — Un día en Madrid (7 words)');
    expect(txt).toContain('Corrected (B1):');
  });

  it('exports grammar notes to Markdown (F1138)', () => {
    const md = grammarNotesToMarkdown(
      [
        {
          id: 'es:por-para',
          lang: 'es',
          title: 'Por vs Para',
          level: 'B1',
          summary: 'Cause vs purpose and destination.',
          userNote: 'Remember PROD for Para.',
          examples: [{ target: 'Trabajo por la mañana.', translation: 'I work in the morning.' }],
          relatedTopics: ['Prepositions'],
        },
      ],
      'es',
    );
    expect(md).toContain('## [[Por vs Para]] (B1)');
    expect(md).toContain('Remember PROD for Para.');
    expect(md).toContain('Related: [[Prepositions]]');
  });

  it('exports learning statistics to CSV (F1494)', () => {
    const stats: DailyStat[] = [
      {
        id: 'es:2026-10-29',
        lang: 'es',
        date: '2026-10-29',
        readMs: 1_800_000,
        wordsRead: 2500,
        listenMs: 900_000,
        watchMs: 0,
        writeMs: 600_000,
        wordsWritten: 180,
        songMs: 0,
        reviews: 45,
        againCount: 3,
        newCards: 10,
        knownTotal: 1200,
        learningTotal: 150,
        newKnown: 12,
        newLearning: 8,
        goalMet: 1,
        updatedAt: 1000,
      },
    ];
    const csv = statsToCsv(stats);
    expect(csv).toContain('2026-10-29,es,30,2500,15,0,10,180,0,45,3,10,1200,150,12,8,1');
  });

  it('exports reading highlights and bilingual reading journal to Markdown (F0408, F1495)', () => {
    const text: Pick<Text, 'id' | 'title' | 'author' | 'lang' | 'wordCount' | 'finishedAt' | 'readingMarks'> = {
      id: 't1',
      title: 'Cien años de soledad',
      author: 'Gabriel García Márquez',
      lang: 'es',
      wordCount: 14000,
      finishedAt: Date.UTC(2026, 9, 29),
      readingMarks: [
        {
          id: 'm1',
          chapterIndex: 0,
          blockIndex: 1,
          start: 0,
          end: 20,
          quote: 'Muchos años después, frente al pelotón de fusilamiento',
          colour: 'amber',
          note: 'Iconic opening line',
        },
      ],
    };

    const hl = highlightsToMarkdown([text]);
    expect(hl).toContain('## [[Cien años de soledad]] — *Gabriel García Márquez*');
    expect(hl).toContain('> Muchos años después');
    expect(hl).toContain('Iconic opening line');

    const journal = bilingualReadingJournalToMarkdown(
      [
        {
          text,
          summary: 'A sweeping multi-generational story in Macondo.',
          keyWords: [{ term: 'pelotón', gloss: 'firing squad / platoon' }],
        },
      ],
      'es',
    );
    expect(journal).toContain('### Reflections & Summary');
    expect(journal).toContain('- [[pelotón]] — firing squad / platoon');
  });

  it('exports conversation transcripts and personal phrasebook (F1496, F1497)', () => {
    const chats: Chat[] = [
      {
        id: 'c1',
        lang: 'fr',
        scene: 'cafe',
        title: 'Au café',
        messages: [
          {
            role: 'me',
            text: 'Je voudrai un café.',
            at: 1000,
            corrections: [{ original: 'voudrai', suggestion: 'voudrais', explanation: 'Use conditional for politeness.' }],
          },
          {
            role: 'ai',
            text: 'Tout de suite !',
            en: 'Right away!',
            at: 2000,
            words: [{ word: 'tout de suite', meaning: 'right away' }],
          },
        ],
        createdAt: 1000,
        updatedAt: 2000,
      },
    ];
    const chatMd = conversationsToMarkdown(chats);
    expect(chatMd).toContain('## Au café');
    expect(chatMd).toContain('~~voudrai~~ → **voudrais**');
    expect(chatMd).toContain('[[tout de suite]] (right away)');

    const phrases = [
      {
        phrase: 'llover a cántaros',
        meaning: 'to rain cats and dogs',
        literal: 'to rain by pitchers',
        category: 'idiom',
        usageNote: 'Everyday spoken Spanish',
        example: 'Está lloviendo a cántaros.',
        tags: ['weather', 'idiom'],
      },
    ];
    expect(phrasebookToMarkdown(phrases, 'es')).toContain('### llover a cántaros');
    expect(phrasebookToCsv(phrases)).toContain('llover a cántaros,to rain cats and dogs,to rain by pitchers');
  });

  it('exports printable progress report HTML and RFC 5545 .ics calendar (F1498, F1509)', () => {
    const html = progressReportToHtml({
      lang: 'es',
      langName: 'Spanish',
      level: 'B2',
      generatedAt: '2026-10-29',
      knownWords: 3420,
      learningWords: 210,
      totalReviews: 8900,
      totalHours: 142.5,
      booksRead: 6,
      streakDays: 24,
    });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Lingua Progress Report · Spanish (B2)');
    expect(html).toContain('3,420');

    const goals: Goal[] = [
      { id: 'g1', lang: 'es', kind: 'level', target: 'B2', by: '2026-12-31', createdAt: 1000, updatedAt: 1000 },
    ];
    const events = goalsToIcsEvents('es', { reviews: 30, readMinutes: 20, listenMinutes: 15 }, goals, '2026-10-29');
    const ics = scheduleToIcs(events, 'Spanish Study Plan');
    expect(ics).toContain('BEGIN:VCALENDAR\r\n');
    expect(ics).toContain('BEGIN:VEVENT\r\n');
    expect(ics).toContain('RRULE:FREQ=DAILY;COUNT=30\r\n');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261231\r\n');
    expect(ics).toContain('END:VCALENDAR\r\n');
  });
});

it('includes phrasebook folders, alternatives and sources in both open-format exports', async () => {
  const { savedPhrasesForExport } = await import('./index');
  const { newPhrase } = await import('@/data/notebook');
  const items = savedPhrasesForExport([{ ...newPhrase('es', 'Hola', 'Hello', '/codex/read/one'), folder: 'Trip', formal: 'Buenos días', topic: 'Greetings' }]);
  expect(phrasebookToMarkdown(items, 'es')).toContain('Folder: Trip');
  expect(phrasebookToCsv(items)).toContain('Formal: Buenos días');
  expect(phrasebookToMarkdown(items, 'es')).toContain('/codex/read/one');
});
