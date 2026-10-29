import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useParams } from 'react-router';
import { useApp } from '@/app/context';
import { BackLink } from '@/app/BackLink';
import { PageHeader } from '@/app/PageHeader';
import type { GeneratedRow } from '@/core/contracts/db';
import type { StoryBody } from '@/core/generate/generate';
import { CEFR_LEVELS } from '@/core/lang/levels';
import type { Cefr } from '@/core/lang/levels';
import { parallelSource, simplificationRequest } from '@/core/reading/parallel';
import { getChapter, useText } from '@/data/library';
import { saveReadingParallel } from '@/data/readingParallel';
import { aiBlock } from '@/data/plan';
import { Button, Select } from '@/design/primitives';
import { GeneratedLabel } from '@/features/generated/GeneratedLabel';
import { generateMaterial } from '@/services/llm/generate';

export function ParallelColumns({ source, lang, other, otherLang, title }: { source: string; lang: string; other: string; otherLang: string; title: string }) {
  return <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-8">
    <section aria-label="Original passage" className="rounded-2xl border border-line bg-raised p-6"><h2 className="mb-4 font-semibold">Original passage</h2><p lang={lang} className="whitespace-pre-wrap break-words font-serif text-xl leading-relaxed">{source}</p></section>
    <section aria-label={title} className="rounded-2xl border border-line bg-raised p-6"><h2 className="mb-4 font-semibold">{title}</h2><p lang={otherLang} className="whitespace-pre-wrap break-words font-serif text-xl leading-relaxed">{other || 'No version yet. Use the controls below to add one.'}</p></section>
  </div>;
}

export default function ParallelReading() {
  const { textId, chapterIndex } = useParams();
  const text = useText(textId);
  const index = Number(chapterIndex) || 0;
  const chapter = useLiveQuery(async () => textId ? (await getChapter(textId, index)) ?? null : null, [textId, index]);
  const { settings } = useApp();
  const [mode, setMode] = useState<'parallel' | 'simplified'>('parallel');
  const [draft, setDraft] = useState('');
  const [native, setNative] = useState('en');
  const [level, setLevel] = useState<Cefr>('A1');
  const [row, setRow] = useState<GeneratedRow | null>(null);
  const [translated, setTranslated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const requestId = useRef(0);
  const source = chapter ? parallelSource(chapter) : '';
  const saved = text?.readingParallel?.find((p) => p.chapterIndex === index && p.source === source);
  useEffect(() => { setDraft(saved?.text ?? ''); setNative(saved?.lang ?? 'en'); }, [saved?.text, saved?.lang, textId, index]);
  useEffect(() => { requestId.current++; setRow(null); setBusy(false); setMessage(''); }, [source, textId, level, native]);
  useEffect(() => () => { requestId.current++; }, []);
  const block = aiBlock(settings, settings.llm.provider);
  if (text === null || chapter === null) return <p>This chapter is no longer in your library.</p>;
  if (!text || !chapter) return <p role="status">Loading the chapter…</p>;
  const make = async () => {
    const id = ++requestId.current;
    setBusy(true); setMessage('');
    try {
      const result = await generateMaterial(simplificationRequest(text.lang, source, level, native));
      if (requestId.current === id) { setRow(result.row); setTranslated(false); }
    } catch (e) { if (requestId.current === id) setMessage(e instanceof Error ? e.message : 'Could not simplify this passage.'); }
    finally { if (requestId.current === id) setBusy(false); }
  };
  const save = async () => {
    setSaving(true); setMessage('');
    try { await saveReadingParallel(text.id, { chapterIndex: index, source, text: draft, lang: native }); setMessage('Parallel text saved with this chapter.'); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Could not save the parallel text.'); }
    finally { setSaving(false); }
  };
  const body = row?.content as StoryBody | undefined;
  const other = mode === 'parallel' ? saved?.text ?? '' : body ? translated ? body.translation : body.text : '';
  return <>
    <BackLink to={`/codex/read/${text.id}`}>Back to reading</BackLink>
    <PageHeader title="Read side by side" />
    <p className="mb-5 text-sm text-ink-soft">{text.title} · chapter {index + 1}. {source.length.toLocaleString()} characters; long chapters show only the first 4,000. Columns are independent texts, not sentence-aligned translations.</p>
    <div className="mb-5 flex gap-2" role="group" aria-label="Side-by-side reading mode">
      <Button variant={mode === 'parallel' ? 'primary' : 'secondary'} onClick={() => setMode('parallel')} aria-pressed={mode === 'parallel'}>My parallel text</Button>
      <Button variant={mode === 'simplified' ? 'primary' : 'secondary'} onClick={() => setMode('simplified')} aria-pressed={mode === 'simplified'}>Simplified by Max</Button>
    </div>
    {mode === 'simplified' && row && <div className="mb-4 flex flex-wrap items-center gap-4"><GeneratedLabel row={row} onReported={() => setRow(null)} /><span className="text-sm text-ink-soft">Requested {row.level} · facts and translation not verified</span><label className="flex gap-2 text-sm"><input type="checkbox" checked={translated} onChange={(e) => setTranslated(e.target.checked)} />Show its translation instead</label></div>}
    <ParallelColumns source={source} lang={text.lang} other={other} otherLang={mode === 'parallel' ? saved?.lang ?? native : translated ? native : text.lang} title={mode === 'parallel' ? 'Your parallel text' : translated ? 'Translation of the simplified version · Max' : 'Simplified version · Max'} />
    <div className="mt-6 max-w-3xl space-y-4 pb-10">
      {mode === 'parallel' ? <>
        <h2 className="font-semibold">Add your own translation or another version</h2>
        <p className="text-sm text-ink-soft">Paste text you have permission to use. It stays on this device with the source excerpt and is not sent to AI. Saving replaces the parallel text for this chapter; a changed source is never silently matched to an old translation.</p>
        <fieldset disabled={saving} className="space-y-4">
        <label className="block text-sm">Language code for the parallel text<input maxLength={35} value={native} onChange={(e) => setNative(e.target.value)} placeholder="en" className="ml-3 w-24 rounded-lg border border-line bg-raised p-2" /></label>
        <label className="block text-sm">Parallel text<textarea maxLength={4000} rows={5} value={draft} onChange={(e) => setDraft(e.target.value)} className="mt-2 w-full rounded-xl border border-line bg-raised p-3 text-base" /></label>
        </fieldset>
        <Button disabled={!draft.trim()} loading={saving} onClick={() => void save()}>Save parallel text</Button>
        {text.readingParallel?.some((p) => p.chapterIndex === index && p.source !== source) && <p className="text-sm text-ink-soft">An older parallel text belongs to a different source excerpt and is not displayed.</p>}
      </> : <>
        <h2 className="font-semibold">An easier version beside the original</h2>
        <p className="text-sm text-ink-soft">Needs Max and a key in Settings › AI. Only the displayed excerpt is sent to your provider when you ask. Results are cached on this device; use Report if Max changes a fact. Vocabulary and level checks depend on installed word data.</p>
        <fieldset disabled={busy} className="flex items-end gap-4"><Select label="Target level" value={level} onChange={(v) => setLevel(v as Cefr)} options={CEFR_LEVELS.map((v) => ({ value: v, label: v }))} /><label className="block text-sm">Translation language code<input maxLength={35} value={native} onChange={(e) => setNative(e.target.value)} className="mt-2 block w-24 rounded-lg border border-line bg-raised p-2" /></label></fieldset>
        <Button disabled={Boolean(block) || source.length < 40 || !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(native)} loading={busy} onClick={() => void make()}>Simplify this passage</Button>
      </>}
      {message && <p role="status" className="text-sm">{message}</p>}
    </div>
  </>;
}
