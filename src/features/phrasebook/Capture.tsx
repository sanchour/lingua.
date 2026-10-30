import { useEffect } from 'react';
import { create } from 'zustand';
import { BookMarked } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApp } from '@/app/context';
import { newPhrase } from '@/data/notebook';
import { sourcePath } from '@/core/notebook/library';
import type { SavedPhrase } from '@/core/notebook/library';
import { matchesCombo } from '@/design/hooks/useHotkeys';
import { IconButton } from '@/design/primitives';
import { UiText, useUi } from '@/design/i18n/UiText';
import { selectedText } from '@/features/culture/ReferenceHelp';
import { toast } from '@/state/ui';
import { PhraseEditor } from './Phrasebook';
const useCapture = create<{ item: SavedPhrase | null }>(() => ({ item: null }));
export function capturePhrase(lang: string, text: string, translation = '', source = sourcePath(window.location.pathname, window.location.search, import.meta.env.BASE_URL)) {
  useCapture.setState({ item: newPhrase(lang, text.slice(0, 4000), translation.slice(0, 10000), source) });
}
export function PhraseCaptureButton({ compact = false }: { compact?: boolean }) {
  const { language } = useApp(); const t = useUi(); const open = () => capturePhrase(language.id, selectedText());
  return compact ? <IconButton icon={BookMarked} label={t('Save a phrase')} onClick={open} /> : <button type="button" onClick={open} className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm text-ink-soft hover:bg-surface"><BookMarked size={18} aria-hidden /><UiText source="Save a phrase" /></button>;
}
export function PhraseCapture() {
  const { language } = useApp(); const item = useCapture((s) => s.item); const navigate = useNavigate();
  useEffect(() => { const key = (e: KeyboardEvent) => { if (!e.defaultPrevented && !e.repeat && matchesCombo(e, 'mod+shift+p')) { e.preventDefault(); if (!useCapture.getState().item) capturePhrase(language.id, selectedText()); } }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [language.id]);
  return item ? <PhraseEditor key={item.id} initial={item} onClose={() => useCapture.setState({ item: null })} onSaved={() => { useCapture.setState({ item: null }); toast('Saved to your phrasebook.', { action: { label: 'Open phrasebook', onClick: () => navigate('/thesaurus?tab=phrases') } }); }} /> : null;
}
