import { useEffect, useRef, useState } from 'react';
import { writingSpelling } from '@/data/writingSpelling';
import { searchFullAdvanced } from '@/services/dictionary/fullDict';
import { UiText } from '@/design/i18n/UiText';
import { Button } from '@/design/primitives';

export function WritingSpelling({ lang, text }: { lang: string; text: string }) {
  const [result, setResult] = useState<Awaited<ReturnType<typeof writingSpelling>> | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  useEffect(() => { request.current++; setResult(null); setSuggestions({}); setBusy(false); }, [text, lang]);
  useEffect(() => () => { request.current++; }, []);
  const check = async () => { const id = ++request.current; setBusy(true); setError(''); try { const found = await writingSpelling(lang, text); if (id === request.current) setResult(found); } catch (e) { if (id === request.current) setError(e instanceof Error ? e.message : String(e)); } finally { if (id === request.current) setBusy(false); } };
  return <details className="mb-5 rounded-xl border border-line p-4"><summary className="cursor-pointer font-semibold"><UiText source="Check spelling" /></summary><div className="mt-3 space-y-3">
    <p className="text-xs text-ink-soft"><UiText source="First 500 forms checked in your installed dictionary. Names and missing forms may be valid; inspect suggestions." /></p>
    <Button size="sm" variant="secondary" disabled={!text.trim()} loading={busy} onClick={() => void check()}><UiText source="Check on this device" /></Button>
    {result && <><p role="status" className="text-sm"><UiText source="Checked {0} / {1} forms · {2} not found" values={[result.checked, result.total, result.missing.length]} /></p><ul className="grid grid-cols-3 gap-3">{result.missing.map((word) => <li key={word} className="rounded-lg bg-surface p-3"><span lang={lang} className="font-serif text-lg">{word}</span><Button size="sm" variant="ghost" onClick={() => void searchFullAdvanced(lang, word, { mode: 'fuzzy', limit: 5 }).then((hits) => setSuggestions((old) => ({ ...old, [word]: hits.map((h) => h.row.word) }))).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))}><UiText source="Suggestions" /></Button>{suggestions[word] && <p lang={lang} className="mt-2 text-sm">{suggestions[word].join(' · ') || '—'}</p>}</li>)}</ul></>}
    {error && <p role="alert" className="text-sm text-accent-text"><UiText source={error} /></p>}
  </div></details>;
}
