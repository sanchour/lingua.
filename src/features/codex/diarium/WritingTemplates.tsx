import { useState } from 'react';
import { fillTemplate, templateSlots } from '@/core/notebook/library';
import { WRITING_PHRASES } from '@/core/journal/phrases';
import { newPhrase, saveLibrary, useLibrary } from '@/data/notebook';
import { UiText, useUi } from '@/design/i18n/UiText';
import { Button, Select } from '@/design/primitives';

export function WritingTemplates({ lang, insert }: { lang: string; insert: (text: string) => void }) {
  const ui = useUi();
  const saved = useLibrary('phrasebook', lang);
  const templates = [...(WRITING_PHRASES[lang] ?? []).map((text, i) => ({ id: `preset:${i}`, title: text, text: text.replace(/\s*…+/g, lang === 'zh' ? '{detail}' : ' {detail}') })), ...(saved?.items ?? []).filter((p) => p.kind === 'Template')];
  const [id, setId] = useState('preset:0');
  const [values, setValues] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const chosen = templates.find((t) => t.id === id);
  const slots = templateSlots(chosen?.text ?? '');
  let preview = ''; try { if (chosen) preview = fillTemplate(chosen.text, values); } catch { /* Required slots are still empty. */ }
  const save = async () => {
    setBusy(true); setError('');
    try { const phrase = newPhrase(lang, draft.trim()); phrase.kind = 'Template'; const kept = await saveLibrary('phrasebook', phrase); setId(kept.id); setValues({}); setDraft(''); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };
  return <details><summary className="cursor-pointer font-semibold"><UiText source="Sentence templates" /></summary><div className="mt-3 space-y-3">
    <Select label={ui('Template')} value={id} onChange={(v) => { setId(v); setValues({}); }} options={templates.map((t) => ({ value: t.id, label: t.title }))} />
    {slots.map((slot) => <label key={slot} className="block">{slot}<input dir="auto" lang={lang} value={values[slot] ?? ''} maxLength={200} onChange={(e) => setValues({ ...values, [slot]: e.target.value })} className="mt-1 w-full rounded-lg border border-line bg-raised p-2" /></label>)}
    {preview && <p lang={lang} dir="auto" className="font-serif text-base">{preview}</p>}
    <Button size="sm" variant="secondary" disabled={!preview} onClick={() => insert(preview)}><UiText source="Insert into entry" /></Button>
    <label className="block"><UiText source="New template · use {slot} for a blank" /><textarea dir="auto" lang={lang} maxLength={4000} rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} className="mt-2 w-full rounded-lg border border-line bg-raised p-2" /></label>
    <Button size="sm" variant="ghost" disabled={!draft.trim()} loading={busy} onClick={() => void save()}><UiText source="Save template" /></Button>
    {(error || saved?.error) && <p role="alert" className="text-xs text-accent-text"><UiText source={error || saved?.error || ''} /></p>}
  </div></details>;
}
