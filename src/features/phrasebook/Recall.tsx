import type { ExerciseSpec } from '@/core/contracts/exercise';
import type { Room } from '@/core/contracts/learner';
import { useRef, useState } from 'react';
import { phrasebookSpecs } from '@/core/exercise/phrasebook';
import type { SavedPhrase } from '@/core/notebook/library';
import { judge, solutionOf } from '@/core/exercise';
import { recordEvidence } from '@/data/learner';
import { Button } from '@/design/primitives';
import { UiText } from '@/design/i18n/UiText';
import { TypedView } from '@/features/exercise/TypedView';
import type { Phase } from '@/features/lesson/kit';
export function PhraseRecall({ phrases, onDone }: { phrases: SavedPhrase[]; onDone: () => void }) { return <RecallRun specs={phrasebookSpecs(phrases)} onDone={onDone} />; }
export function RecallRun({ specs: initial, onDone, room = 'thesaurus', backLabel = 'Back to phrases', notice = 'Compared with your saved phrases and alternatives. Revealing the answer records the attempt as assisted; this does not change a flashcard schedule.' }: { specs: ExerciseSpec[]; onDone: () => void; room?: Room; backLabel?: string; notice?: string }) {
  const [specs] = useState(initial); const [index, next] = useState(0); const [value, setValue] = useState(''); const [phase, setPhase] = useState<Phase>('answer'); const [shown, reveal] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [correct, setCorrect] = useState(0); const locked = useRef(false); const [run] = useState(() => crypto.randomUUID());
  const spec = specs[index];
  const check = async (remembered?: boolean) => {
    if (!spec || locked.current || phase !== 'answer') return;
    if (spec.check.rule === 'self' && remembered === undefined) { reveal(true); return; }
    locked.current = true; setBusy(true); setError('');
    const outcome = remembered === undefined ? judge(spec.check, value, spec.lang).outcome : remembered ? 'right' : 'wrong';
    try { await recordEvidence({ id: `${run}:${index}`, lang: spec.lang, at: Date.now(), skill: spec.trains.skill, room, item: spec.trains.item, outcome, assisted: shown, given: value.slice(0, 200), expected: solutionOf(spec).slice(0, 200), kind: spec.kind, contextId: spec.key }); setPhase(outcome === 'wrong' ? 'wrong' : 'right'); if (outcome !== 'wrong') setCorrect((n) => n + 1); }
    catch { setError('The answer could not be saved. Try again before continuing.'); locked.current = false; }
    finally { setBusy(false); }
  };
  if (!spec) return <section className="mx-auto max-w-xl space-y-5 py-8"><h2 className="font-serif text-3xl"><UiText source="Recall finished" /></h2><p>{correct} / {specs.length} <UiText source="recalled" /></p><Button onClick={onDone}><UiText source={backLabel} /></Button></section>;
  return <section className="mx-auto max-w-2xl space-y-5 py-6"><Button size="sm" variant="ghost" onClick={onDone}><UiText source={backLabel} /></Button><p className="text-sm text-ink-faint">{index + 1} / {specs.length}</p><h2 className="font-serif text-2xl"><UiText source={spec.instruction} /></h2><TypedView spec={spec} lang={spec.lang} value={value} onChange={setValue} phase={phase} onSubmit={() => void check()} />{(shown || phase !== 'answer') && <p lang={spec.lang} dir="auto" className="rounded-xl bg-surface p-4 font-serif text-xl">{solutionOf(spec)}</p>}{phase !== 'answer' && <p role="status"><UiText source={phase === 'wrong' ? 'Compare with your saved answer.' : 'Recalled.'} /></p>}{phase === 'answer' ? shown ? <div className="flex gap-3"><Button disabled={busy} onClick={() => void check(true)}><UiText source="I recalled it" /></Button><Button variant="secondary" disabled={busy} onClick={() => void check(false)}><UiText source="See again" /></Button></div> : <div className="flex gap-3"><Button disabled={!value.trim() || busy} loading={busy} onClick={() => void check()}><UiText source="Check" /></Button><Button variant="ghost" onClick={() => reveal(true)}><UiText source="Show answer and self-rate" /></Button></div> : <Button onClick={() => { next(index + 1); setValue(''); setPhase('answer'); reveal(false); locked.current = false; }}><UiText source="Continue" /></Button>}{error && <p role="alert" className="text-accent-text"><UiText source={error} /></p>}<p className="text-xs text-ink-faint"><UiText source={notice} /></p></section>;
}
