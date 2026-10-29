import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CULTURE_TOPICS, cultureNotes, wordCulture } from '@/core/culture/notes';
import type { CultureNote } from '@/core/culture/notes';
import { isRtl } from '@/core/lang/languages';
import { recordingPage, recordingUrl, speakerOf } from '@/core/audio/recordings';
import type { SoundsRecording } from '@/core/audio/recordings';
import { Button, SearchInput, Select } from '@/design/primitives';
import { AddToDeck } from '@/features/codex/reader/AddToDeck';
import { SpeakButton } from '@/features/speech/SpeakButton';
import { recordingsForWord } from '@/services/speech/recordings';

export function CultureShelf({ lang }: { lang: string }) {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('');
  const [params, setParams] = useSearchParams();
  const notes = cultureNotes(lang, query, topic);
  const current = notes.find((n) => n.id === params.get('note')) ?? notes[0];
  return <section aria-label="Culture shelf">
    <h2 className="font-serif text-2xl font-semibold">Culture, in words</h2>
    <p className="mt-2 text-sm text-ink-soft">Sourced notes and original examples for the six core languages. Usage varies by region, relationship and person; each note says which setting it describes.</p>
    <div className="my-5 grid grid-cols-2 gap-3"><SearchInput value={query} onChange={setQuery} placeholder="Find a word, custom or place" /><Select label="Culture topic" value={topic} onChange={setTopic} options={[{ value: '', label: 'Every topic' }, ...CULTURE_TOPICS.map((t) => ({ value: t, label: t }))]} /></div>
    <p className="mb-3 text-xs text-ink-faint">{notes.length} {notes.length === 1 ? 'note' : 'notes'}</p>
    {current ? <div className="grid grid-cols-[13rem_minmax(0,1fr)] items-start gap-5">
      <nav aria-label="Culture notes" className="max-h-[65dvh] space-y-2 overflow-y-auto pr-1">{notes.map((n) => <button key={n.id} type="button" aria-current={current.id === n.id ? 'true' : undefined} onClick={() => { const next = new URLSearchParams(params); next.set('note', n.id); setParams(next, { replace: true }); }} className={`block w-full rounded-xl border p-3 text-left ${n.id === current.id ? 'border-ink bg-surface' : 'border-line bg-raised hover:bg-surface'}`}><span lang={lang} dir={isRtl(lang) ? 'rtl' : undefined} className="block break-words font-serif text-lg font-semibold">{n.term}</span><span className="mt-1 block text-xs text-ink-soft">{n.meaning}</span></button>)}</nav>
      <CultureNoteView key={current.id} note={current} />
    </div> : <p className="rounded-xl border border-line p-5 text-sm text-ink-soft">No matching culture note. Try another topic or word. This shelf currently covers Spanish, French, German, Russian, Mandarin and Arabic.</p>}
  </section>;
}
export function CultureNoteView({ note }: { note: CultureNote }) {
  return <article className="min-w-0 space-y-4 rounded-2xl border border-line bg-raised p-5">
    <header><p className="text-xs text-ink-faint">{note.region}</p><h3 lang={note.lang} dir={isRtl(note.lang) ? 'rtl' : undefined} className="mt-2 break-words font-serif text-2xl font-semibold">{note.term}</h3><p className="mt-1 text-sm font-semibold">{note.meaning}</p></header>
    <p className="text-sm leading-relaxed">{note.note}</p>
    <div className="rounded-xl bg-surface p-4"><p lang={note.lang} dir={isRtl(note.lang) ? 'rtl' : undefined} className="font-serif text-lg">{note.example} <SpeakButton lang={note.lang} text={note.example} /></p><p className="mt-2 text-sm text-ink-soft">{note.translation}</p></div>
    {note.scene && <section className="space-y-2 border-t border-line pt-4"><h4 className="text-sm font-semibold">A moment to try</h4><p className="text-sm">{note.scene.situation}</p><p lang={note.lang} dir={isRtl(note.lang) ? 'rtl' : undefined} className="font-serif text-lg">{note.scene.response}</p><p className="text-sm text-ink-soft">{note.scene.meaning}</p></section>}
    <a href={note.source.url} target="_blank" rel="noopener noreferrer" className="block text-xs text-ink-soft underline underline-offset-4">Source: {note.source.title}</a>
    <p className="text-xs text-ink-faint">Explanation and example written for Lingua; source consulted 29 October 2026.</p>
    <AddToDeck key={note.id} lang={note.lang} note={{ term: note.term, meaning: note.meaning, source: 'manual', extra: { Culture: note.note, Source: `${note.source.title} · ${note.source.url}` }, context: { sentence: note.example } }} />
    <RegionalSamples lang={note.lang} initialWord={note.words[0]} />
  </article>;
}
export function CultureWordNotes({ lang, word }: { lang: string; word: string }) {
  const notes = wordCulture(lang, word);
  if (!notes.length) return null;
  return <section className="space-y-2 border-t border-line pt-4" aria-label="Culture notes for this word"><h3 className="text-sm font-semibold">Culture and usage</h3>{notes.map((n) => <Link key={n.id} to={`/mentis/culture?note=${n.id}`} className="block text-sm underline decoration-line-strong underline-offset-4"><span lang={lang}>{n.term}</span> · {n.meaning}</Link>)}</section>;
}
function RegionalSamples({ lang, initialWord }: { lang: string; initialWord: string }) {
  const [word, setWord] = useState(initialWord);
  const [samples, setSamples] = useState<SoundsRecording[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const find = async () => {
    setBusy(true); setError('');
    try { setSamples(await recordingsForWord(lang, word)); }
    catch { setError('The recording index could not be read. Try again when connected.'); }
    finally { setBusy(false); }
  };
  return <section className="space-y-3 border-t border-line pt-4" aria-label="Regional recordings">
    <h4 className="text-sm font-semibold">Regional voices</h4><p className="text-xs text-ink-soft">Find Lingua Libre and Wiktionary clips with a region recorded in this language’s bundled index. Playing a clip streams it from Wikimedia Commons; its speaker and licence are on the source page. Availability depends on the word.</p>
    <form onSubmit={(e) => { e.preventDefault(); void find(); }} className="flex flex-wrap gap-2"><label className="min-w-0 flex-1 text-xs">Recording word<input disabled={busy} value={word} maxLength={40} onChange={(e) => { setWord(e.target.value); setSamples(null); }} className="mt-1 w-full rounded-lg border border-line bg-bg p-2 text-sm" /></label><Button type="submit" size="sm" variant="secondary" loading={busy} disabled={!word.trim()}>Find recordings</Button></form>
    {samples?.length === 0 && <p role="status" className="text-xs text-ink-soft">No region-labelled clip found for this word. Try another word; an unlabelled clip is not presented as a dialect sample.</p>}
    {samples?.map((sample) => <div key={sample[1]} className="space-y-2 rounded-xl bg-surface p-3"><p className="text-xs">{sample[2]} · {speakerOf(sample) ?? 'Wiktionary recording'}</p><audio controls preload="none" src={recordingUrl(sample)} className="h-9 max-w-full" aria-label={`${word} · ${sample[2]}`} /><a href={recordingPage(sample)} target="_blank" rel="noopener noreferrer" className="block text-xs underline">Recording source and licence</a></div>)}
    {error && <p role="alert" className="text-xs text-accent-text">{error}</p>}
  </section>;
}
