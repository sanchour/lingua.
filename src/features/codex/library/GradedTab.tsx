import { UiText, useUi } from '@/design/i18n/UiText';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { GRADED_FILTER, MEASURED_LEVELS, READING_GENRES, SOURCE_QUERIES, gradedTexts } from '@/core/reading/graded';
import { refreshTextStats, updateText } from '@/data/library';
import type { Text } from '@/data/types';
import { Button, Card, SearchInput, Select } from '@/design/primitives';
import { gutenbergBooks, importGutenberg, importWikisource, wikisourceSearch } from '@/services/discover/discover';
import type { FreeBook, SourceWork } from '@/services/discover/discover';
import { toast } from '@/state/ui';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/data/db';

export function GradedTab({ lang, texts }: { lang: string; texts: Text[] }) {
  const translateUi = useUi();
  const [filter, setFilter] = useState(GRADED_FILTER);
  const hasWordData = Boolean(useLiveQuery(async () => Boolean(await db.frequency.where('[lang+rank]').between([lang, 0], [lang, Infinity]).first()), [lang]));
  const shown = useMemo(() => gradedTexts(texts, lang, filter, hasWordData), [texts, lang, filter, hasWordData]);
  return <div className="space-y-8">
    <header><h2 className="font-serif text-2xl font-semibold"><UiText source={'Your graded shelf'} /></h2><p className="mt-2 max-w-3xl text-sm text-ink-soft"><UiText source={'Your texts, ordered by the level measured from their word frequency. This is an estimate, separate from a level you assigned. Short texts or missing word data can remain unmeasured. Familiar share includes words marked Known or Learning.'} /></p></header>
    {!hasWordData && <p className="text-sm text-ink-faint"><UiText source={'Install this language’s word pack in Settings to measure reading levels. Familiarity still comes from your own word memory.'} /></p>}
    <div className="grid grid-cols-[minmax(180px,2fr)_repeat(4,minmax(120px,1fr))] items-end gap-3">
      <SearchInput placeholder={translateUi('Topic, title or author')} value={filter.query} onChange={(query) => setFilter({ ...filter, query })} />
      <Select label={translateUi('Kind')} value={filter.genre} onChange={(genre) => setFilter({ ...filter, genre })} options={[{ value: '', label: translateUi('All kinds') }, ...READING_GENRES.map((value) => ({ value, label: translateUi(value) }))]} />
      <Select label={translateUi('Measured level')} value={filter.level} onChange={(level) => setFilter({ ...filter, level })} options={[{ value: '', label: translateUi('All levels') }, ...MEASURED_LEVELS.map((value) => ({ value, label: translateUi(value) })), { value: 'unknown', label: translateUi('Unmeasured') }]} />
      <Select label={translateUi('Length')} value={String(filter.maxWords)} onChange={(max) => setFilter({ ...filter, maxWords: Number(max) })} options={[{ value: '0', label: translateUi('Any length') }, { value: '500', label: translateUi('≤ 500 words') }, { value: '2000', label: translateUi('≤ 2,000 words') }, { value: '10000', label: translateUi('≤ 10,000 words') }]} />
      <Select label={translateUi('Familiar words')} value={String(filter.minKnown)} onChange={(min) => setFilter({ ...filter, minKnown: Number(min) })} options={[{ value: '0', label: translateUi('Any share') }, { value: '0.5', label: translateUi('At least 50%') }, { value: '0.8', label: translateUi('At least 80%') }, { value: '0.95', label: translateUi('At least 95%') }]} />
    </div>
    <p className="text-sm text-ink-faint" role="status">{shown.length} {shown.length === 1 ? translateUi('text matches') : translateUi('texts match')}.</p>
    <div className="grid grid-cols-2 gap-5">{shown.map((text) => <Card key={text.id} className="p-5">
      <p className="text-xs font-semibold text-sage-text"><UiText source={'Measured {0} · {1} words · {2}'} values={[(hasWordData ? text.stats?.level : undefined) ?? <UiText source={'— unmeasured'} />, text.wordCount.toLocaleString(), text.stats ? `${Math.round(text.stats.knownShare * 100)}% familiar` : <UiText source={'familiarity unmeasured'} />]} /></p>
      <Link to={`/codex/read/${text.id}`} lang={lang} className="mt-2 block font-serif text-xl font-semibold text-accent-text">{text.title}</Link>
      <p className="mt-2 text-sm text-ink-soft">{text.readingTopic || translateUi('No topic yet')} · {text.readingGenre || translateUi('kind not assigned')}</p>
      <TextLabels text={text} />
    </Card>)}</div>
    {!shown.length && <p className="rounded-xl bg-surface p-5 text-ink-soft"><UiText source={'No texts match. Adjust the filters, add a text, or find an open edition below.'} /></p>}
    <OpenSources key={lang} lang={lang} texts={texts} />
  </div>;
}
function TextLabels({ text }: { text: Text }) {
  const translateUi = useUi();
  const [topic, setTopic] = useState(text.readingTopic ?? '');
  const [genre, setGenre] = useState(text.readingGenre ?? 'other');
  return <details className="mt-4 border-t border-line pt-3"><summary className="cursor-pointer text-sm font-semibold"><UiText source={'Topic and kind'} /></summary>
    <form className="mt-3 space-y-3" onSubmit={(e) => { e.preventDefault(); void updateText(text.id, { readingTopic: topic.trim(), readingGenre: genre }).then(() => toast('Text labels saved.')).catch(() => toast('Could not save the text labels.', { tone: 'error' })); }}>
      <label className="block text-sm"><UiText source={'Topic{0}'} values={[<input className="mt-1 w-full rounded-xl border border-line bg-raised p-2" maxLength={80} value={topic} onChange={(e) => setTopic(e.target.value)} />]} /></label>
      <Select label={translateUi('Text kind')} value={genre} onChange={setGenre} options={READING_GENRES.map((value) => ({ value, label: translateUi(value) }))} />
      <Button size="sm" variant="secondary" type="submit"><UiText source={'Save labels'} /></Button>
    </form>
  </details>;
}

type Result = SourceWork & { book?: FreeBook };
function OpenSources({ lang, texts }: { lang: string; texts: Text[] }) {
  const translateUi = useUi();
  const navigate = useNavigate();
  const [source, setSource] = useState('wikisource');
  const [genre, setGenre] = useState('fable');
  const [query, setQuery] = useState(SOURCE_QUERIES[lang]?.[1] ?? 'fable');
  const [items, setItems] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const search = async () => {
    if (!query.trim()) return;
    setBusy(true); setError(''); setItems([]); setSearched(true);
    try { setItems(source === 'wikisource' ? await wikisourceSearch(lang, query) : (await gutenbergBooks(lang, query)).map((book) => ({ title: book.title, snippet: book.author ?? '', url: book.url, book }))); }
    catch (e) { setError(e instanceof Error ? e.message : 'The source could not be reached.'); }
    finally { setBusy(false); }
  };
  const add = async (item: Result) => {
    const existing = texts.find((t) => t.sourceUrl === item.url && !t.deletedAt);
    if (existing) return navigate(`/codex/read/${existing.id}`);
    setAdding(item.url); setError('');
    try {
      const id = item.book ? await importGutenberg(lang, item.book) : await importWikisource(lang, item);
      await updateText(id, { readingGenre: genre });
      await refreshTextStats(id);
      navigate(`/codex/read/${id}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'The edition could not be added.'); }
    finally { setAdding(null); }
  };
  return <section className="space-y-4 border-t border-line pt-6" aria-label={translateUi('Open reading sources')}>
    <h2 className="font-serif text-2xl font-semibold"><UiText source={'Find an open edition'} /></h2>
    <p className="max-w-3xl text-sm text-ink-soft"><UiText source={'Search Wikisource or Project Gutenberg in the active language. Fables, poems, stories, speeches and other kinds are search starting points; check the edition and its licence at the source. Results are not graded until added and measured on this device. Nothing is searched or imported automatically.'} /></p>
    <form onSubmit={(e) => { e.preventDefault(); void search(); }}><fieldset disabled={busy || Boolean(adding)} className="grid grid-cols-[180px_180px_minmax(0,1fr)_auto] items-end gap-3">
      <Select label={translateUi('Source')} value={source} onChange={(value) => { setSource(value); setItems([]); setSearched(false); }} options={[{ value: 'wikisource', label: translateUi('Wikisource') }, { value: 'gutenberg', label: translateUi('Project Gutenberg') }]} />
      <Select label={translateUi('Search kind')} value={genre} onChange={(value) => { setGenre(value); setQuery(SOURCE_QUERIES[lang]?.[READING_GENRES.indexOf(value as typeof READING_GENRES[number])] ?? value); }} options={READING_GENRES.map((value) => ({ value, label: translateUi(value) }))} />
      <label className="text-sm font-semibold"><UiText source={'Source search{0}'} values={[<input className="mt-2 h-11 w-full rounded-xl border border-line bg-raised px-3 font-normal" value={query} onChange={(e) => setQuery(e.target.value)} />]} /></label>
      <Button type="submit" loading={busy} disabled={!query.trim()}><UiText source={'Search source'} /></Button>
    </fieldset></form>
    {error && <p role="alert" className="rounded-xl bg-surface p-4 text-sm text-ink-soft"><UiText source={error ?? ''} /></p>}
    {searched && !busy && !error && !items.length && <p className="text-sm text-ink-faint"><UiText source={'No editions found for this search.'} /></p>}
    <div className="grid grid-cols-2 gap-4">{items.map((item) => <Card key={item.url} className="p-4">
      <h3 lang={lang} className="font-serif text-lg font-semibold">{item.title}</h3><p className="mt-2 text-sm text-ink-soft">{item.snippet}</p>
      <div className="mt-3 flex items-center gap-3"><a className="text-sm font-semibold text-accent-text" href={item.url} target="_blank" rel="noopener noreferrer"><UiText source={'Edition and licence ↗'} /></a><Button size="sm" variant="secondary" disabled={Boolean(adding)} loading={adding === item.url} onClick={() => void add(item)}>{texts.some((t) => t.sourceUrl === item.url) ? translateUi('Open from library') : translateUi('Add this edition')}</Button></div>
    </Card>)}</div>
  </section>;
}
