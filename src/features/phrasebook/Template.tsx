import { useState } from 'react';
import { fillTemplate, templateSlots } from '@/core/notebook/library';
import type { SavedPhrase } from '@/core/notebook/library';
import { newPhrase } from '@/data/notebook';
import { Button, Drawer } from '@/design/primitives';
import { UiText, useUi } from '@/design/i18n/UiText';
import { Field, inputClass } from '@/features/notebook/fields';
export function TemplateForm({ phrase, onClose, onMake }: { phrase: SavedPhrase; onClose: () => void; onMake: (p: SavedPhrase) => void }) {
  const t = useUi(); const slots = [...new Set([...templateSlots(phrase.text), ...templateSlots(phrase.translation)])]; const [values, set] = useState<Record<string, string>>({}); const [error, setError] = useState('');
  const make = () => { try { const text = fillTemplate(phrase.text, values), translation = fillTemplate(phrase.translation, values); onMake({ ...newPhrase(phrase.lang, text, translation, phrase.source), folder: phrase.folder, tags: phrase.tags, notes: `From template: ${phrase.text}\n${phrase.notes}` }); } catch (e) { setError(e instanceof Error ? e.message : 'Could not fill this template.'); } };
  return <Drawer open title={t('Use this template')} onClose={onClose} footer={<Button disabled={!slots.every((s) => Object.hasOwn(values, s) && typeof values[s] === 'string' && values[s].trim())} onClick={make}><UiText source="Review new phrase" /></Button>}><p lang={phrase.lang} className="my-4 font-serif text-xl">{phrase.text}</p><p className="mb-4 text-sm text-ink-soft"><UiText source="Your values replace the {slots} literally. Review the result before saving; grammar is not checked." /></p><div className="space-y-4">{slots.map((slot) => <Field key={slot} title={slot}><input className={inputClass} maxLength={200} value={Object.hasOwn(values, slot) ? values[slot] : ''} onChange={(e) => set({ ...values, [slot]: e.target.value })} /></Field>)}</div>{error && <p role="alert">{error}</p>}</Drawer>;
}
