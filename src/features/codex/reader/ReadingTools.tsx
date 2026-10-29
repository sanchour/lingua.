import { Link } from 'react-router';
import { useEffect, useRef, useState } from 'react';
import type { ReadingAids, ReadingMark } from '@/core/reading/aids';
import type { Text } from '@/data/types';
import { removeReadingMark, saveReadingMark } from '@/data/readingMarks';
import { Button, Drawer } from '@/design/primitives';
import { toast } from '@/state/ui';
import { AddToDeck } from './AddToDeck';

export function ReadingTools({ text, aids, onChange, onOpenChange, chapterIndex = 0 }: { chapterIndex?: number; text: Text; aids: ReadingAids; onChange: (next: ReadingAids) => void; onOpenChange: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const changeOpen = (value: boolean) => { setOpen(value); onOpenChange(value); };
  return <>
    <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => changeOpen(!open)} className="rounded-xl px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-surface">Study tools</button>
    <Drawer open={open} onClose={() => changeOpen(false)} title="Reading tools">
    <div className="space-y-1 text-sm">
      <Link className="my-4 block font-semibold underline underline-offset-4" to={`/codex/parallel/${text.id}/${chapterIndex}`}>Read side by side</Link>
      <Link className="my-4 block font-semibold underline underline-offset-4" to={`/codex/comprehension/${text.id}/${chapterIndex}`}>Check understanding of this chapter</Link>
      <p className="my-3 text-xs text-ink-faint">Dictionary categories can differ in context. Endings mark only a changed suffix shared with the dictionary form. No syntax is inferred.</p>
      {([['pos', 'Colour parts of speech'], ['endings', 'Mark changed endings'], ['glosses', 'Interlinear glosses'], ['hideGlosses', 'Hide glosses until revealed'], ['ruler', 'Reading ruler']] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 py-2"><input type="checkbox" checked={aids[key]} onChange={(e) => onChange({ ...aids, [key]: e.target.checked })} />{label}</label>)}
      <p className="text-xs text-ink-faint">Noun: blue · Verb: terracotta · Adjective: sage · Adverb: amber. Other or missing categories keep their usual ink.</p>
      {aids.ruler && <label className="mt-3 block">Ruler position<input className="mt-2 w-full" type="range" min="10" max="90" value={aids.rulerY} onChange={(e) => onChange({ ...aids, rulerY: Number(e.target.value) })} /></label>}
      <p className="my-4 text-xs text-ink-faint">Drag across words, then choose Highlight in the selection bubble. These tools reset when you leave; highlights and notes stay with the text.</p>
      <h3 className="font-semibold">Highlights and margin notes</h3>
      {(text.readingMarks ?? []).map((mark) => <SavedMark key={mark.id} mark={mark} text={text} />)}
      {!text.readingMarks?.length && <p className="mt-2 text-ink-faint">No highlights yet.</p>}
    </div>
    </Drawer>
  </>;
}
function SavedMark({ mark, text }: { mark: ReadingMark; text: Text }) {
  const [note, setNote] = useState(mark.note);
  const [meaning, setMeaning] = useState('');
  const latest = useRef(note);
  const stored = useRef(mark.note);
  const removed = useRef(false);
  const pending = useRef<number | undefined>(undefined);
  latest.current = note;
  stored.current = mark.note;
  useEffect(() => () => {
    window.clearTimeout(pending.current);
    if (!removed.current && latest.current !== stored.current) void saveReadingMark(text.id, { ...mark, note: latest.current }).catch(fail);
  }, [text.id, mark.id]);
  const saveNote = (value: string) => {
    window.clearTimeout(pending.current);
    if (value !== stored.current) void saveReadingMark(text.id, { ...mark, note: value }).catch(fail);
  };
  const fail = (error: unknown) => toast(error instanceof Error ? error.message : 'Could not save the note.', { tone: 'error' });
  return <section className="mt-4 space-y-2 border-t border-line pt-3">
    <p className="text-xs text-ink-faint">Chapter {mark.chapterIndex + 1} · paragraph {mark.blockIndex + 1} · {mark.colour}</p>
    <blockquote lang={text.lang} className="font-serif">{mark.quote}</blockquote>
    <label className="block">Margin note<textarea rows={2} maxLength={4000} value={note} onChange={(e) => { const value = e.target.value; setNote(value); latest.current = value; window.clearTimeout(pending.current); pending.current = window.setTimeout(() => saveNote(value), 500); }} onBlur={() => saveNote(note)} className="mt-1 w-full rounded-lg border border-line bg-raised p-2" /></label>
    <label className="block">Meaning for a card<input value={meaning} onChange={(e) => setMeaning(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-raised p-2" /></label>
    {meaning.trim() && <AddToDeck lang={text.lang} note={{ term: mark.quote, meaning: meaning.trim(), source: 'codex', context: { sentence: mark.quote, textId: text.id, chapterIndex: mark.chapterIndex, blockIndex: mark.blockIndex } }} />}
    <Button size="sm" variant="ghost" onClick={() => { window.clearTimeout(pending.current); removed.current = true; void removeReadingMark(text.id, mark.id).then(() => toast('Highlight removed.', { action: { label: 'Undo', onClick: () => void saveReadingMark(text.id, mark).catch(fail) } })).catch((error: unknown) => { removed.current = false; fail(error); }); }}>Remove highlight</Button>
  </section>;
}
