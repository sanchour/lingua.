import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Sparkles, Trash2 } from 'lucide-react';
import type { CardTemplate } from '@/core/contracts/word';
import { fillFromEntry } from '@/core/srs/templateFill';
import { FIELD_LABEL, TEMPLATES, templateOf } from '@/core/srs/templates';
import type { TemplateField } from '@/core/srs/templates';
import { db } from '@/data/db';
import { lookUpFull } from '@/services/dictionary/fullDict';
import { addNote, deleteNote, setSuspended, updateNote } from '@/data/decks';
import type { Card, Note } from '@/data/types';
import { Button, Drawer, ToggleRow } from '@/design/primitives';
import { toast } from '@/state/ui';
import { CardMemory } from './CardMemory';
import { OcclusionEditor } from './OcclusionEditor';
import { PictureField } from './PictureField';
import type { PickedPicture } from './PictureField';
import { useBlobUrl } from '../study/FlipCard';

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
  const [template, setTemplate] = useState<CardTemplate>('word-meaning');
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [picture, setPicture] = useState<PickedPicture | null>(null);
  const [pictureGone, setPictureGone] = useState(false);
  const [boxes, setBoxes] = useState<NonNullable<Note['occlusion']>>([]);
  const [filling, setFilling] = useState(false);
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
    setTemplate(note ? templateOf(note) : 'word-meaning');
    setExtra(note?.extra ?? {});
    setPicture(null);
    setPictureGone(false);
    setBoxes(note?.occlusion ?? []);
    const t = window.setTimeout(() => first.current?.focus(), 250);
    return () => window.clearTimeout(t);
  }, [target]);

  const editing = target?.mode === 'edit' ? target : null;
  const info = TEMPLATES.find((t) => t.id === template)!;
  const storedImage = useBlobUrl(pictureGone || picture ? undefined : editing?.note.imageBlobId);
  const pickedUrl = useMemo(() => (picture ? URL.createObjectURL(picture.blob) : null), [picture]);
  const image = pickedUrl ?? storedImage;

  /** The dictionary writes the fields this kind of card reads, to be edited. */
  const fill = async () => {
    setFilling(true);
    try {
      const row = await lookUpFull(lang, term.trim());
      if (!row) return toast('The dictionary has no entry for this word. Is it installed (Thesaurus › Dictionary)?', { tone: 'error' });
      const next = { ...extra };
      for (const field of info.fill ?? []) {
        const text = fillFromEntry(row, field);
        if (text) next[field] = text;
      }
      setExtra(next);
      toast('Filled in from the dictionary. Edit what you like.', { duration: 2200 });
    } finally {
      setFilling(false);
    }
  };
  const suspended = Boolean(editing?.cards.length && editing.cards.every((c) => c.suspended));

  const save = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!target || !term.trim()) return;
    setBusy(true);
    const original = editing?.note.example;
    // Keep a cloze span only while the sentence is unchanged.
    const exampleValue = example.trim() ? { text: example.trim(), translation: translation.trim() || undefined, cloze: original?.text === example.trim() ? original.cloze : undefined } : undefined;
    // The extra fields keep what the kind of card reads, one per line; a field left empty is dropped.
    const kept: Record<string, string> = { ...(editing?.note.extra ?? {}) };
    for (const [k, v] of Object.entries(extra)) if (v.trim()) kept[k] = v.trim(); else delete kept[k];
    // A picture chosen is stored on this device; one removed lets go of the card's.
    let imageBlobId = editing?.note.imageBlobId;
    let imageCredit = editing?.note.imageCredit;
    if (pictureGone) [imageBlobId, imageCredit] = [undefined, undefined];
    if (picture) {
      imageBlobId = crypto.randomUUID();
      imageCredit = picture.credit;
      await db.blobs.put({ id: imageBlobId, kind: 'image', mime: picture.blob.type || 'image/jpeg', size: picture.blob.size, blob: picture.blob, createdAt: Date.now() });
    }
    const fields = {
      term: term.trim(),
      meaning: meaning.trim(),
      example: exampleValue,
      tags: tags.split(/[\s,]+/).filter(Boolean),
      mnemonic: mnemonic.trim() || undefined,
      template: template === 'word-meaning' ? undefined : template,
      extra: Object.keys(kept).length ? kept : undefined,
      imageBlobId,
      imageCredit,
      occlusion: template === 'image-occlusion' && boxes.length ? boxes : undefined,
    };
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
        setExtra({});
        setPicture(null);
        setBoxes([]);
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
        <Field label="Kind of card">
          <select value={template} onChange={(e) => setTemplate(e.target.value as CardTemplate)} className={field}>
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[12.5px] text-ink-faint">{info.detail}</span>
        </Field>
        {info.fields.map((key: TemplateField) => (
          <Field key={key} label={FIELD_LABEL[key].label}>
            <textarea lang={lang} value={extra[key] ?? ''} onChange={(e) => setExtra({ ...extra, [key]: e.target.value })} rows={key === 'paragraph' ? 4 : 3} placeholder={FIELD_LABEL[key].placeholder} className={`${field} resize-none`} />
          </Field>
        ))}
        {(info.fill?.length ?? 0) > 0 && (
          <Button type="button" variant="secondary" size="sm" icon={Sparkles} loading={filling} disabled={!term.trim()} onClick={() => void fill()}>
            Fill from the dictionary
          </Button>
        )}
        <Field label={info.needsImage ? 'Picture' : 'A picture (optional)'}>
          <PictureField blobId={editing?.note.imageBlobId} credit={editing?.note.imageCredit} picked={picture} removed={pictureGone} term={term} onPick={(p) => { setPicture(p); setPictureGone(false); }} onRemove={() => { setPicture(null); setPictureGone(true); setBoxes([]); }} />
        </Field>
        {template === 'image-occlusion' && image && (
          <Field label="Parts to hide">
            <OcclusionEditor src={image} boxes={boxes} onChange={setBoxes} />
          </Field>
        )}
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
            <CardMemory key={c.id} card={c} onChanged={onClose} />
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
