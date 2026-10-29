import { describe, expect, it } from 'vitest';
import type { Note } from '@/data/types';
import { cardFaces, fieldLines, TEMPLATES, templateOf } from './templates';

const note = (patch: Partial<Note> = {}): Note => ({ id: 'n', deckId: 'd', lang: 'es', term: 'casa', meaning: 'house', tags: [], source: 'manual', createdAt: 1, updatedAt: 1, ...patch });

describe('card kinds', () => {
  it('an ordinary note is the plain card', () => {
    expect(templateOf(note())).toBe('word-meaning');
    expect(cardFaces(note(), 'recognition', false)).toBeNull();
    expect(cardFaces(note({ template: 'word-meaning' }), 'production', true)).toBeNull();
  });

  it('knows every template, each once, with the fields it asks for', () => {
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
    expect(TEMPLATES).toHaveLength(12);
    expect(TEMPLATES.find((t) => t.id === 'synonym')?.fields).toEqual(['synonyms']);
  });

  it('a definition card asks the word, or the definition', () => {
    const n = note({ template: 'definition', extra: { definition: 'Edificio para habitar.' } });
    expect(cardFaces(n, 'recognition', false)).toEqual({ front: { term: true }, back: { text: 'Edificio para habitar.' } });
    expect(cardFaces(n, 'production', false)?.front.text).toBe('Edificio para habitar.');
    // With no definition of its own it uses the meaning.
    expect(cardFaces(note({ template: 'definition' }), 'recognition', false)?.back.text).toBe('house');
  });

  it('a picture card needs a picture, and goes either way', () => {
    const n = note({ template: 'picture' });
    expect(cardFaces(n, 'recognition', false)).toBeNull();
    expect(cardFaces(n, 'recognition', true)).toMatchObject({ front: { term: true }, back: { image: 'plain' } });
    expect(cardFaces(n, 'production', true)).toMatchObject({ front: { image: 'plain' }, back: { term: true } });
  });

  it('a sound card is heard first, or said first', () => {
    const n = note({ template: 'sound' });
    expect(cardFaces(n, 'production', false)?.front).toMatchObject({ listen: true });
    expect(cardFaces(n, 'production', false)?.front.term).toBeUndefined();
    expect(cardFaces(n, 'recognition', false)?.back.listen).toBe(true);
  });

  it('synonym, opposite, collocation, grammar and related cards need what they list', () => {
    for (const [template, field] of [['synonym', 'synonyms'], ['antonym', 'antonyms'], ['collocation', 'collocations'], ['grammar-fact', 'grammar'], ['related-words', 'related']] as const) {
      expect(cardFaces(note({ template }), 'recognition', false), template).toBeNull();
      expect(cardFaces(note({ template, extra: { [field]: ' uno \n\n dos ' } }), 'recognition', false)?.back.lines, template).toEqual(['uno', 'dos']);
    }
  });

  it('several meanings put the first meaning first', () => {
    const faces = cardFaces(note({ template: 'several-meanings', extra: { meanings: 'home\nhousehold' } }), 'recognition', false);
    expect(faces?.back.lines).toEqual(['house', 'home', 'household']);
  });

  it('a paragraph card gaps the word wherever it stands, and is plain when the word is not in it', () => {
    const n = note({ template: 'paragraph', extra: { paragraph: 'Vivo en una Casa pequeña. Es mía.' } });
    expect(cardFaces(n, 'recognition', false)?.front.paragraph).toEqual(['Vivo en una ', 'casa', ' pequeña. Es mía.']);
    expect(cardFaces(note({ template: 'paragraph', extra: { paragraph: 'Otra cosa.' } }), 'recognition', false)).toBeNull();
  });

  it('an occlusion card needs a picture and boxes, and shows them hidden and then plain', () => {
    const boxes = [{ x: 0.1, y: 0.1, w: 0.2, h: 0.1 }];
    expect(cardFaces(note({ template: 'image-occlusion', occlusion: boxes }), 'recognition', false)).toBeNull();
    expect(cardFaces(note({ template: 'image-occlusion' }), 'recognition', true)).toBeNull();
    expect(cardFaces(note({ template: 'image-occlusion', occlusion: boxes }), 'recognition', true)).toMatchObject({ front: { image: 'hidden' }, back: { image: 'plain' } });
  });

  it('reads a field as trimmed lines', () => {
    expect(fieldLines({ extra: { synonyms: ' a \n\n b' } }, 'synonyms')).toEqual(['a', 'b']);
    expect(fieldLines({}, 'synonyms')).toEqual([]);
  });
});
