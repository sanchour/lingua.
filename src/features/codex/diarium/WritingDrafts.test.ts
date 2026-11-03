import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { DraftComparison } from './WritingDrafts';

it('shows both language-aware drafts and marks changes without interpreting learner markup', () => {
  const html = renderToStaticMarkup(createElement(DraftComparison, { lang: 'ar', before: 'أنا أقرأ.', after: 'أنا أكتب. <script>x</script>' }));
  expect(html).toContain('Earlier draft'); expect(html).toContain('Compared draft');
  expect(html).toContain('lang="ar"'); expect(html).toContain('<del>'); expect(html).toContain('<ins>');
  expect(html).not.toContain('<script>');
});
