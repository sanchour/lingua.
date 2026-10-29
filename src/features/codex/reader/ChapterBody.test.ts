import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { tokenize } from '@/core/text/tokenizer';
import { READING_AIDS } from '@/core/reading/aids';
import { ChapterBody } from './ChapterBody';
import type { ChapterModel } from './model';

it('keeps source words intact while adding gloss attributes and changed endings', () => {
  const text = 'Hablamos aquí.';
  const model: ChapterModel = { chapter: { id: 'c', textId: 't', index: 0, wordCount: 2, blocks: [{ t: 'p', text }] }, blocks: [{ block: { t: 'p', text }, tokens: tokenize(text, 'es') }], norms: ['hablamos', 'aquí'], states: new Map(), senses: new Map(), glosses: new Map([['hablamos', { text: 'we speak', lemma: 'hablar', source: 'dict' }]]) };
  const html = renderToStaticMarkup(createElement(ChapterBody, { model, lang: 'es', aids: { ...READING_AIDS, endings: true, glosses: true } }));
  expect(html).toContain('data-gloss="we speak"');
  expect(html).toContain('Habla<u');
  expect(html).toContain('>mos</u>');
  const hidden = renderToStaticMarkup(createElement(ChapterBody, { model, lang: 'es', aids: { ...READING_AIDS, glosses: true, hideGlosses: true } }));
  expect(hidden).toContain('data-gloss="…"');
  expect(hidden).toContain('Reveal');
  expect(hidden).not.toContain('we speak');
});
