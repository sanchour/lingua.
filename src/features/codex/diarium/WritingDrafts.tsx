import { useMemo, useState } from 'react';
import { wordDiff } from '@/core/diff/words';
import { toPlain } from '@/core/journal/markdown';
import { saveWritingDraft } from '@/data/writingTools';
import type { JournalEntry } from '@/data/types';
import { UiText, useUi } from '@/design/i18n/UiText';
import { Button, Select } from '@/design/primitives';

export function DraftComparison({ before, after, lang }: { before: string; after: string; lang: string }) {
  const parts = useMemo(() => wordDiff(toPlain(before), toPlain(after)), [before, after]);
  return <div className="space-y-4"><div className="grid grid-cols-2 gap-5"><section><h3 className="mb-2 font-semibold"><UiText source="Earlier draft" /></h3><p lang={lang} dir="auto" className="whitespace-pre-wrap font-serif">{toPlain(before)}</p></section><section><h3 className="mb-2 font-semibold"><UiText source="Compared draft" /></h3><p lang={lang} dir="auto" className="whitespace-pre-wrap font-serif">{toPlain(after)}</p></section></div>
    <p lang={lang} dir="auto" className="diff-text whitespace-pre-wrap font-serif">{parts.map((p, i) => p.type === 'same' ? <span key={i}>{p.text}</span> : <span key={i}>{(p.type === 'change' || p.type === 'del') && <del>{p.type === 'change' ? p.from : p.text}</del>}{(p.type === 'change' || p.type === 'ins') && <ins>{p.type === 'change' ? p.to : p.text}</ins>}</span>)}</p>
  </div>;
}

export function WritingDrafts({ entry, text, restore }: { entry: JournalEntry; text: string; restore: (text: string) => void }) {
  const ui = useUi();
  const [left, setLeft] = useState('0');
  const [right, setRight] = useState('current');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const versions = entry.versions ?? [];
  const options = versions.map((v, i) => ({ value: String(i), label: `${i + 1} · ${new Date(v.at).toLocaleString()}` }));
  const before = versions[Number(left)]?.text ?? '';
  const after = right === 'current' ? text : versions[Number(right)]?.text ?? '';
  const save = async () => { setBusy(true); setError(''); try { await saveWritingDraft(entry.id, text); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); } };
  return <details className="mb-5 rounded-xl border border-line p-4"><summary className="cursor-pointer font-semibold"><UiText source="Compare drafts" /></summary>
    <p className="my-3 text-xs text-ink-soft"><UiText source="Ten snapshots kept. Restore saves your current draft first." /></p>
    <Button size="sm" variant="secondary" disabled={!text.trim()} loading={busy} onClick={() => void save()}><UiText source="Save draft snapshot" /></Button>
    {versions.length > 0 && <div className="mt-4 space-y-4"><div className="grid grid-cols-2 gap-5"><Select label={ui('Earlier draft')} value={left} onChange={setLeft} options={options} /><Select label={ui('Compared draft')} value={right} onChange={setRight} options={[{ value: 'current', label: ui('Current draft') }, ...options]} /></div>
      <DraftComparison before={before} after={after} lang={entry.lang} />
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setBusy(true); void saveWritingDraft(entry.id, text).then(() => restore(before)).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e))).finally(() => setBusy(false)); }}><UiText source="Restore earlier draft" /></Button>
    </div>}{error && <p role="alert" className="mt-3 text-sm text-accent-text"><UiText source={error} /></p>}
  </details>;
}
