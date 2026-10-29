// Making a deck from something the learner already has (6-2b): a pasted list of words, or the words of a pasted text they don't know yet.
// Pure: the dialog shows what this returns as a preview, and nothing is made until the learner says so.
import { tokenize } from '@/core/text/tokenizer';

export interface Draft {
  term: string;
  meaning: string;
  /** A sentence that shows it, kept on the card. */
  example?: string;
}

/** A tab, ` = `, ` - `, ` – `, ` — ` or `;` splits a line into the word and its meaning; the first one in the line wins. */
const SPLIT = /\t| [=\-–—] |;/;

export function parseWordList(text: string): Draft[] {
  const seen = new Set<string>();
  const out: Draft[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = SPLIT.exec(line);
    const term = (m ? line.slice(0, m.index) : line).trim();
    if (!term || term.length > 80) continue;
    const key = term.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ term, meaning: m ? line.slice(m.index + m[0].length).trim() : '' });
  }
  return out;
}

/** The words of a conversation: the ones the AI marked as worth keeping (with their meaning) first, then the other unknown words of what was said. */
export function wordsFromChat(messages: ReadonlyArray<{ text: string; words?: Array<{ word: string; meaning: string }> }>, lang: string, known: ReadonlySet<string>, limit = 60): Draft[] {
  const seen = new Set<string>();
  const out: Draft[] = [];
  for (const m of messages) {
    for (const w of m.words ?? []) {
      const key = w.word.trim().toLocaleLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        out.push({ term: w.word.trim(), meaning: w.meaning.trim() });
      }
    }
  }
  for (const d of wordsFromText(messages.map((m) => m.text).join('\n'), lang, known, limit)) {
    if (!seen.has(d.term.toLocaleLowerCase())) out.push(d);
  }
  return out.slice(0, limit);
}

/** The unknown words of a text the library has already counted (norms and how often each came), most used first. */
export function wordsFromCounts(norms: readonly string[], counts: readonly number[], known: ReadonlySet<string>, limit = 60): Draft[] {
  return norms
    .map((w, i) => ({ w, n: counts[i] ?? 0, i }))
    .filter(({ w }) => [...w].length >= 2 && !known.has(w) && !/\d/.test(w))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .slice(0, limit)
    .map(({ w }) => ({ term: w, meaning: '' }));
}

/** The words of a text that aren't known yet, most often used first, then in the order they appear (`known` holds normalised words). */
export function wordsFromText(text: string, lang: string, known: ReadonlySet<string>, limit = 60): Draft[] {
  const found = new Map<string, { term: string; n: number; first: number }>();
  for (const t of tokenize(text, lang)) {
    const norm = t.base ?? t.norm;
    if (!t.isWord || !norm || [...norm].length < 2 || known.has(norm) || /\d/.test(norm)) continue;
    const seen = found.get(norm);
    if (seen) seen.n++;
    else found.set(norm, { term: t.text, n: 1, first: t.start });
  }
  return [...found.values()]
    .sort((a, b) => b.n - a.n || a.first - b.first)
    .slice(0, limit)
    .map(({ term }) => ({ term, meaning: '' }));
}
