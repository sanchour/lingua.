import { describe, expect, it } from 'vitest';
import { groupKindleByBook, kindleClippingsToNotes, looksLikeKindleClippings, parseKindleClippings } from './kindle';
import { extractWikilinks, parseMarkdownDocument, parseYamlFrontMatter } from './markdownImport';
import { detectQuizletDelimiters, parseQuizletNotes, parseQuizletToTable } from './quizlet';

const SAMPLE_KINDLE = `Cien años de soledad (Gabriel García Márquez)
- Your Highlight on page 12 | location 184-186 | Added on Thursday, October 29, 2026 9:14:22 AM

Muchos años después, frente al pelotón de fusilamiento, el coronel Aureliano Buendía había de recordar aquella tarde remota.
==========
Cien años de soledad (Gabriel García Márquez)
- Your Note on page 12 | location 186 | Added on Thursday, October 29, 2026 9:15:00 AM

Famous opening sentence with future-in-the-past construction.
==========
El amor en los tiempos del cólera (Gabriel García Márquez)
- Your Highlight on page 4 | location 52 | Added on Thursday, October 29, 2026 10:00:00 AM

era inevitable
==========`;

describe('core/parsers/kindle (F1512, F1615)', () => {
  it('detects and parses Kindle My Clippings.txt into clippings, book groups, and flashcard notes', () => {
    expect(looksLikeKindleClippings(SAMPLE_KINDLE)).toBe(true);
    expect(looksLikeKindleClippings('Just a normal paragraph.')).toBe(false);

    const clippings = parseKindleClippings(SAMPLE_KINDLE);
    expect(clippings).toHaveLength(3);
    expect(clippings[0]).toMatchObject({
      bookTitle: 'Cien años de soledad',
      author: 'Gabriel García Márquez',
      kind: 'highlight',
    });
    expect(clippings[1]).toMatchObject({
      bookTitle: 'Cien años de soledad',
      kind: 'note',
      text: 'Famous opening sentence with future-in-the-past construction.',
    });

    const groups = groupKindleByBook(clippings);
    expect(groups).toHaveLength(2);
    expect(groups[0].clippings).toHaveLength(2);

    const notes = kindleClippingsToNotes(clippings);
    expect(notes).toHaveLength(2);
    // First highlight is long -> becomes example with paired note as meaning
    expect(notes[0].meaning).toBe('Famous opening sentence with future-in-the-past construction.');
    expect(notes[0].example?.text).toContain('Muchos años después');
    // Second highlight is short -> becomes direct term
    expect(notes[1].term).toBe('era inevitable');
  });
});

describe('core/parsers/quizlet (F1473)', () => {
  it('detects custom term/definition delimiters and parses Quizlet sets', () => {
    const dashed = `el perro - the dog\nel gato - the cat\nel pájaro - the bird`;
    expect(detectQuizletDelimiters(dashed).termDelimiter).toBe(' - ');

    const table = parseQuizletToTable(dashed);
    expect(table.rows).toEqual([
      ['el perro', 'the dog'],
      ['el gato', 'the cat'],
      ['el pájaro', 'the bird'],
    ]);

    const custom = parseQuizletNotes('bonjour::hello;;merci::thank you', {
      termDelimiter: '::',
      rowDelimiter: ';;',
    });
    expect(custom).toEqual([
      { term: 'bonjour', meaning: 'hello', tags: ['quizlet'] },
      { term: 'merci', meaning: 'thank you', tags: ['quizlet'] },
    ]);
  });
});

describe('core/parsers/markdownImport (F1475, F1483, F1511)', () => {
  it('parses YAML front matter, [[wikilinks]], chapters, flashcard notes, and grammar topics', () => {
    const mdSource = `---
title: "Spanish Subjunctive & Vocab"
lang: es
tags: [grammar, b1]
---

# Subjunctive Triggers (B1)

Use the present subjunctive after expressions of doubt, emotion, or desire such as [[querer]] and [[dudar|dudar que]].

- ojalá — hopefully / I wish
- es necesario que — it is necessary that

## [[madrugada]]

- **Meaning:** early morning / dawn
- **Example:** Llegamos de madrugada.
- **Tags:** #time #travel
`;

    const fm = parseYamlFrontMatter(mdSource);
    expect(fm.frontMatter.title).toBe('Spanish Subjunctive & Vocab');
    expect(fm.frontMatter.tags).toEqual(['grammar', 'b1']);

    const links = extractWikilinks(mdSource);
    expect(links).toEqual(['querer', 'dudar', 'madrugada']);

    const doc = parseMarkdownDocument(mdSource);
    expect(doc.title).toBe('Spanish Subjunctive & Vocab');
    expect(doc.chapters.length).toBeGreaterThanOrEqual(2);
    expect(doc.notes).toHaveLength(3);
    expect(doc.notes[0]).toMatchObject({ term: 'ojalá', meaning: 'hopefully / I wish' });
    expect(doc.notes[2]).toMatchObject({
      term: 'madrugada',
      meaning: 'early morning / dawn',
      example: { text: 'Llegamos de madrugada.' },
      tags: ['time', 'travel'],
    });
    expect(doc.grammarTopics.length).toBeGreaterThanOrEqual(1);
    expect(doc.grammarTopics[0]).toMatchObject({
      title: 'Subjunctive Triggers',
      level: 'B1',
    });
  });
});
