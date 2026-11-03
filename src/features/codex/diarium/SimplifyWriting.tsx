import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/app/context';
import { CEFR_LEVELS } from '@/core/lang/levels';
import type { Cefr } from '@/core/lang/levels';
import type { GeneratedRow } from '@/core/contracts/db';
import type { StoryBody } from '@/core/generate/generate';
import { aiBlock } from '@/data/plan';
import { UiText, useUi } from '@/design/i18n/UiText';
import { Button, Select } from '@/design/primitives';
import { GeneratedLabel } from '@/features/generated/GeneratedLabel';
import { generateMaterial } from '@/services/llm/generate';
import { ParallelColumns } from '../reader/ParallelReading';

export function SimplifyWriting({ lang, text }: { lang: string; text: string }) {
  const ui = useUi();
  const { settings } = useApp();
  const [level, setLevel] = useState<Cefr>('A1');
  const [row, setRow] = useState<GeneratedRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  const source = text.slice(0, 4000);
  useEffect(() => { request.current++; setRow(null); setBusy(false); }, [source, level]);
  useEffect(() => () => { request.current++; }, []);
  const make = async () => {
    const id = ++request.current; setBusy(true); setError('');
    try { const result = await generateMaterial({ lang, source, kind: 'simplified', level }); if (request.current === id) setRow(result.row); }
    catch (e) { if (request.current === id) setError(e instanceof Error ? e.message : String(e)); }
    finally { if (request.current === id) setBusy(false); }
  };
  return <details className="mb-5 rounded-xl border border-line p-4"><summary className="cursor-pointer font-semibold"><UiText source="Simpler wording" /></summary><div className="mt-3 space-y-4">
    <p className="text-sm text-ink-soft"><UiText source="Max receives the first 4,000 characters shown here. Choose an easier level; your draft stays unchanged. Meaning and level may be wrong." /></p>
    <div className="flex items-end gap-4"><Select label={ui('Target level')} value={level} onChange={(v) => setLevel(v as Cefr)} options={CEFR_LEVELS.map((v) => ({ value: v, label: v }))} /><Button size="sm" variant="secondary" loading={busy} disabled={Boolean(aiBlock(settings, settings.llm.provider)) || source.trim().length < 40} onClick={() => void make()}><UiText source="Simplify this passage" /></Button></div>
    {aiBlock(settings, settings.llm.provider) && <p className="text-xs text-ink-faint"><UiText source="Needs Max and a key in Settings › AI." /></p>}
    {row && <GeneratedLabel row={row} onReported={() => setRow(null)} />}
    <ParallelColumns source={source} lang={lang} other={row ? (row.content as StoryBody).text : ''} otherLang={lang} title={ui('Simpler wording')} />
    {error && <p role="alert" className="text-sm text-accent-text"><UiText source={error} /></p>}
  </div></details>;
}
