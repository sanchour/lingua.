import { describe, expect, it } from 'vitest';
import { fillTemplate, noteLinkPath, tagsOf, templateSlots } from './library';
describe('phrase templates and notebook links', () => {
  it('keeps replacements literal and requires every distinct slot', () => {
    expect(templateSlots('Hola {nombre}, {nombre}: {lugar}')).toEqual(['nombre', 'lugar']);
    expect(fillTemplate('Hola {nombre}', { nombre: '$& <script>' })).toBe('Hola $& <script>');
    expect(() => fillTemplate('{nombre}', {})).toThrow();
    expect(() => fillTemplate('{constructor}', {})).toThrow();
  });
  it('deduplicates tags and builds internal encoded links', () => {
    expect(tagsOf('trip, trip, food')).toEqual(['trip', 'food']);
    expect(noteLinkPath({ kind: 'word', target: 'a&b', label: '' })).toBe('/thesaurus?tab=dictionary&word=a%26b');
    expect(noteLinkPath({ kind: 'note', target: 'https://evil.test', label: '' })).toContain('/mentis/notebook?note=https%3A');
  });
});
