import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { describeRetrievability } from '@/core/srs/memory';
import { formatInterval, maturityOf, retrievability } from '@/core/srs/scheduler';
import { addNote, deleteNote, setSuspended, updateNote } from '@/data/decks';
import type { Card, Note } from '@/data/types';
import { Button, Drawer, ToggleRow } from '@/design/primitives';
import { toast } from '@/state/ui';

export type EditorTarget = { mode: 'new'; deckId: string } | { mode: 'edit'; note: Note; cards: Card[] };

const field = 'w-full rounded-xl border border-line bg-bg px-3.5 py-2.5 text-[15px] text-ink outline-none transition-colors focus:border-accent';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-bold tracking-wide text-ink-soft uppercase">{label}</span>
      {children}
    </label>
  );
}

/** Adding and editing a card. "Add" keeps the drawer open for the next word. */
export function NoteEditor({ lang, target, onClose }: { lang: string; target: EditorTarget | null; onClose: () => void }) {
  const [term, setTerm] = useState('');
  const [meaning, setMeaning] = useState('');
  const [example, setExample] = useState('');
  const [translation, setTranslation] = useState('');
  const [tags, setTags] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [busy, setBusy] = useState(false);
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!target) return;
    const note = target.mode === 'edit' ? target.note : null;
    setTerm(note?.term ?? '');
    setMeaning(note?.meaning ?? '');
    setExample(note?.example?.text ?? note?.context?.sentence ?? '');
    setTranslation(note?.example?.translation ?? '');
    setTags(note?.tags.join(' ') ?? '');
    setMnemonic(note?.mnemonic ?? '');
    const t = window.setTimeout(() => first.current?.focus(), 250);
    return () => window.clearTimeout(t);
  }, [target]);

  const editing = target?.mode === 'edit' ? target : null;
  // How likely a card is remembered right now, in plain words.
  const remembered = (c: Card) => {
    const d = describeRetrievability(retrievability(c, Date.now()));
    return d ? `${d.words} (${d.label.toLowerCase()})` : null;
  };
  const suspended = Boolean(editing?.cards.length && editing.cards.every((c) => c.suspended));

  const save = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!target || !term.trim()) return;
    setBusy(true);
    const original = editing?.note.example;
    // Keep a cloze span only while the sentence is unchanged.
    const exampleValue = example.trim() ? { text: example.trim(), translation: translation.trim() || undefined, cloze: original?.text === example.trim() ? original.cloze : undefined } : undefined;
    const fields = { term: term.trim(), meaning: meaning.trim(), example: exampleValue, tags: tags.split(/[\s,]+/).filter(Boolean), mnemonic: mnemonic.trim() || undefined };
    try {
      if (editing) {
        await updateNote(editing.note.id, fields);
        onClose();
      } else {
        await addNote((target as { deckId: string }).deckId, fields);
        toast(`Added “${fields.term}”`, { tone: 'success', duration: 1600 });
        setTerm('');
        setMeaning('');
        setExample('');
        setTranslation('');
        first.current?.focus();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      open={Boolean(target)}
      onClose={onClose}
      title={editing ? 'Edit card' : 'New card'}
      footer={
        <Button block size="lg" disabled={!term.trim()} loading={busy} onClick={() => void save()}>
          {editing ? 'Save' : 'Add card'}
        </Button>
      }
    >
      <form onSubmit={(e) => void save(e)} className="space-y-4">
        <Field label="Word">
          <input ref={first} lang={lang} value={term} onChange={(e) => setTerm(e.target.value)} className={`${field} font-serif text-lg`} autoComplete="off" autoCapitalize="off" spellCheck={false} />
        </Field>
        <Field label="Meaning">
          <input value={meaning} onChange={(e) => setMeaning(e.target.value)} className={field} autoComplete="off" />
        </Field>
        <Field label="Example sentence">
          <textarea lang={lang} value={example} onChange={(e) => setExample(e.target.value)} rows={2} className={`${field} resize-none font-serif`} />
        </Field>
        <Field label="Its translation">
          <input value={translation} onChange={(e) => setTranslation(e.target.value)} className={field} autoComplete="off" />
        </Field>
        <Field label="A way to remember it">
          <textarea value={mnemonic} onChange={(e) => setMnemonic(e.target.value)} rows={2} placeholder="A picture, a rhyme, a word it sounds like…" className={`${field} resize-none`} />
        </Field>
        <Field label="Tags">
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="food travel" className={field} autoComplete="off" />
        </Field>
        <button type="submit" hidden />
      </form>

      {editing && (
        <div className="mt-6 border-t border-line pt-2">
          {editing.cards.map((c) => (
            <p key={c.id} className="py-1.5 text-[13px] text-ink-soft">
              <span className="font-semibold text-ink">{c.direction === 'production' ? 'Meaning → word' : 'Word → meaning'}</span> · {maturityOf(c)}
              {c.state !== 0 && ` · next in ${formatInterval(Math.max(0, c.due - Date.now()))}`} · {c.reps} reviews{c.lapses ? `, ${c.lapses} lapses` : ''}
              {c.leech ? ' · keeps slipping' : ''}
              {remembered(c) && ` · remembered today: ${remembered(c)}`}
            </p>
          ))}
          <ToggleRow title="Suspend" description="Keep the card but leave it out of reviews." checked={suspended} onChange={(v) => void setSuspended(editing.note.id, v)} />
          <Button
            variant="danger"
            icon={Trash2}
            className="mt-2"
            onClick={async () => {
              await deleteNote(editing.note.id);
              onClose();
              toast(`Deleted “${editing.note.term}”`);
            }}
          >
            Delete card
          </Button>
        </div>
      )}
    </Drawer>
  );
}
