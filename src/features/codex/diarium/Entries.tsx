import { UiText, useUi } from '@/design/i18n/UiText';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Ref } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, Ellipsis, List, TextCursorInput, Trash2 } from 'lucide-react';
import { toPlain } from '@/core/journal/markdown';
import { deleteEntry, restoreEntry, updateEntry } from '@/data/journal';
import type { JournalEntry } from '@/data/types';
import { gradeColor, Ring } from '@/design/charts/Ring';
import { Kbd, MenuItem, Popover, SearchInput, searchKey, Segmented, SortMenu } from '@/design/primitives';
import { localDateKey } from '@/lib/format';
import { cx } from '@/lib/cx';
import { toast } from '@/state/ui';

type Sort = 'newest' | 'oldest' | 'longest' | 'corrected';
type View = 'list' | 'calendar';
const SORTS: Array<{ value: Sort; label: string }> = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'longest', label: 'Longest' },
  { value: 'corrected', label: 'Most corrected' },
];
const corrections = (e: JournalEntry) => e.review?.corrections.length ?? 0;
const monthName = (key: string) => new Date(`${key}-01T12:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

/** Typing outside a field: "/" focuses the search. */
const typing = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

/** Diarium's entries (5.2-5): search, sort, a menu on every row, and a calendar of the days written. */
export function Entries({ entries, lang }: { entries: JournalEntry[]; lang: string }) {
  const translateUi = useUi();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('newest');
  const [view, setView] = useState<View>('list');
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      e.preventDefault();
      setView('list');
      window.setTimeout(() => search.current?.focus());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const shown = useMemo(() => {
    const q = searchKey(query.trim());
    const list = q ? entries.filter((e) => searchKey(`${e.title ?? ''} ${e.prompt ?? ''} ${toPlain(e.text)}`).includes(q)) : [...entries];
    if (sort === 'oldest') list.reverse();
    if (sort === 'longest') list.sort((a, b) => b.words - a.words);
    if (sort === 'corrected') list.sort((a, b) => corrections(b) - corrections(a) || b.words - a.words);
    return list;
  }, [entries, query, sort]);

  // By month while the order is by date; one list when sorted otherwise or searching.
  const groups = useMemo(() => {
    if (query.trim() || sort === 'longest' || sort === 'corrected') return [['', shown] as const];
    const out = new Map<string, JournalEntry[]>();
    for (const e of shown) {
      const key = e.date.slice(0, 7);
      if (!out.has(key)) out.set(key, []);
      out.get(key)!.push(e);
    }
    return [...out];
  }, [shown, query, sort]);

  if (!entries.length) return null;
  return (
    <section aria-label={translateUi('Entries')}>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="mr-auto font-serif text-xl font-semibold"><UiText source={'Entries'} /></h2>
        {view === 'list' && (
          <>
            <div className="relative w-64">
              <SearchInput ref={search} value={query} onChange={setQuery} placeholder={translateUi('Search entries')} className="h-10" />
              {!query && (
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
                  <Kbd>/</Kbd>
                </span>
              )}
            </div>
            <SortMenu value={sort} options={SORTS} onChange={setSort} />
          </>
        )}
        <Segmented<View>
          label={translateUi('View')}
          value={view}
          onChange={setView}
          options={[
            { value: 'list', label: translateUi('List'), icon: List },
            { value: 'calendar', label: translateUi('Calendar'), icon: CalendarDays },
          ]}
        />
      </div>

      {view === 'calendar' ? (
        <Calendar entries={entries} lang={lang} />
      ) : shown.length === 0 ? (
        <p className="py-8 text-center text-[15px] text-ink-soft"><UiText source={'No entry has “{0}”.'} values={[query.trim()]} /></p>
      ) : (
        <div className="space-y-7">
          {groups.map(([month, list]) => (
            <div key={month || 'all'}>
              {month && <h3 className="mb-2 border-b border-line pb-2 text-[13px] font-bold tracking-[0.1em] text-ink-faint uppercase">{monthName(month)}</h3>}
              <ul className="-mx-2">
                {list.map((e) => (
                  <li key={e.id}>
                    <EntryRow entry={e} lang={lang} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Sets a ref of either kind. */
function assign<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

/** Deletes with a few seconds to take it back. */
export function deleteWithUndo(entry: JournalEntry) {
  void deleteEntry(entry.id);
  toast('Entry deleted.', { action: { label: 'Undo', onClick: () => void restoreEntry(entry.id) } });
}

function EntryRow({ entry, lang, compact }: { entry: JournalEntry; lang: string; compact?: boolean }) {
  const translateUi = useUi();
  const date = new Date(`${entry.date}T12:00:00`);
  const first = toPlain(entry.text).split('\n')[0];
  const review = entry.review;
  const [renaming, setRenaming] = useState(false);
  const more = useRef<HTMLButtonElement | null>(null);

  return (
    <div
      className="group flex items-center gap-1 rounded-2xl transition-colors hover:bg-surface"
      onContextMenu={(e) => {
        e.preventDefault();
        more.current?.click();
      }}
    >
      <Link to={`/mentis/diarium/${entry.id}`} onClick={(e) => renaming && e.preventDefault()} className={cx('flex min-w-0 flex-1 items-center gap-4 px-2', compact ? 'py-2' : 'py-3')}>
        <div className="w-12 shrink-0 text-center">
          <p className={cx('font-serif leading-none font-semibold tabular-nums', compact ? 'text-xl' : 'text-2xl')}>{date.getDate()}</p>
          <p className="mt-1 text-[11px] font-bold tracking-wide text-ink-faint uppercase">{date.toLocaleDateString(undefined, { weekday: 'short' })}</p>
        </div>
        <div className="min-w-0 flex-1">
          {renaming ? (
            <TitleField
              entry={entry}
              onDone={(title) => {
                setRenaming(false);
                if (title !== undefined && title !== (entry.title ?? '')) void updateEntry(entry.id, { title: title || undefined });
              }}
            />
          ) : (
            entry.title && <p className="truncate text-[15px] font-bold">{entry.title}</p>
          )}
          {first ? (
            <p lang={lang} className={cx('font-serif text-[16.5px] leading-snug', entry.title || renaming ? 'line-clamp-1 text-ink-soft' : 'line-clamp-2')}>
              {first}
            </p>
          ) : (
            <p className="text-[15px] text-ink-faint italic">{entry.prompt ? `“${entry.prompt}”` : translateUi('Not written yet')}</p>
          )}
          <p className="mt-1 text-[12.5px] text-ink-faint tabular-nums">
            {entry.words} {entry.words === 1 ? translateUi('word') : translateUi('words')}
            {review ? ` · ${review.corrections.length} ${review.corrections.length === 1 ? 'correction' : 'corrections'}` : ''}
            {review?.cefr ? ` · ${review.cefr}` : ''}
            {compact ? ` · ${date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}` : ''}
          </p>
        </div>
        {review ? (
          <Ring value={review.scores.overall / 100} size={compact ? 34 : 42} stroke={4} color={gradeColor(review.scores.overall)} label={translateUi('Grade {0}', [review.scores.overall])}>
            <span className="text-[12px] font-bold tabular-nums">{review.scores.overall}</span>
          </Ring>
        ) : (
          <ArrowRight size={16} className="shrink-0 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
        )}
      </Link>
      <Popover
        label={translateUi('Entry options')}
        placement="bottom-end"
        trigger={(props) => (
          <button
            type="button"
            {...props}
            ref={(el) => {
              more.current = el;
              assign(props.ref, el);
            }}
            aria-label={translateUi('Entry options')}
            className="mr-1 grid size-9 shrink-0 place-items-center rounded-xl text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 hover:bg-raised hover:text-ink focus-visible:opacity-100 aria-expanded:opacity-100"
          >
            <Ellipsis size={18} aria-hidden />
          </button>
        )}
      >
        {(close) => (
          <div className="w-52 p-1.5">
            <MenuItem
              icon={TextCursorInput}
              label={translateUi('Rename')}
              onClick={() => {
                close();
                setRenaming(true);
              }}
            />
            <MenuItem
              icon={Trash2}
              danger
              label={translateUi('Delete')}
              onClick={() => {
                close();
                deleteWithUndo(entry);
              }}
            />
          </div>
        )}
      </Popover>
    </div>
  );
}

/** A title typed in place on the row. */
function TitleField({ entry, onDone }: { entry: JournalEntry; onDone: (title?: string) => void }) {
  const translateUi = useUi();
  const [title, setTitle] = useState(entry.title ?? '');
  const done = useRef(false);
  const finish = (result?: string) => {
    if (done.current) return;
    done.current = true;
    onDone(result);
  };
  return (
    <input
      autoFocus
      value={title}
      placeholder={entry.prompt ?? translateUi('A title')}
      aria-label={translateUi('Title')}
      onClick={(e) => e.preventDefault()}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={() => finish(title.trim())}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          finish(title.trim());
        }
        if (e.key === 'Escape') finish();
      }}
      className="mb-1 w-full rounded-md bg-raised px-1.5 py-0.5 text-[15px] font-bold ring-2 ring-accent/40 outline-none"
    />
  );
}

// ---- The calendar -------------------------------------------------------------------------------------------

/** How dark a day is inked, by the words written that day. */
const ink = (words: number) => (words === 0 ? '' : words < 50 ? 'bg-sage/25' : words < 150 ? 'bg-sage/45' : words < 300 ? 'bg-sage/70' : 'bg-sage text-on-accent');

function Calendar({ entries, lang }: { entries: JournalEntry[]; lang: string }) {
  const translateUi = useUi();
  const navigate = useNavigate();
  const [month, setMonth] = useState(() => (entries[0]?.date ?? localDateKey()).slice(0, 7));
  const year = Number(month.slice(0, 4));
  const byDay = useMemo(() => {
    const out = new Map<string, JournalEntry[]>();
    for (const e of entries) {
      if (!out.has(e.date)) out.set(e.date, []);
      out.get(e.date)!.push(e);
    }
    return out;
  }, [entries]);
  const written = (key: string) => (byDay.get(key) ?? []).reduce((n, e) => n + e.words, 0);
  const monthsWritten = useMemo(() => new Set(entries.filter((e) => e.words > 0).map((e) => e.date.slice(0, 7))), [entries]);

  // The month's days in weeks from Monday.
  const first = new Date(`${month}-01T12:00:00`);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)];
  const today = localDateKey();
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(undefined, { weekday: 'narrow' }));

  const inMonth = entries.filter((e) => e.date.startsWith(month));
  const dayKeys = cells.filter((c): c is string => Boolean(c) && written(c!) > 0);
  let run = 0;
  let longest = 0;
  for (const c of cells) {
    if (!c) continue;
    run = written(c) > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  const stats: Array<[string, string]> = [
    ['Entries', String(inMonth.filter((e) => e.words > 0).length)],
    ['Words', inMonth.reduce((n, e) => n + e.words, 0).toLocaleString()],
    ['Days written', `${dayKeys.length} of ${days}`],
    ['Longest run', `${longest} ${longest === 1 ? 'day' : 'days'}`],
    ['Corrected', String(inMonth.reduce((n, e) => n + corrections(e), 0))],
  ];

  const shift = (by: number) => {
    const d = new Date(first.getFullYear(), first.getMonth() + by, 1, 12);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const open = (key: string) => {
    const list = byDay.get(key);
    if (list?.length) navigate(`/mentis/diarium/${list[0].id}`);
  };

  return (
    <div>
      {/* The year strip */}
      <div className="mb-5 flex items-center gap-1">
        <button type="button" aria-label={translateUi('Year before')} onClick={() => setMonth(`${year - 1}-12`)} className="grid size-8 place-items-center rounded-lg text-ink-soft hover:bg-surface hover:text-ink">
          <ChevronLeft size={16} aria-hidden />
        </button>
        <span className="w-12 text-center text-[13px] font-bold tabular-nums">{year}</span>
        <button type="button" aria-label={translateUi('Year after')} onClick={() => setMonth(`${year + 1}-01`)} className="grid size-8 place-items-center rounded-lg text-ink-soft hover:bg-surface hover:text-ink">
          <ChevronRight size={16} aria-hidden />
        </button>
        <div className="ml-2 grid flex-1 grid-cols-12 gap-1">
          {Array.from({ length: 12 }, (_, i) => {
            const key = `${year}-${String(i + 1).padStart(2, '0')}`;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setMonth(key)}
                aria-current={key === month ? 'date' : undefined}
                className={cx('relative h-8 rounded-lg text-[12px] font-semibold transition-colors', key === month ? 'bg-inverse text-on-inverse' : 'text-ink-soft hover:bg-surface hover:text-ink')}
              >
                {new Date(year, i, 1).toLocaleDateString(undefined, { month: 'short' })}
                {monthsWritten.has(key) && key !== month && <span aria-hidden className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-sage" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_240px]">
        <div>
          <div className="mb-3 flex items-center">
            <h3 className="mr-auto font-serif text-lg font-semibold">{monthName(month)}</h3>
            <button type="button" aria-label={translateUi('Month before')} onClick={() => shift(-1)} className="grid size-8 place-items-center rounded-lg text-ink-soft hover:bg-surface hover:text-ink">
              <ChevronLeft size={16} aria-hidden />
            </button>
            <button type="button" aria-label={translateUi('Month after')} onClick={() => shift(1)} className="grid size-8 place-items-center rounded-lg text-ink-soft hover:bg-surface hover:text-ink">
              <ChevronRight size={16} aria-hidden />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-y-2 text-center" role="grid" aria-label={monthName(month)}>
            {weekdays.map((d, i) => (
              <span key={i} className="pb-1 text-[11px] font-bold text-ink-faint uppercase">
                {d}
              </span>
            ))}
            {cells.map((key, i) => {
              if (!key) return <span key={`x${i}`} />;
              const words = written(key);
              const corrected = (byDay.get(key) ?? []).some((e) => e.review);
              // A line joins this day to the day before when both were written, within the week.
              const joined = words > 0 && i % 7 !== 0 && cells[i - 1] && written(cells[i - 1]!) > 0;
              const d = new Date(`${key}T12:00:00`);
              return (
                <div key={key} className="relative grid place-items-center">
                  {joined && <span aria-hidden className="absolute top-1/2 right-1/2 h-[3px] w-full -translate-y-1/2 bg-sage/40" />}
                  <button
                    type="button"
                    disabled={!byDay.has(key)}
                    onClick={() => open(key)}
                    aria-label={`${d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}${words ? `, ${words} words` : ''}${corrected ? ', corrected' : ''}`}
                    className={cx(
                      'relative grid size-11 place-items-center rounded-xl text-[14px] font-semibold tabular-nums transition-transform enabled:hover:scale-105',
                      words ? ink(words) : 'bg-surface text-ink-faint',
                      key === today && 'ring-2 ring-ink/70 ring-offset-2 ring-offset-bg',
                    )}
                  >
                    {d.getDate()}
                    {corrected && (
                      <span aria-hidden className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-raised text-sage-text shadow-elev-1">
                        <Check size={10} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-[12px] text-ink-faint"><UiText source={'Fewer words{0}More{1}'} values={[[20, 100, 200, 400].map((w) => (
              <span key={w} aria-hidden className={cx('size-3.5 rounded', ink(w))} />
            )), <span className="ml-3 inline-flex items-center gap-1"><UiText source={'{0} corrected'} values={[<Check size={12} className="text-sage-text" aria-hidden />]} /></span>]} /></p>
        </div>

        <aside className="space-y-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {stats.map(([label, value]) => (
              <div key={label}>
                <dd className="font-serif text-xl font-semibold tabular-nums">{value}</dd>
                <dt className="text-[11.5px] font-bold tracking-wide text-ink-faint uppercase">{label}</dt>
              </div>
            ))}
          </dl>
          {inMonth.length > 0 ? (
            <ul className="-mx-2 border-t border-line pt-2">
              {inMonth.map((e) => (
                <li key={e.id}>
                  <EntryRow entry={e} lang={lang} compact />
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-t border-line pt-3 text-[14px] text-ink-soft"><UiText source={'Nothing written this month.'} /></p>
          )}
        </aside>
      </div>
    </div>
  );
}

