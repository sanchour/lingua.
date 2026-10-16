// Word lists from spreadsheets: CSV / TSV exports from Excel, Google Sheets, Quizlet or Anki's
// "Notes in Plain Text". Pure: the import drawer lets the learner confirm the guessed columns.
import { parseCsv } from './csv';

export type ColumnRole = 'term' | 'meaning' | 'example' | 'exampleTranslation' | 'tags' | 'ignore';

export const ROLE_LABELS: Record<ColumnRole, string> = {
  term: 'Word',
  meaning: 'Meaning',
  example: 'Example sentence',
  exampleTranslation: 'Sentence translation',
  tags: 'Tags',
  ignore: 'Skip',
};

export interface DeckTable {
  rows: string[][];
  /** The first row names the columns. */
  header: boolean;
  delimiter: string;
}

/** The delimiter used most in the first lines (outside quotes): tab, semicolon or comma. */
export function detectDelimiter(text: string): string {
  const sample = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#')).slice(0, 10).join('\n').replace(/"[^"]*"/g, '');
  const score = (d: string) => sample.split(d).length - 1;
  return ['\t', ';', ','].reduce((best, d) => (score(d) > score(best) ? d : best), ',');
}

const HEADER_WORDS = /^(term|word|front|back|meaning|definition|translation|english|example|sentence|context|tags?|notes?|question|answer|vocab(ulary)?|expression|target|native|reading|audio|wort|bedeutung|palabra|significado|mot|sens|parola|significato|слово|перевод|λέξη|σημασία|ord|betydelse|szó|jelentés)\b/i;

export function readDeckTable(text: string): DeckTable {
  // Anki's plain-text export starts with "#separator:tab", "#html:true", … lines.
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  let delimiter: string | null = null;
  let skip = 0;
  while (skip < lines.length && lines[skip].startsWith('#')) {
    const sep = /^#separator:(\w+)/i.exec(lines[skip])?.[1]?.toLowerCase();
    if (sep) delimiter = { tab: '\t', comma: ',', semicolon: ';', pipe: '|', space: ' ' }[sep] ?? null;
    skip++;
  }
  const body = lines.slice(skip).join('\n');
  delimiter ??= detectDelimiter(body);
  const rows = parseCsv(body, delimiter).filter((r) => r.some((c) => c.trim()));
  const header = rows.length > 1 && rows[0].filter((c) => c.trim()).length > 0 && rows[0].every((c) => !c.trim() || (c.length < 40 && HEADER_WORDS.test(c.trim())));
  return { rows, header, delimiter };
}

/** Guesses what each column holds, from header names or else from the content. */
export function guessColumns(table: DeckTable): ColumnRole[] {
  const width = Math.max(0, ...table.rows.slice(0, 50).map((r) => r.length));
  const roles: ColumnRole[] = Array.from({ length: width }, () => 'ignore');
  const names = table.header ? table.rows[0].map((c) => c.trim().toLowerCase()) : [];
  const take = (role: ColumnRole, test: RegExp) => {
    const i = names.findIndex((n, idx) => roles[idx] === 'ignore' && test.test(n));
    if (i >= 0) roles[i] = role;
  };
  if (names.length) {
    take('exampleTranslation', /(sentence|example).*(translation|english|meaning)|translation.*(sentence|example)/);
    take('term', /^(term|word|front|question|vocab|vocabulary|expression|target|wort|palabra|mot|parola|слово|λέξη|ord|szó)/);
    take('meaning', /^(meaning|definition|translation|english|back|answer|native|bedeutung|significado|sens|significato|перевод|σημασία|betydelse|jelentés)/);
    take('example', /example|sentence|context|usage/);
    take('tags', /^tags?$/);
  }
  const data = table.rows.slice(table.header ? 1 : 0, 60);
  const avgWords = (i: number) => data.reduce((n, r) => n + (r[i]?.trim().split(/\s+/).length ?? 0), 0) / Math.max(1, data.length);
  for (let i = 0; i < width; i++) {
    if (roles[i] !== 'ignore') continue;
    if (!roles.includes('term')) roles[i] = 'term';
    else if (!roles.includes('meaning')) roles[i] = 'meaning';
    else if (!roles.includes('example') && avgWords(i) >= 4) roles[i] = 'example';
    else if (roles.includes('example') && !roles.includes('exampleTranslation') && avgWords(i) >= 4) roles[i] = 'exampleTranslation';
  }
  return roles;
}

const ENTITIES: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" };

/** Plain text from a little HTML (Anki fields, Quizlet exports): line breaks kept, tags and sounds dropped. */
export function stripHtml(html: string): string {
  return html
    .replace(/\[sound:[^\]]*\]/g, '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|li)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+|#39);/gi, (m, code: string) => {
      if (code[0] === '#') {
        const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : m;
      }
      return ENTITIES[code.toLowerCase()] ?? m;
    })
    .replace(/[ \t ]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

export interface CsvNote {
  term: string;
  meaning: string;
  example?: { text: string; translation?: string };
  tags: string[];
}

export function tableToNotes(table: DeckTable, roles: ColumnRole[]): CsvNote[] {
  const col = (role: ColumnRole) => roles.indexOf(role);
  const [t, m, e, et, g] = (['term', 'meaning', 'example', 'exampleTranslation', 'tags'] as const).map(col);
  const out: CsvNote[] = [];
  for (const row of table.rows.slice(table.header ? 1 : 0)) {
    const term = t >= 0 ? stripHtml(row[t] ?? '').replace(/\n+/g, ' ') : '';
    if (!term) continue;
    const exampleText = e >= 0 ? stripHtml(row[e] ?? '') : '';
    out.push({
      term,
      meaning: m >= 0 ? stripHtml(row[m] ?? '').replace(/\n+/g, '; ') : '',
      example: exampleText ? { text: exampleText, translation: et >= 0 ? stripHtml(row[et] ?? '') || undefined : undefined } : undefined,
      tags: g >= 0 ? (row[g] ?? '').split(/[\s,;]+/).filter(Boolean) : [],
    });
  }
  return out;
}
