// What the dictionary can write into a card's fields (6-3b), so a synonym card or a grammar card starts from the entry and the learner
// only edits it. One line per item; nothing is invented: a field the entry has nothing for comes back empty.
import type { FullDictRow } from '@/core/dictionary/format';
import type { TemplateField } from './templates';

const GENDER: Record<string, string> = { m: 'masculine', f: 'feminine', n: 'neuter', mf: 'masculine or feminine' };
const unique = (list: string[]) => [...new Set(list.map((s) => s.trim()).filter(Boolean))];
const short = (words: string[]) => unique(words).filter((w) => w.length < 40);

export function fillFromEntry(row: FullDictRow, field: TemplateField): string {
  const entries = row.entries;
  const main = entries[0];
  const lines = ((): string[] => {
    switch (field) {
      case 'definition':
        // The language's own definition where its Wiktionary has one; else the first meaning.
        return [row.mono?.[0]?.defs[0] ?? main?.senses[0]?.g[0] ?? ''];
      case 'synonyms':
        return short(entries.flatMap((e) => [...(e.syn ?? []), ...e.senses.flatMap((s) => s.syn ?? [])])).slice(0, 8);
      case 'antonyms':
        return short(entries.flatMap((e) => [...(e.ant ?? []), ...e.senses.flatMap((s) => s.ant ?? [])])).slice(0, 6);
      case 'collocations':
        return unique(entries.flatMap((e) => (e.phrases ?? []).map(([p, g]) => (g ? `${p}: ${g}` : p)))).slice(0, 8);
      case 'grammar': {
        const out: string[] = [];
        if (main?.pos) out.push(`Kind of word: ${main.pos}`);
        if (main?.gender) out.push(`Gender: ${GENDER[main.gender] ?? main.gender}`);
        for (const [label, word] of main?.pair ?? []) out.push(`${label[0].toUpperCase()}${label.slice(1)}: ${word}`);
        const tags = unique(entries.flatMap((e) => e.senses.flatMap((s) => s.tags ?? []))).filter((t) => /transitive|reflexive|impersonal|perfective|uncountable/.test(t));
        if (tags.length) out.push(`Use: ${tags.slice(0, 3).join(', ')}`);
        return out;
      }
      case 'meanings':
        // The first meaning is the card's own; these are the others.
        return unique(entries.flatMap((e) => e.senses.map((s) => s.g[0] ?? ''))).slice(1, 7);
      case 'related':
        return short(entries.flatMap((e) => [...(e.derived ?? []), ...(e.related ?? [])])).slice(0, 10);
      default:
        return [];
    }
  })();
  return lines.filter(Boolean).join('\n');
}
