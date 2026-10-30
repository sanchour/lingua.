import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ConversationReviewView } from './ConversationReviewView';

describe('ConversationReviewView', () => {
  it('renders paste input and review dashboard with sample conversation', () => {
    const sample = `
You: Hola, yo tener una pregunta.
AI: ¡Hola! Dime.
    `.trim();

    const html = renderToStaticMarkup(
      createElement(ConversationReviewView, {
        lang: 'es',
        level: 'B1',
        initialTranscript: sample,
      }),
    );

    expect(html).toContain('“How did it go?”');
    expect(html).toContain('Fluency score');
    expect(html).toContain('Sentence Review (F0581)');
    expect(html).toContain('Fluency Metrics (F0562)');
    expect(html).toContain('Conversation Replay (F0578)');
    expect(html).toContain('Save to Diarium (F0583)');
    expect(html).toContain('Essential Grammar Errors (F0557)');
  });
});
