import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ReferenceResult } from './ReferenceHelp';
it('labels a generated interpretation and its uncertainty, escaping model text', () => {
  const html = renderToStaticMarkup(createElement(ReferenceResult, { lang: 'es', answer: { model: 'fake-model', meaning: 'A reference', explanation: '<script>bad</script>', uncertainty: 'Context is missing.', example: 'Un ejemplo.' } }));
  expect(html).toContain('fake-model'); expect(html).toContain('not independently verified'); expect(html).toContain('Context is missing.'); expect(html).toContain('&lt;script&gt;');
});
