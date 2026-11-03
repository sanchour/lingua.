import { UiText, useUi } from '@/design/i18n/UiText';
import { ReferenceButton } from '@/features/culture/ReferenceHelp';
import { Link } from 'react-router';
import { useEffect, useRef, useState } from 'react';
import type { ReadingAids, ReadingMark } from '@/core/reading/aids';
import type { Text } from '@/data/types';
import { removeReadingMark, saveReadingMark } from '@/data/readingMarks';
import { Button, Drawer } from '@/design/primitives';
import { toast } from '@/state/ui';
import { AddToDeck } from './AddToDeck';

export function ReadingTools({ text, aids, onChange, onOpenChange, onJump, chapterIndex = 0 }: { onJump: (chapter: number, block: number) => void; chapterIndex?: number; text: Text; aids: ReadingAids; onChange: (next: ReadingAids) => void; onOpenChange: (open: boolean) => void }) {
  const translateUi = useUi();
  const [open, setOpen] = useState(false);
  const changeOpen = (value: boolean) => { setOpen(value); onOpenChange(value); };
  return <>
    <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => changeOpen(!open)} className="rounded-xl px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-surface"><UiText source={'Study tools'} /></button>
    <Drawer open={open} onClose={() => changeOpen(false)} title={translateUi('Reading tools')}>
    <div className="space-y-1 text-sm">
      <ReferenceButton />
      <Link className="my-4 block font-semibold underline underline-offset-4" to={`/codex/book/${text.id}`}><UiText source="Book project" /></Link>
      <Link className="my-4 block font-semibold underline underline-offset-4" to="/settings/data#backup"><UiText source="Reading highlights (.md)" /></Link>
      <Link className="my-4 block font-semibold underline underline-offset-4" to={`/codex/parallel/${text.id}/${chapterIndex}`}><UiText source={'Read side by side'} /></Link>
      <Link className="my-4 block font-semibold underline underline-offset-4" to={`/codex/comprehension/${text.id}/${chapterIndex}`}><UiText source={'Check understanding of this chapter'} /></Link>
      <p className="my-3 text-xs text-ink-faint"><UiText source={'Dictionary categories can differ in context. Endings mark only a changed suffix shared with the dictionary form. No syntax is inferred.'} /></p>
      {([['pos', 'Colour parts of speech'], ['endings', 'Mark changed endings'], ['glosses', 'Interlinear glosses'], ['hideGlosses', 'Hide glosses until revealed'], ['ruler', 'Reading ruler']] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 py-2"><input type="checkbox" checked={aids[key]} onChange={(e) => onChange({ ...aids, [key]: e.target.checked })} /><UiText source={label} /></label>)}
      <p className="text-xs text-ink-faint"><UiText source={'Noun: blue · Verb: terracotta · Adjective: sage · Adverb: amber. Other or missing categories keep their usual ink.'} /></p>
      {aids.ruler && <label className="mt-3 block"><UiText source={'Ruler position{0}'} values={[<input className="mt-2 w-full" type="range" min="10" max="90" value={aids.rulerY} onChange={(e) => onChange({ ...aids, rulerY: Number(e.target.value) })} />]} /></label>}
      <p className="my-4 text-xs text-ink-faint"><UiText source={'Drag across words, then choose Highlight in the selection bubble. These tools reset when you leave; highlights and notes stay with the text.'} /></p>
      <h3 className="font-semibold"><UiText source={'Highlights and margin notes'} /></h3>
      {(text.readingMarks ?? []).map((mark) => <SavedMark key={mark.id} mark={mark} text={text} onJump={() => { changeOpen(false); onJump(mark.chapterIndex, mark.blockIndex); }} />)}
      {!text.readingMarks?.length && <p className="mt-2 text-ink-faint"><UiText source={'No highlights yet.'} /></p>}
    </div>
    </Drawer>
  </>;
}
export function SavedMark({ mark, text, onJump }: { mark: ReadingMark; text: Text; onJump: () => void }) {
  const [note, setNote] = useState(mark.note);
  const [meaning, setMeaning] = useState('');
  const latest = useRef(note);
  const stored = useRef(mark.note);
  const currentMark = useRef(mark);
  const removed = useRef(false);
  const pending = useRef<number | undefined>(undefined);
  latest.current = note;
  stored.current = mark.note;
  currentMark.current = mark;
  useEffect(() => () => {
    window.clearTimeout(pending.current);
    if (!removed.current && latest.current !== stored.current) void saveReadingMark(text.id, { ...currentMark.current, note: latest.current }).catch(fail);
  }, [text.id, mark.id]);
  const saveNote = (value: string) => {
    window.clearTimeout(pending.current);
    if (value !== stored.current) void saveReadingMark(text.id, { ...mark, note: value }).catch(fail);
  };
  const fail = (error: unknown) => toast(error instanceof Error ? error.message : 'Could not save the note.', { tone: 'error' });
  return <section className="mt-4 space-y-2 border-t border-line pt-3">
    <p className="text-xs text-ink-faint">{mark.bookmark && <><UiText source="Bookmark" /> · </>}<UiText source={'Chapter {0} · paragraph {1} · {2}'} values={[mark.chapterIndex + 1, mark.blockIndex + 1, mark.colour]} /></p>
    <blockquote dir="auto" lang={text.lang} className="font-serif">{mark.quote}</blockquote>
    <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={onJump}><UiText source="Go to passage" /></Button><Button size="sm" variant="ghost" aria-pressed={Boolean(mark.favourite)} onClick={() => void saveReadingMark(text.id, { ...mark, favourite: !mark.favourite }).catch(fail)}><UiText source={mark.favourite ? 'Remove from favourites' : 'Favourite passage'} /></Button></div>
    <label className="block"><UiText source={'Margin note{0}'} values={[<textarea dir="auto" rows={2} maxLength={4000} value={note} onChange={(e) => { const value = e.target.value; setNote(value); latest.current = value; window.clearTimeout(pending.current); pending.current = window.setTimeout(() => saveNote(value), 500); }} onBlur={() => saveNote(note)} className="mt-1 w-full rounded-lg border border-line bg-raised p-2" />]} /></label>
    <label className="block"><UiText source={'Meaning for a card{0}'} values={[<input value={meaning} onChange={(e) => setMeaning(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-raised p-2" />]} /></label>
    {meaning.trim() && <AddToDeck lang={text.lang} note={{ term: mark.quote, meaning: meaning.trim(), source: 'codex', context: { sentence: mark.quote, textId: text.id, chapterIndex: mark.chapterIndex, blockIndex: mark.blockIndex } }} />}
    <Button size="sm" variant="ghost" onClick={() => { window.clearTimeout(pending.current); removed.current = true; void removeReadingMark(text.id, mark.id).then(() => toast('Highlight removed.', { action: { label: 'Undo', onClick: () => void saveReadingMark(text.id, mark).catch(fail) } })).catch((error: unknown) => { removed.current = false; fail(error); }); }}><UiText source={mark.bookmark ? 'Remove bookmark' : 'Remove highlight'} /></Button>
  </section>;
}
