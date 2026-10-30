import { UiText, useUi } from '@/design/i18n/UiText';
// The error log (6-5b): every mistake the learner made, newest first, with what they wrote and what was right: from lessons and
// Practice (the record) and from the corrections in their conversations. A way back to the grammar topic where there is one.
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { ListX } from 'lucide-react';
import { loadGrammar } from '@/core/grammar/load';
import type { Grammar } from '@/core/grammar/types';
import { buildErrorLog } from '@/core/learner/errorLog';
import type { ErrorEntry } from '@/core/learner/errorLog';
import { db } from '@/data/db';
import { recentWrong } from '@/data/learner';
import { cx } from '@/lib/cx';
import { Panel } from './common';
import { nameOf } from './WeakSpotsPanel';

type Filter = 'all' | 'words' | 'grammar' | 'conversation';
const FILTERS: Array<[Filter, string]> = [['all', 'All'], ['words', 'Words'], ['grammar', 'Grammar'], ['conversation', 'Conversations']];
const PAGE = 12;

const shortDay = (at: number) => new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const inFilter = (e: ErrorEntry, f: Filter) => f === 'all' || (f === 'words' ? e.source === 'word' : f === 'grammar' ? e.source === 'grammar' : e.source === 'conversation');

export function ErrorLogPanel({ lang }: { lang: string }) {
  const translateUi = useUi();
  const [filter, setFilter] = useState<Filter>('all');
  const [shown, setShown] = useState(PAGE);
  const [grammar, setGrammar] = useState<Grammar | null>();
  useEffect(() => {
    let alive = true;
    void loadGrammar(lang).then((g) => alive && setGrammar(g ?? null));
    return () => {
      alive = false;
    };
  }, [lang]);
  const log = useLiveQuery(async () => buildErrorLog(await recentWrong(lang), await db.chats.where('lang').equals(lang).toArray(), (item) => nameOf(item, grammar), 200), [lang, grammar]);
  if (!log?.length) return null;
  const list = log.filter((e) => inFilter(e, filter));

  return (
    <Panel title={translateUi('Error log')} icon={ListX}>
      <p className="mb-3 text-[13.5px] text-ink-soft"><UiText source={'Every mistake from your lessons, Practice and conversations, newest first.'} /></p>
      <div role="group" aria-label={translateUi('Kind of mistake')} className="mb-2 flex flex-wrap gap-1.5">
        {FILTERS.filter(([f]) => f === 'all' || log.some((e) => inFilter(e, f))).map(([f, label]) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => (setFilter(f), setShown(PAGE))}
            className={cx('rounded-full border px-3 py-1 text-[13px] font-semibold', filter === f ? 'border-accent bg-accent-soft text-accent-text' : 'border-line text-ink-soft hover:bg-surface')}
          >
            <UiText source={label} />
          </button>
        ))}
      </div>
      <ul className="divide-y divide-line/60">
        {list.slice(0, shown).map((e) => (
          <li key={e.id} className="py-2.5">
            <p className="flex flex-wrap items-baseline gap-x-2">
              {e.link ? (
                <Link to={e.link} className="font-serif text-[16px] font-semibold hover:underline">
                  {e.title}
                </Link>
              ) : (
                <span lang={e.source === 'word' ? lang : undefined} className="font-serif text-[16px] font-semibold">
                  {e.title}
                </span>
              )}
              {e.category && <span className="text-[12.5px] text-ink-faint">{e.category.replace('-', ' ')}</span>}
              {e.times > 1 && <span className={cx('rounded-full px-2 py-px text-[11.5px] font-semibold', e.times >= 3 ? 'bg-accent-soft text-accent-text' : 'bg-sunken text-ink-soft')}>{e.times >= 3 ? translateUi('keeps coming back · {0}×', [e.times]) : `${e.times}×`}</span>}
              <span className="ml-auto text-[12.5px] text-ink-faint tabular-nums">{shortDay(e.at)}</span>
            </p>
            {(e.given || e.expected) && (
              <p lang={lang} className="text-[14px] text-ink-soft">
                {e.given && <span className="line-through decoration-accent/60">{e.given}</span>}
                {e.given && e.expected && ' → '}
                {e.expected && <span className="font-semibold text-ink">{e.expected}</span>}
              </p>
            )}
            {e.note && <p className="text-[13px] text-ink-faint">{e.note}</p>}
          </li>
        ))}
      </ul>
      {list.length > shown && (
        <button type="button" onClick={() => setShown(shown + PAGE)} className="mt-2 text-[13px] font-semibold text-accent-text hover:underline"><UiText source={'Show more ({0})'} values={[list.length - shown]} /></button>
      )}
    </Panel>
  );
}
