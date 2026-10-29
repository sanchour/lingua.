import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useParams } from 'react-router';
import { useApp } from '@/app/context';
import { BackLink } from '@/app/BackLink';
import { PageHeader } from '@/app/PageHeader';
import type { DragBody, ExerciseSpec, MatchBody } from '@/core/contracts/exercise';
import type { Outcome } from '@/core/contracts/learner';
import { judge, solutionOf } from '@/core/exercise';
import { readingSpec, selfReadingSpecs, READING_LABELS } from '@/core/exercise/reading';
import { getChapter, useText } from '@/data/library';
import { recordEvidence } from '@/data/learner';
import { aiBlock } from '@/data/plan';
import { Button } from '@/design/primitives';
import { DragView } from '@/features/exercise/DragView';
import { MatchView } from '@/features/exercise/MatchView';
import { TypedView } from '@/features/exercise/TypedView';
import type { Phase } from '@/features/lesson/kit';
import { judgeReading, readingQuestions } from '@/services/llm/readingQuestions';

export default function ReadingPractice() {
  const { textId, chapterIndex } = useParams();
  const text = useText(textId);
  const chapter = useLiveQuery(async () => textId ? (await getChapter(textId, Number(chapterIndex) || 0)) ?? null : null, [textId, chapterIndex]);
  const { settings } = useApp();
  const [specs, setSpecs] = useState<ExerciseSpec[] | null>(null);
  const [generated, setGenerated] = useState(false);
  const [judgeWithMax, setJudgeWithMax] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [coverage, setCoverage] = useState('');
  const [run, setRun] = useState(0);
  const source = (chapter?.blocks ?? []).flatMap((b) => 'text' in b ? [b.text] : []).join('\n\n').slice(0, 6000);
  const block = aiBlock(settings, settings.llm.provider);
  if (text === null || chapter === null) return <p>This chapter is no longer in your library.</p>;
  if (!text || !chapter) return <p role="status">Loading the chapter…</p>;
  const make = async () => {
    setBusy(true); setError('');
    try {
      const questions = await readingQuestions(text.lang, source);
      setCoverage([...new Set(questions.map((q) => READING_LABELS[q.kind]))].join(' · '));
      setSpecs(questions.map((q, i) => readingSpec(text.lang, text.id, q, i, judgeWithMax ? 'ai' : 'self')));
      setGenerated(true); setRun((n) => n + 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not make questions.'); }
    finally { setBusy(false); }
  };
  return <>
    <BackLink to={`/codex/read/${text.id}`}>Back to reading</BackLink>
    <PageHeader title="Check understanding" />
    <p className="mb-5 text-sm text-ink-soft">{text.title} · chapter {(Number(chapterIndex) || 0) + 1}. The passage stays beside your answers.</p>
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-8">
      <section aria-label="Source passage" className="sticky top-6 max-h-[78dvh] overflow-y-auto rounded-2xl border border-line bg-raised p-6">
        <h2 className="mb-3 font-semibold">Source passage</h2>
        <p className="whitespace-pre-wrap font-serif text-lg leading-relaxed" lang={text.lang}>{source}</p>
        <p className="mt-4 text-xs text-ink-faint">{source.length.toLocaleString()} characters. Long chapters use only the first 6,000 here; the rest is not assessed.</p>
      </section>
      <section aria-label="Reading exercises" className="space-y-5 pb-10">
        {!specs ? <>
          <h2 className="font-serif text-2xl font-semibold">Read, then put it in your own words</h2>
          <p className="text-sm text-ink-soft">Four free prompts: the main idea, a title, a word in context and a short answer. You check against the passage with a guide; these are not automatically graded.</p>
          <Button disabled={source.length < 40} onClick={() => { setGenerated(false); setSpecs(selfReadingSpecs(text.lang, text.id)); setRun((n) => n + 1); }}>Start self-check</Button>
          <div className="space-y-3 border-t border-line pt-5">
            <h3 className="font-semibold">Questions from Max</h3>
            <p className="text-sm text-ink-soft">Main idea, true or false, events in order, a title, meaning in context, headings to paragraphs, an unrelated sentence and a short answer. Max can omit a kind that the passage does not support.</p>
            <p className="text-xs text-ink-faint">Generated interpretations can be wrong. Only format and exact source quotes are checked. The passage above is sent to your AI provider when you ask.</p>
            <label className="flex gap-2 text-sm"><input type="checkbox" disabled={Boolean(block)} checked={judgeWithMax} onChange={(e) => setJudgeWithMax(e.target.checked)} />Ask Max to judge free answers; otherwise rate them yourself</label>
            {block && <p className="text-sm text-ink-soft">Needs Max and a key in Settings › AI.</p>}
            <Button variant="secondary" disabled={Boolean(block) || source.length < 40} loading={busy} onClick={() => void make()}>Make comprehension questions</Button>
          </div>
        </> : <>
          <p className="text-xs text-ink-faint">{generated ? `Generated by Max · format and source quotes checked; meaning not verified. ${coverage}` : 'Offline self-check · your own rating, with a guide'}</p>
          <ReadingRun key={run} specs={specs} source={source} guides={!generated} onDone={() => setSpecs(null)} />
          {generated && <Button variant="ghost" size="sm" onClick={() => { setSpecs(null); setError('Questions discarded. You can use the offline self-check instead.'); }}>Discard incorrect questions</Button>}
        </>}
        {error && <p role="alert" className="text-sm text-accent-text">{error}</p>}
      </section>
    </div>
  </>;
}

export function ReadingRun({ specs, source, guides, onDone }: { specs: ExerciseSpec[]; source: string; guides: boolean; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState('');
  const [picked, setPicked] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>('answer');
  const [rating, setRating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [count, setCount] = useState(0);
  const [failed, setFailed] = useState<{ outcome: Outcome; given: string; note: string } | null>(null);
  const locked = useRef(false);
  const runId = useRef(crypto.randomUUID());
  const spec = specs[index];
  const match = spec?.kind.startsWith('match-');
  const tiles = spec?.kind === 'drag-drop' ? (spec.body as DragBody).tiles : [];
  const settle = async (outcome: Outcome, given = value, note = '') => {
    if (locked.current || phase !== 'answer') return;
    locked.current = true; setBusy(true);
    try {
      await recordEvidence({ id: `${runId.current}:${index}`, lang: spec.lang, at: Date.now(), skill: 'reading', room: 'codex', item: spec.trains.item, outcome, assisted: rating, given: given.slice(0, 200), expected: guides ? undefined : solutionOf(spec).slice(0, 200), kind: spec.kind, contextId: spec.key });
      setFailed(null); setPhase(outcome === 'wrong' ? 'wrong' : 'right'); setRating(false); setMessage(note); setCount((n) => n + 1);
    } catch { locked.current = false; setFailed({ outcome, given, note }); setMessage('The answer could not be saved. Try again before continuing.'); }
    finally { setBusy(false); }
  };
  const check = async () => {
    if (busy || locked.current || rating) return;
    if (spec.check.rule === 'self') return setRating(true);
    if (spec.check.rule === 'ai') {
      setBusy(true); setMessage('');
      try { const result = await judgeReading(spec, source, value); await settle(result.verdict === 'good' ? 'right' : result.verdict === 'partly' ? 'close' : 'wrong', value, `Max: ${result.explanation}`); }
      catch (e) { setRating(true); setMessage(`${e instanceof Error ? e.message : 'Max could not be reached.'} Rate your answer yourself.`); }
      finally { setBusy(false); }
      return;
    }
    await settle(judge(spec.check, spec.kind === 'drag-drop' ? picked.map((i) => tiles[i]) : value, spec.lang).outcome, spec.kind === 'drag-drop' ? picked.map((i) => tiles[i]).join(' → ') : value);
  };
  if (!spec) return <div className="space-y-4"><h2 className="font-serif text-2xl">{count} answers kept in your reading record</h2><p className="text-sm">Self-ratings and Max’s opinions are learning evidence, not an exam score.</p><Button onClick={onDone}>Done</Button></div>;
  return <div className="space-y-5">
    <p className="text-xs text-ink-faint">{index + 1} / {specs.length}</p>
    <h2 className="font-semibold">{guides ? spec.instruction.split(':')[0] : spec.instruction.split(' · ')[0]}</h2>
    <fieldset className="min-w-0" disabled={busy || rating || phase !== 'answer'}>
    {match ? <MatchView key={spec.key} body={spec.body as MatchBody} lang={spec.lang} random={Math.random} onDone={(mistakes) => void settle(mistakes ? 'close' : 'right', `${mistakes} slips`)} /> : spec.kind === 'drag-drop' ? <DragView prompt={(spec.body as DragBody).prompt} tiles={tiles} lang={spec.lang} value={picked} onChange={setPicked} phase={phase} /> : <TypedView spec={spec} lang={spec.lang} value={value} onChange={(v) => setValue(v.slice(0, 4000))} phase={phase} onSubmit={() => void check()} />}
    </fieldset>
    {rating && <div className="space-y-3 rounded-2xl bg-surface p-4">
      <h3 className="font-semibold">{guides ? 'Self-check guide' : 'Max’s model answer · other valid answers are possible'}</h3>
      <p className="whitespace-pre-wrap">{solutionOf(spec)}</p>
      {spec.feedback?.why && <p className="whitespace-pre-wrap text-sm">{spec.feedback.why}</p>}
      <p className="text-sm">How well does your answer fit the passage?</p>
      <div className="flex flex-wrap gap-2">{([['Yes', 'right'], ['Nearly', 'close'], ['Not yet', 'wrong']] as const).map(([label, outcome]) => <Button key={outcome} size="sm" variant="secondary" disabled={busy} onClick={() => void settle(outcome)}>{label}</Button>)}</div>
    </div>}
    {phase === 'answer' && !match && !rating && <Button loading={busy} disabled={spec.kind === 'drag-drop' ? picked.length !== tiles.length : !value.trim()} onClick={() => void check()}>{spec.check.rule === 'self' ? 'Show self-check' : spec.check.rule === 'ai' ? 'Check with Max' : 'Check answer'}</Button>}
    {failed && <Button disabled={busy} onClick={() => void settle(failed.outcome, failed.given, failed.note)}>Retry saving answer</Button>}
    {message && <p role="status" className="text-sm">{message}</p>}
    {phase !== 'answer' && <div className="space-y-3 rounded-2xl border border-line p-4" aria-live="polite">
      <p className="font-semibold">{phase === 'right' ? 'Answer recorded' : 'Compare with the answer'}</p>
      {!guides && <p className="whitespace-pre-wrap">{solutionOf(spec)}</p>}
      {spec.feedback?.why && <p className="whitespace-pre-wrap text-sm">{spec.feedback.why}</p>}
      <Button onClick={() => { locked.current = false; setIndex((n) => n + 1); setValue(''); setPicked([]); setPhase('answer'); setMessage(''); }}>Continue</Button>
    </div>}
  </div>;
}
