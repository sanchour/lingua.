// A table of forms, whichever room it comes from: Grammatica's hand-written tables (`GrammarTable`) and the
// dictionary's inflection tables (`FormTable`, built from a pack paradigm). Transformations are made from this one shape.
import type { GrammarTable } from '@/core/grammar/types';
import type { FormTable } from '@/core/lang/paradigm';

export interface FormGrid {
  title: string;
  /** One heading per cell column; empty when the table has a single column of forms. */
  columns: string[];
  rows: Array<{ label: string; cells: string[] }>;
}

const clean = (s: string) => s.replace(/\*\*/g, '').trim();

export function gridOfGrammarTable(table: GrammarTable, fallbackTitle = ''): FormGrid {
  return {
    title: table.title ?? fallbackTitle,
    // The first heading belongs to the row labels.
    columns: (table.columns ?? []).slice(1).map(clean),
    rows: table.rows.map((r) => ({ label: clean(r[0] ?? ''), cells: r.slice(1).map(clean) })),
  };
}

export function gridOfFormTable(table: FormTable): FormGrid {
  return { title: table.title, columns: (table.columns ?? []).map(clean), rows: table.rows.map((r) => ({ label: clean(r.label), cells: r.cells.map(clean) })) };
}

/** Short, one form, no alternatives or notes: what can be asked for and compared. */
export const usableForm = (c: string | undefined): c is string => Boolean(c && c.length <= 24 && !/[/()…*;]|\.\.\./.test(c) && !/^[—–-]$/.test(c.trim()));
