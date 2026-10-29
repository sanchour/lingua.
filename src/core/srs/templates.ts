// What a card shows (6-3b). Besides "the word, then its meaning", a note can ask other things of the same word: its definition,
// a picture, its sound, its grammar, a synonym, an opposite, what goes with it, several meanings, related words, a paragraph, a
// picture with parts hidden. Pure: this says what is on each face; the card screen draws it.
import type { CardTemplate } from '@/core/contracts/word';
import type { Note } from '@/data/types';

/** The notes a template reads, kept in the note's `extra` (the fields Anki cards keep too), one per line. */
export type TemplateField = 'definition' | 'synonyms' | 'antonyms' | 'collocations' | 'grammar' | 'meanings' | 'related' | 'paragraph';

export interface TemplateInfo {
  id: CardTemplate;
  name: string;
  detail: string;
  /** The extra fields it asks for in the editor. */
  fields: TemplateField[];
  needsImage?: boolean;
  /** The dictionary can fill these in (the editor's "Fill from the dictionary"). */
  fill?: TemplateField[];
}

export const TEMPLATES: TemplateInfo[] = [
  { id: 'word-meaning', name: 'Word and meaning', detail: 'The word on one side, its meaning on the other.', fields: [] },
  { id: 'definition', name: 'Definition', detail: 'The word, and what it means said in the language itself.', fields: ['definition'], fill: ['definition'] },
  { id: 'picture', name: 'Picture', detail: 'A picture of it: see the word, recall the picture, or the other way.', fields: [], needsImage: true },
  { id: 'sound', name: 'Sound', detail: 'Hear it and say which word it is; or see the word and say it.', fields: [] },
  { id: 'grammar-fact', name: 'Grammar of the word', detail: 'Gender, plural, aspect, endings.', fields: ['grammar'], fill: ['grammar'] },
  { id: 'synonym', name: 'Another word for it', detail: 'The word, and words that mean the same.', fields: ['synonyms'], fill: ['synonyms'] },
  { id: 'antonym', name: 'The opposite', detail: 'The word, and the word that means the opposite.', fields: ['antonyms'], fill: ['antonyms'] },
  { id: 'collocation', name: 'What goes with it', detail: 'The word, and the words and phrases it keeps company with.', fields: ['collocations'], fill: ['collocations'] },
  { id: 'several-meanings', name: 'Several meanings', detail: 'All the meanings of a word on one card.', fields: ['meanings'], fill: ['meanings'] },
  { id: 'related-words', name: 'Related words', detail: 'The word and its family on one card.', fields: ['related'], fill: ['related'] },
  { id: 'paragraph', name: 'In a paragraph', detail: 'A short paragraph with the word left out.', fields: ['paragraph'] },
  { id: 'image-occlusion', name: 'Picture with parts hidden', detail: 'Boxes over a picture: say what is under each.', fields: [], needsImage: true },
];

export const FIELD_LABEL: Record<TemplateField, { label: string; placeholder: string }> = {
  definition: { label: 'Definition in the language', placeholder: 'Said in the language itself' },
  synonyms: { label: 'Words that mean the same', placeholder: 'One per line' },
  antonyms: { label: 'Opposites', placeholder: 'One per line' },
  collocations: { label: 'What goes with it', placeholder: 'One phrase per line' },
  grammar: { label: 'Grammar', placeholder: 'One fact per line: gender, plural, aspect…' },
  meanings: { label: 'Other meanings', placeholder: 'One per line, after the one above' },
  related: { label: 'Related words', placeholder: 'One per line' },
  paragraph: { label: 'The paragraph', placeholder: 'A few sentences with the word in them' },
};

export const templateOf = (note: Pick<Note, 'template'>): CardTemplate => note.template ?? 'word-meaning';

/** A field of a note as lines. */
export function fieldLines(note: Pick<Note, 'extra'>, field: TemplateField): string[] {
  return (note.extra?.[field] ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
}

export interface Face {
  /** A small question above ("Another word for it?"). */
  ask?: string;
  /** The word itself, with its article. */
  term?: boolean;
  /** A line of text (a definition, a meaning). */
  text?: string;
  /** A list, one per line. */
  lines?: string[];
  /** The picture, plain or with its boxes over it; the back shows it plain. */
  image?: 'plain' | 'hidden';
  /** A paragraph with the word gapped, split around it. */
  paragraph?: [before: string, gap: string, after: string];
  /** A big play button, nothing else written (hear it, then say it). */
  listen?: boolean;
}

export interface Faces {
  front: Face;
  back: Face;
}

/**
 * What the two faces of a card show, or null when the card is the plain word and meaning (or the note lacks what its template needs:
 * a picture card without a picture is a plain card, never an empty one).
 */
export function cardFaces(note: Note, direction: 'recognition' | 'production', hasImage: boolean): Faces | null {
  const t = templateOf(note);
  const production = direction === 'production';
  const lines = (f: TemplateField) => fieldLines(note, f);
  const needs = (...fields: TemplateField[]) => fields.every((f) => lines(f).length > 0);
  switch (t) {
    case 'definition': {
      const text = lines('definition').join(' ') || note.meaning;
      if (!text) return null;
      return production ? { front: { text, ask: 'Which word is this?' }, back: { term: true, text: note.meaning } } : { front: { term: true }, back: { text } };
    }
    case 'picture':
      if (!hasImage) return null;
      return production ? { front: { image: 'plain', ask: 'Which word is this?' }, back: { term: true, text: note.meaning, image: 'plain' } } : { front: { term: true, ask: 'What does it look like?' }, back: { image: 'plain', text: note.meaning } };
    case 'sound':
      return production ? { front: { listen: true, ask: 'Which word is it?' }, back: { term: true, text: note.meaning } } : { front: { term: true, ask: 'Say it, then listen' }, back: { listen: true, text: note.meaning } };
    case 'grammar-fact': {
      const facts = lines('grammar');
      return facts.length ? { front: { term: true, ask: 'What is its grammar?' }, back: { term: true, lines: facts } } : null;
    }
    case 'synonym':
      return needs('synonyms') ? { front: { term: true, ask: 'Another word for it?' }, back: { term: true, lines: lines('synonyms') } } : null;
    case 'antonym':
      return needs('antonyms') ? { front: { term: true, ask: 'And the opposite?' }, back: { term: true, lines: lines('antonyms') } } : null;
    case 'collocation':
      return needs('collocations') ? { front: { term: true, ask: 'What goes with it?' }, back: { term: true, lines: lines('collocations') } } : null;
    case 'several-meanings':
      return needs('meanings') ? { front: { term: true, ask: 'What can it mean?' }, back: { term: true, lines: [note.meaning, ...lines('meanings')].filter(Boolean) } } : null;
    case 'related-words':
      return needs('related') ? { front: { term: true, ask: 'Which words belong with it?' }, back: { term: true, lines: lines('related') } } : null;
    case 'paragraph': {
      const text = lines('paragraph').join(' ');
      const at = text.toLocaleLowerCase().indexOf(note.term.toLocaleLowerCase());
      if (!text || at < 0) return null;
      return { front: { paragraph: [text.slice(0, at), note.term, text.slice(at + note.term.length)], ask: 'Which word is missing?' }, back: { term: true, text: note.meaning } };
    }
    case 'image-occlusion':
      return hasImage && note.occlusion?.length ? { front: { image: 'hidden', ask: 'What is under each box?' }, back: { image: 'plain', text: note.meaning } } : null;
    default:
      return null;
  }
}
