// Parsing Quizlet text exports (F1473).
// Quizlet lets learners export sets with a custom term/definition delimiter (Tab, Comma, " - ", " : ")
// and a row delimiter (Newline, Semicolon, or "\n\n" for multi-line definitions).
import type { CsvNote, DeckTable } from './deckCsv';

export interface QuizletOptions {
  /** Term/definition separator (auto-detected if omitted). */
  termDelimiter?: string;
  /** Row separator (auto-detected if omitted). */
  rowDelimiter?: string;
}

const CANDIDATE_TERM_DELIMS = ['\t', ' - ', ' — ', ' : ', ' = ', ';', ','];

export function detectQuizletDelimiters(source: string): { termDelimiter: string; rowDelimiter: string } {
  const clean = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  const lines = clean.split('\n').filter((l) => l.trim().length > 0);

  for (const delim of CANDIDATE_TERM_DELIMS) {
    const matching = lines.filter((l) => l.includes(delim));
    if (matching.length >= Math.max(1, Math.ceil(lines.length * 0.6))) {
      return { termDelimiter: delim, rowDelimiter: '\n' };
    }
  }

  return { termDelimiter: '\t', rowDelimiter: '\n' };
}

export function parseQuizletToTable(source: string, options: QuizletOptions = {}): DeckTable {
  const clean = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  if (!clean) return { rows: [], header: false, delimiter: '\t' };

  const detected = detectQuizletDelimiters(clean);
  const termDelim = options.termDelimiter || detected.termDelimiter;
  const rowDelim = options.rowDelimiter || detected.rowDelimiter;

  const rawRows = clean.split(rowDelim).map((r) => r.trim()).filter(Boolean);
  const rows: string[][] = [];

  for (const raw of rawRows) {
    const idx = raw.indexOf(termDelim);
    if (idx < 0) continue;
    const term = raw.slice(0, idx).trim();
    const meaning = raw.slice(idx + termDelim.length).trim();
    if (!term && !meaning) continue;
    rows.push([term, meaning]);
  }

  return { rows, header: false, delimiter: termDelim };
}

export function parseQuizletNotes(source: string, options: QuizletOptions = {}): CsvNote[] {
  const table = parseQuizletToTable(source, options);
  return table.rows
    .filter(([term]) => Boolean(term))
    .map(([term, meaning]) => ({
      term,
      meaning: meaning ?? '',
      tags: ['quizlet'],
    }));
}
