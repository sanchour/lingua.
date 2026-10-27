import { describe, expect, it } from 'vitest';
import { fromDoc, mergeCorrected, parseInline, toDoc, toPlain } from './markdown';
import { emptyPage, hasSalutation, salutation } from './salutations';

const round = (md: string) => fromDoc(toDoc(md));

describe('the entry Markdown', () => {
  it('keeps headings, lists, quotes and marks through the editor and back', () => {
    const md = [
      '# Lundi',
      '## Au marché',
      'J’ai acheté des **pommes** et du *pain*, et un <u>gâteau</u>.',
      '- un\n- deux\n  - deux et demi\n- trois',
      '1. premier\n2. second',
      '> Une citation\n> sur deux lignes',
      'Ligne un\nligne deux',
    ].join('\n\n');
    expect(round(md)).toBe(md);
  });

  it('reads plain text from before as paragraphs, line breaks kept', () => {
    const text = 'Aujourd’hui il pleut.\nJe reste chez moi.\n\nDemain, la mer.';
    expect(round(text)).toBe(text);
    expect(toDoc(text).content).toHaveLength(2);
  });

  it('nests marks and closes them in order', () => {
    expect(round('**gras et *italique* ensemble**')).toBe('**gras et *italique* ensemble**');
    expect(parseInline('**a *b***')).toEqual([
      { type: 'text', text: 'a ', marks: [{ type: 'bold' }] },
      { type: 'text', text: 'b', marks: [{ type: 'bold' }, { type: 'italic' }] },
    ]);
  });

  it('keeps a lone star and text that looks like Markdown as text', () => {
    expect(parseInline('5 * 3 = 15')).toEqual([{ type: 'text', text: '5 * 3 = 15' }]);
    const doc = { type: 'doc' as const, content: [{ type: 'paragraph' as const, content: [{ type: 'text' as const, text: '# pas un titre, 2 * 3' }] }] };
    const md = fromDoc(doc);
    expect(md).toBe('\\# pas un titre, 2 \\* 3');
    expect(toPlain(md)).toBe('# pas un titre, 2 * 3');
    expect(toPlain(fromDoc({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '1. pas une liste' }] }] }))).toBe('1. pas une liste');
  });

  it('keeps spaces outside the marks', () => {
    const doc = { type: 'doc' as const, content: [{ type: 'paragraph' as const, content: [{ type: 'text' as const, text: 'un ' }, { type: 'text' as const, text: 'mot ', marks: [{ type: 'bold' as const }] }, { type: 'text' as const, text: 'fort' }] }] };
    expect(fromDoc(doc)).toBe('un **mot** fort');
  });

  it('gives the AI plain text, one block per paragraph', () => {
    expect(toPlain('# Titre\n\nUn **mot**.\n\n- a\n- b')).toBe('Titre\n\nUn mot.\n\na\n\nb');
  });
});

describe('corrections back into the entry', () => {
  it('replaces paragraph by paragraph, keeping each marker', () => {
    const md = '# Mon jour\n\nJe suis allé au **marché**.\n\n- un pomme\n- deux poire';
    const corrected = 'Mon jour\n\nJe suis allé au marché.\n\nune pomme\n\ndeux poires';
    expect(mergeCorrected(md, corrected)).toBe('# Mon jour\n\nJe suis allé au **marché**.\n\n- une pomme\n- deux poires');
  });

  it('falls back to the corrected paragraphs when they don’t line up', () => {
    expect(mergeCorrected('- a\n- b', 'A et B.')).toBe('A et B.');
  });
});

describe('salutations', () => {
  const day = new Date('2026-10-27T12:00:00');
  it('says "Dear diary" where the language does', () => {
    expect(salutation('fr', day)).toBe('Cher journal');
    expect(salutation('ru', day)).toBe('Дорогой дневник');
    expect(salutation('zh', day)).toBe('亲爱的日记');
    expect(hasSalutation('ar')).toBe(false);
  });

  it('writes the date in the language elsewhere', () => {
    expect(salutation('ar', day)).toBe(day.toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'long' }));
  });

  it('starts an empty page with "Today…"', () => {
    expect(emptyPage('es')).toBe('Hoy…');
    expect(emptyPage('zh')).toBe('今天……');
    expect(emptyPage('xx')).toBe('Today…');
  });
});
