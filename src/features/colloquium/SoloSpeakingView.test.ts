import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SoloSpeakingView } from './SoloSpeakingView';

describe('SoloSpeakingView', () => {
  it('renders solo speaking challenges, category tabs, and personalized challenges (F0607)', () => {
    const html = renderToStaticMarkup(
      createElement(SoloSpeakingView, {
        lang: 'es',
        level: 'B1',
        dueWords: ['desafío', 'lograr'],
        grammarTopic: 'Subjunctive mood',
      }),
    );

    expect(html).toContain('Solo speaking practice');
    expect(html).toContain('All challenges');
    expect(html).toContain('30s Prompts');
    expect(html).toContain('1-Min Monologues');
    expect(html).toContain('Storytelling');
    expect(html).toContain('Picture Tasks');
    expect(html).toContain('Explain a Concept');
    expect(html).toContain('Impromptu Debate');
    expect(html).toContain('Listen &amp; Repeat');
    expect(html).toContain('Personalized');
    expect(html).toContain('Start practice');
  });
});
