// Irregular verb forms (6-1c, F0137): found by comparing a conjugation table with what the regular verb of that kind would be.
// Spanish only for now (shortcut: its six simple tenses, regular endings written out; upgrade to other languages when someone writes theirs).
import type { FormTable } from './paradigm';

type Endings = [string, string, string, string, string, string];

const REGULAR: Record<'ar' | 'er' | 'ir', Record<string, Endings>> = {
  ar: {
    present: ['o', 'as', 'a', 'amos', 'áis', 'an'],
    preterite: ['é', 'aste', 'ó', 'amos', 'asteis', 'aron'],
    imperfect: ['aba', 'abas', 'aba', 'ábamos', 'abais', 'aban'],
  },
  er: {
    present: ['o', 'es', 'e', 'emos', 'éis', 'en'],
    preterite: ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron'],
    imperfect: ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'],
  },
  ir: {
    present: ['o', 'es', 'e', 'imos', 'ís', 'en'],
    preterite: ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron'],
    imperfect: ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'],
  },
};
const FUTURE: Endings = ['é', 'ás', 'á', 'emos', 'éis', 'án'];
const CONDITIONAL: Endings = ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'];

/** The six regular forms of each simple tense for an infinitive, or null when it is not a plain -ar, -er or -ir verb. */
export function regularSpanish(infinitive: string): string[][] | null {
  const m = /^(.+)(ar|er|ir)$/i.exec(infinitive.trim());
  if (!m || infinitive.endsWith('se')) return null;
  const [, stem, kind] = m;
  const sets = Object.values(REGULAR[kind.toLowerCase() as 'ar' | 'er' | 'ir']).map((e) => e.map((x) => stem + x));
  return [...sets, FUTURE.map((x) => infinitive + x), CONDITIONAL.map((x) => infinitive + x)];
}

/** The tables' titles (`tagTitle`) in the order `regularSpanish` gives the tenses. */
const BY_TITLE = ['present', 'preterite', 'imperfect', 'future', 'conditional'];

const norm = (s: string) => s.toLocaleLowerCase('es').trim();

/**
 * For each conjugation table of six forms, the rows whose form is not the regular one. A table is read as the tense its title names
 * (Present, Preterite, Imperfect, Future, Conditional); others are left alone, as are verbs whose kind is not plain.
 */
export function irregularRows(lang: string, lemma: string, tables: readonly FormTable[]): Map<string, Set<number>> {
  const out = new Map<string, Set<number>>();
  const regular = lang === 'es' ? regularSpanish(lemma) : null;
  if (!regular) return out;
  for (const table of tables) {
    if (table.rows.length !== 6 || table.columns) continue;
    const cells = table.rows.map((r) => r.cells[0] ?? '');
    const tense = BY_TITLE.indexOf(table.title.toLocaleLowerCase('en'));
    if (tense < 0) continue;
    const best = cells.map((c, i) => c.split(' / ').some((f) => norm(f) === norm(regular[tense][i])));
    const bad = new Set(best.flatMap((ok, i) => (!ok && cells[i] ? [i] : [])));
    if (bad.size) out.set(table.title, bad);
  }
  return out;
}
