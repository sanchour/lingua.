import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Markdown } from './Markdown';
it('renders the existing Markdown subset without interpreting learner HTML', () => {
  const html = renderToStaticMarkup(createElement(Markdown, { text: '# Notes\n\n**Strong** and *soft*\n\n- One\n\n<script>alert(1)</script>' }));
  expect(html).toContain('<h1'); expect(html).toContain('<strong>Strong</strong>'); expect(html).toContain('<ul');
  expect(html).not.toContain('<script>'); expect(html).toContain('&lt;script&gt;');
});
