import { Fragment, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { loadGrammar } from '@/core/grammar/load';
import { plain, splitFocus } from '@/core/grammar/types';
import type { Comparison, Example, Grammar, GrammarTable } from '@/core/grammar/types';
import { cx } from '@/lib/cx';
import { isRtl } from '@/core/lang/languages';
import { SpeakButton } from '@/features/speech/SpeakButton';

/** A language's grammar; `undefined` while loading, `null` for a language without one. */
export function useGrammar(lang: string): Grammar | null | undefined {
  const [state, setState] = useState<{ lang: string; grammar: Grammar | null }>();
  useEffect(() => {
    let alive = true;
    void loadGrammar(lang).then((g) => alive && setState({ lang, grammar: g }));
    return () => {
      alive = false;
    };
  }, [lang]);
  return state?.lang === lang ? state.grammar : undefined;
}

export const eyebrow = 'text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase';

/** Rule text: **bold** for forms and endings, *italic* for words quoted in the language. */
export function Rich({ text, lang }: { text: string; lang: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') ? (
          <strong key={i} lang={lang} dir="auto" className="font-semibold text-ink">
            {p.slice(2, -2)}
          </strong>
        ) : p.startsWith('*') ? (
          <em key={i} lang={lang} dir="auto" className="text-ink">
            {p.slice(1, -1)}
          </em>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

/** A sentence with the form the topic is about marked, its translation, and a speaker. */
export function SentenceLine({ example, lang, size = 'md' }: { example: Example; lang: string; size?: 'md' | 'lg' }) {
  const { before, focus, after } = splitFocus(example.s);
  const rtl = isRtl(lang);
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <p lang={lang} dir={rtl ? 'rtl' : undefined} className={cx('font-serif', rtl ? 'leading-relaxed' : 'leading-snug', size === 'lg' ? (rtl ? 'text-[clamp(1.45rem,4.4vw,1.75rem)]' : 'text-[clamp(1.2rem,3.6vw,1.45rem)]') : rtl ? 'text-[20px]' : 'text-[17px]')}>
          {before}
          {focus && <mark className="rounded-[0.3em] bg-accent-soft px-[0.15em] font-semibold text-accent-text [box-decoration-break:clone]">{focus}</mark>}
          {after}
        </p>
        <p className="mt-1 text-[14px] leading-snug text-ink-soft">{example.en}</p>
      </div>
      <SpeakButton lang={lang} text={plain(example.s)} size={18} className="size-10 text-ink-soft hover:bg-sunken hover:text-ink" />
    </div>
  );
}

export function TableView({ table, lang }: { table: GrammarTable; lang: string }) {
  const [head, ...cols] = table.columns ?? [];
  return (
    <figure className="min-w-0">
      {table.title && <figcaption className="mb-2 text-[13px] font-semibold text-ink-soft">{table.title}</figcaption>}
      <div className="overflow-x-auto rounded-2xl border border-line/70">
        <table className="w-full border-collapse text-left text-[14px] sm:text-[15px]">
          {table.columns && (
            <thead className="bg-sunken/60">
              <tr>
                <th scope="col" className="px-2.5 py-2 sm:px-3.5 text-[12px] font-bold tracking-wide text-ink-faint uppercase">
                  {head}
                </th>
                {cols.map((c) => (
                  <th key={c} scope="col" lang={lang} dir="auto" className="px-2.5 py-2 sm:px-3.5 text-[13px] font-semibold text-ink-soft">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {table.rows.map(([label, ...cells], i) => (
              <tr key={i} className="border-t border-line/60 first:border-t-0">
                <th scope="row" lang={lang} dir="auto" className="px-2.5 py-2 font-normal text-ink-soft sm:px-3.5">
                  {label}
                </th>
                {cells.map((c, j) => (
                  <td key={j} lang={lang} dir="auto" className="px-2.5 py-2 font-semibold sm:px-3.5">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.note && <p className="mt-2 text-[13px] leading-snug text-ink-faint">{table.note}</p>}
    </figure>
  );
}

export function CompareView({ compare, lang }: { compare: Comparison; lang: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {compare.sides.map((side, i) => (
        <div key={side.label} className={cx('rounded-2xl border p-4', i === 0 ? 'border-sage/40 bg-sage-soft/40' : 'border-accent/30 bg-accent-soft/40')}>
          <p lang={lang} className={cx('font-serif text-xl font-semibold', i === 0 ? 'text-sage-text' : 'text-accent-text')}>
            {side.label}
          </p>
          <ul className="mt-2 space-y-1 text-[14.5px] leading-snug text-ink-soft">
            {side.points.map((p) => (
              <li key={p} className="flex gap-2">
                <span aria-hidden className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-current opacity-50" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
          {side.example && (
            <div className="mt-3 border-t border-line/60 pt-3">
              <SentenceLine example={side.example} lang={lang} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function WatchOut({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[color-mix(in_oklab,var(--learning-line)_45%,transparent)] bg-[color-mix(in_oklab,var(--learning-line)_12%,var(--bg))] p-4">
      <TriangleAlert size={19} className="mt-0.5 shrink-0 text-[var(--learning-line)]" aria-hidden />
      <p className="text-[15px] leading-snug">
        <span className="font-semibold">Watch out: </span>
        {children}
      </p>
    </div>
  );
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="mt-9">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h2 className={eyebrow}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
