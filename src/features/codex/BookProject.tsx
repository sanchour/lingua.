import { useState } from 'react';
import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { readingProject, saveGlossary } from '@/data/readingProject';
import { updateText } from '@/data/library';
import type { Text } from '@/data/types';
import { Button, Select } from '@/design/primitives';
import { UiText, useUi } from '@/design/i18n/UiText';
import { toast } from '@/state/ui';

export function BookProject({ text }: { text: Text }) {
  const ui = useUi();
  const rows = useLiveQuery(() => readingProject(text), [text.id, text.updatedAt]);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'character' | 'place'>('character');
  const [index, setIndex] = useState('0');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    setBusy(true); setError('');
    try {
      const chapter = rows?.find((r) => r.chapter.index === Number(index))?.chapter;
      const quote = chapter?.blocks.find((b) => b.t !== 'img' && b.text.includes(name.trim()));
      await saveGlossary(text.id, { id: crypto.randomUUID(), name: name.trim(), kind, chapterIndex: Number(index), quote: quote && quote.t !== 'img' ? quote.text : '', note });
      setName(''); setNote('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save the glossary.'); }
    finally { setBusy(false); }
  };
  return <section className="space-y-4 rounded-2xl border border-line bg-raised p-5">
    <h2 className="font-serif text-2xl font-semibold"><UiText source="Book project" /></h2>
    <p className="text-sm text-ink-soft"><UiText source="Unseen = neither Known nor Learning. Counts include repeated words and names." /></p>
    {!rows && <p role="status"><UiText source="Loading…" /></p>}
    <ol className="divide-y divide-line">{rows?.map(({ chapter, words, unknown, share, notes }) => <li key={chapter.id} className="space-y-2 py-3">
      <Link className="font-serif text-lg font-semibold text-accent-text" to={`/codex/read/${text.id}?chapter=${chapter.index}`} lang={text.lang}>{chapter.title || `${chapter.index + 1}`}</Link>
      <p className="text-xs text-ink-soft"><UiText source="{0} / {1} unseen words · {2}%" values={[unknown, words, share === null ? '—' : Math.round(share * 100)]} /></p>
      <div className="flex gap-4 text-sm"><Link className="underline" to={`/codex/comprehension/${text.id}/${chapter.index}`}><UiText source="Check understanding" /></Link><Link className="underline" to={`/codex/comprehension/${text.id}/${chapter.index}?focus=discussion`}><UiText source="Discussion questions" /></Link></div>
      <details><summary className="cursor-pointer text-sm"><UiText source="Collected vocabulary · {0}" values={[notes.length]} /></summary><ul className="mt-2 space-y-1">{notes.map((n) => <li key={n.id} lang={text.lang}><span className="font-semibold">{n.term}</span> · {n.meaning}</li>)}</ul></details>
    </li>)}</ol>
    <h3 className="font-semibold"><UiText source="Characters and places" /></h3>
    <p className="text-xs text-ink-soft"><UiText source="Confirm a name from a chapter; keep its exact quote and your note." /></p>
    <ul className="space-y-3">{text.readingGlossary?.map((g) => <li key={g.id} className="rounded-xl bg-surface p-3">
      <p lang={text.lang} className="font-serif text-lg">{g.name} · {g.kind === 'place' ? ui('Place') : ui('Book character')}</p><blockquote dir="auto" lang={text.lang} className="my-2 text-sm">{g.quote}</blockquote><p className="whitespace-pre-wrap text-sm">{g.note}</p>
      <p className="mt-2 text-xs"><UiText source="Appears in chapters: {0}" values={[rows?.filter((r) => r.chapter.blocks.some((b) => b.t !== 'img' && b.text.includes(g.name))).map((r) => r.chapter.index + 1).join(', ') || '—']} /></p>
      <Button size="sm" variant="ghost" onClick={() => void updateText(text.id, { readingGlossary: text.readingGlossary?.filter((item) => item.id !== g.id) }).then(() => toast('Removed.', { action: { label: 'Undo', onClick: () => void saveGlossary(text.id, g).catch((e: unknown) => toast(e instanceof Error ? e.message : String(e), { tone: 'error' })) } })).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))}><UiText source="Remove" /></Button>
    </li>)}</ul>
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void save(); }}><fieldset disabled={busy} className="space-y-3">
      <label className="block text-sm"><UiText source="Name" /><input required maxLength={120} lang={text.lang} value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-bg p-2" /></label>
      <div className="grid grid-cols-2 gap-3"><Select label={ui('Kind')} value={kind} onChange={(v) => setKind(v as typeof kind)} options={[{ value: 'character', label: ui('Book character') }, { value: 'place', label: ui('Place') }]} /><Select label={ui('Chapter')} value={index} onChange={setIndex} options={(rows ?? []).map((r) => ({ value: String(r.chapter.index), label: r.chapter.title || String(r.chapter.index + 1) }))} /></div>
      <label className="block text-sm"><UiText source="Note" /><textarea dir="auto" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-bg p-2" /></label>
      <Button type="submit" disabled={!name.trim()} loading={busy}><UiText source="Confirm name" /></Button>
    </fieldset></form>{error && <p role="alert" className="text-sm text-accent-text"><UiText source={error} /></p>}
  </section>;
}
