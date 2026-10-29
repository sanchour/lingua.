import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronDown } from 'lucide-react';
import { irregularRows } from '@/core/lang/irregular';
import { formTables } from '@/core/lang/paradigm';
import { packId } from '@/core/packs/format';
import { normalizeWord } from '@/core/text/normalize';
import { db } from '@/data/db';
import { cx } from '@/lib/cx';

/** How many tables show before "All forms". */
const FIRST = 2;

/**
 * The word's forms from the dictionary: conjugations with I / you / he·she / we…, declensions by
 * case and number, and the remaining forms (infinitive, participles, comparative). The form met in
 * the text is highlighted.
 */
export function WordForms({ lang, lemma, seen, heading = true }: { lang: string; lemma: string; seen: string; heading?: boolean }) {
  const paradigm = useLiveQuery(() => db.dictParadigms.get([packId(lang), lemma]), [lang, lemma]);
  const [all, setAll] = useState(false);
  const built = useMemo(() => (paradigm ? formTables(lang, paradigm.forms, paradigm.pos) : null), [paradigm, lang]);
  const irregular = useMemo(() => (built ? irregularRows(lang, lemma, built.tables) : new Map<string, Set<number>>()), [built, lang, lemma]);
  if (!built || (!built.tables.length && !built.other.length)) return null;

  const isSeen = (form: string) => form.split(' / ').some((f) => normalizeWord(f.split(' ').at(-1) ?? f, lang) === seen);
  const tables = all ? built.tables : built.tables.slice(0, FIRST);
  const more = built.tables.length - FIRST + (built.other.length ? 1 : 0);

  return (
    <section>
      {heading && <h3 className="mb-2.5 text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">Forms</h3>}
      <div className="grid gap-3 sm:grid-cols-2">
        {tables.map((table) => (
          <div key={table.title} className={cx('rounded-2xl border border-line/70 bg-surface px-3.5 py-3', table.columns && table.columns.length > 2 && 'sm:col-span-2')}>
            <p className="mb-1.5 text-[12.5px] font-bold text-sage-text">
              {table.title}
              {irregular.has(table.title) && <span className="ml-2 font-normal text-ink-faint">● irregular</span>}
            </p>
            <table className="w-full border-collapse text-left">
              {table.columns && (
                <thead>
                  <tr>
                    {table.rows.some((r) => r.label) && <th className="pb-1" />}
                    {table.columns.map((c) => (
                      <th key={c} className="pb-1 text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {table.rows.map((row, rowIndex) => (
                  <tr key={row.label + row.cells.join()} className="border-t border-line/50 first:border-t-0">
                    {row.label && <th className="py-1 pr-3 align-baseline text-[12.5px] font-semibold whitespace-nowrap text-ink-faint">{row.label}</th>}
                    {row.cells.map((cell, k) => (
                      <td key={k} lang={lang} className={cx('py-1 pr-2 align-baseline font-serif text-[15px] leading-snug', isSeen(cell) && 'font-semibold text-accent-text')}>
                        {cell || <span className="text-ink-faint">–</span>}
                        {k === 0 && irregular.get(table.title)?.has(rowIndex) && (
                          <span className="ml-1 align-super text-[10px] text-accent-text" title="Irregular: not the form a regular verb would have" aria-label="irregular">
                            ●
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      {all && built.other.length > 0 && (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-2xl border border-line/70 bg-surface px-3.5 py-3">
          {built.other.map((o) => (
            <div key={o.label + o.form} className="contents">
              <dt className="text-[12.5px] font-semibold text-ink-faint">{o.label}</dt>
              <dd lang={lang} className={cx('font-serif text-[15px]', isSeen(o.form) && 'font-semibold text-accent-text')}>
                {o.form}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {more > 0 && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-2.5 flex items-center gap-1 text-[13px] font-semibold text-accent-text">
          {all ? 'Fewer forms' : 'All forms'}
          <ChevronDown size={15} className={cx('transition-transform', all && 'rotate-180')} aria-hidden />
        </button>
      )}
    </section>
  );
}
