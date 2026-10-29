// Transformations (6-4's first new kind): "Present · hablar: yo → nosotros". One form of a word is given and the learner
// types another form of the same word. Made from any table of forms (Grammatica's tables, a dictionary paradigm), so
// every room that has such a table gets the exercise from this one function.
import type { ExerciseSpec, Hint, TransformBody } from '@/core/contracts/exercise';
import { normalizeAnswer } from '@/core/srs/answer';
import { usableForm } from './grid';
import type { FormGrid } from './grid';

export interface FormPair {
  title: string;
  from: { form: string; label: string };
  to: { form: string; label: string };
  /** Every other usable form in the table: a slip that lands on one of them is a different form, not a typo. */
  others: string[];
}

export type TransformSpec = ExerciseSpec<'transform', TransformBody>;

const joinLabel = (...parts: Array<string | undefined>) => parts.filter(Boolean).join(' · ');

/** Every ordered pair of forms in one row (another column) or one column (another row) with something to name each by. */
export function pairsOfGrid(grid: FormGrid): FormPair[] {
  const forms: Array<{ r: number; c: number; form: string }> = [];
  grid.rows.forEach((row, r) => row.cells.forEach((form, c) => usableForm(form) && forms.push({ r, c, form })));
  const key = (s: string) => s.toLocaleLowerCase();
  const out: FormPair[] = [];
  for (const a of forms) {
    for (const b of forms) {
      if (a === b || key(a.form) === key(b.form)) continue;
      const sameRow = a.r === b.r && a.c !== b.c;
      const sameCol = a.c === b.c && a.r !== b.r;
      if (!sameRow && !sameCol) continue;
      let from: string;
      let to: string;
      let title = grid.title;
      if (sameRow) {
        // Another column of the same row: the columns name the forms ("singular", "plural"), the row names the word.
        from = grid.columns[a.c] ?? '';
        to = grid.columns[b.c] ?? '';
        title = joinLabel(grid.title, grid.rows[a.r].label);
      } else {
        // Another row of the same column: the rows name the forms ("yo", "nosotros").
        from = grid.rows[a.r].label;
        to = grid.rows[b.r].label;
        title = joinLabel(grid.title, grid.columns[a.c]);
      }
      if (!from || !to || from === to) continue;
      out.push({
        title,
        from: { form: a.form, label: from },
        to: { form: b.form, label: to },
        others: forms.filter((f) => key(f.form) !== key(b.form)).map((f) => f.form),
      });
    }
  }
  return out;
}

/** Hints that grow: the name of the form, then its first letter, then half of it. */
function hintsFor(pair: FormPair): Hint[] {
  const answer = pair.to.form;
  const letters = [...answer];
  const half = Math.max(2, Math.ceil(letters.length / 2));
  return [
    { text: `It is the ${pair.to.label} form.`, strength: 0 },
    { text: `${letters[0]}…`, strength: 1 },
    ...(letters.length > 3 ? [{ text: `${letters.slice(0, half).join('')}…`, strength: 2 as const }] : []),
  ];
}

export function transformSpec(pair: FormPair, lang: string, key: string, trains: ExerciseSpec['trains'], lemma?: string): TransformSpec {
  return {
    key,
    kind: 'transform',
    lang,
    instruction: 'Change the form',
    body: { title: pair.title, lemma, from: pair.from, to: { label: pair.to.label } },
    check: { rule: 'accent-blind', expected: pair.to.form, rejects: pair.others.filter((o) => normalizeAnswer(o, lang) !== normalizeAnswer(pair.to.form, lang)) },
    hints: hintsFor(pair),
    trains,
    feedback: { why: `${pair.from.form} is ${pair.from.label}; ${pair.to.form} is ${pair.to.label}.` },
  };
}

/**
 * Up to `count` transformations from some tables, each asking for a different form, in an order drawn from `random`
 * (so a lesson is reproducible in tests). `trains` says what answering them says about the learner.
 */
export function planTransforms(
  grids: FormGrid[],
  lang: string,
  random: () => number,
  count: number,
  opts: { trains: ExerciseSpec['trains']; keyPrefix?: string; lemma?: string },
): TransformSpec[] {
  const pool = grids.flatMap(pairsOfGrid);
  // Fisher–Yates, so the same seed gives the same lesson.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const asked = new Set<string>();
  const out: TransformSpec[] = [];
  for (const pair of pool) {
    // Each lesson asks for each form once.
    const id = `${pair.title}|${pair.to.form}`;
    if (asked.has(id)) continue;
    asked.add(id);
    out.push(transformSpec(pair, lang, `${opts.keyPrefix ?? 'tf'}-${out.length}`, opts.trains, opts.lemma));
    if (out.length >= count) break;
  }
  return out;
}
