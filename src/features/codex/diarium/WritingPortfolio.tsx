import { UiText, useUi } from '@/design/i18n/UiText';
import { useState } from 'react';
import { Link } from 'react-router';
import { writingMeasures } from '@/core/journal/measures';
import { WRITING_TASKS } from '@/core/journal/tasks';
import type { JournalEntry } from '@/data/types';
import { Select, SearchInput } from '@/design/primitives';

export function WritingPortfolio({ entries }: { entries: JournalEntry[] }) {
  const translateUi = useUi();
  const [level, setLevel] = useState('all');
  const [query, setQuery] = useState('');
  const portfolio = entries.filter((e) => e.portfolio && !e.deletedAt);
  const shown = portfolio.filter((e) => (level === 'all' || e.portfolio!.level === level) && `${e.portfolio!.topic} ${WRITING_TASKS.find((t) => t.id === e.writingTaskId)?.title ?? 'Free entry'}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return (
    <details className="rounded-xl border border-line p-5">
      <summary className="cursor-pointer font-serif text-xl font-semibold"><UiText source={'Your writing portfolio · {0}'} values={[portfolio.length]} /></summary>
      <p className="mt-3 text-sm text-ink-soft"><UiText source={'Keep your best pieces from an entry’s portfolio controls. Levels are the study level you chose when keeping the piece, not an assessment.'} /></p>
      <div className="my-4 grid grid-cols-[180px_1fr] gap-4">
        <Select label={translateUi('Portfolio level')} value={level} onChange={setLevel} options={[{ value: 'all', label: translateUi('All levels') }, ...['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((value) => ({ value, label: value }))]} />
        <SearchInput placeholder={translateUi('Search portfolio topic or kind')} value={query} onChange={setQuery} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only"><UiText source={'Writing pieces over time, newest first'} /></caption>
          <thead><tr>{['Date / piece', 'Level', 'Topic / kind', 'Words', 'Diversity', 'Words / sentence'].map((h) => <th scope="col" key={h} className="p-2 text-xs text-ink-faint">{h}</th>)}</tr></thead>
          <tbody>{shown.map((e) => {
            const m = writingMeasures(e.text, e.lang);
            return <tr key={e.id} className="border-t border-line"><td className="p-2"><Link className="font-semibold text-accent-text" to={`/mentis/diarium/${e.id}`}>{e.date} · {e.title || WRITING_TASKS.find((t) => t.id === e.writingTaskId)?.title || 'Free entry'}</Link></td><td className="p-2">{e.portfolio!.level}</td><td className="p-2">{e.portfolio!.topic || 'No topic'} · {e.writingTaskId || 'free'}</td><td className="p-2">{m.words}</td><td className="p-2">{Math.round(m.diversity * 100)}%</td><td className="p-2">{m.averageLength.toFixed(1)}</td></tr>;
          })}</tbody>
        </table>
      </div>
      {!shown.length && <p className="mt-3 text-sm text-ink-faint"><UiText source={'No kept pieces match yet.'} /></p>}
      <p className="mt-3 text-xs text-ink-faint"><UiText source={'Measures describe your current draft; compare similar lengths. Editing a kept piece updates its measures.'} /></p>
    </details>
  );
}
