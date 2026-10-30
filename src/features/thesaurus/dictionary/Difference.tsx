import { UiText } from '@/design/i18n/UiText';
// "How are they different?" (6-1c): Max says how a word differs from one it is easily mixed up with, in a line and a row each with an
// example. Checked and kept like everything Max makes, and labelled. Without Max and a key it says so.
import { useState } from 'react';
import { Link } from 'react-router';
import { Sparkles } from 'lucide-react';
import { useApp } from '@/app/context';
import type { DifferenceBody } from '@/core/generate/generate';
import type { Cefr } from '@/core/lang/levels';
import { aiBlock } from '@/data/plan';
import { Button } from '@/design/primitives';
import { GeneratedLabel } from '@/features/generated/GeneratedLabel';
import { MaxLink } from '@/features/plans/Locked';
import { LlmError } from '@/services/llm/client';
import { generateMaterial } from '@/services/llm/generate';
import type { GeneratedRow } from '@/core/contracts/db';

export function Difference({ lang, word, other }: { lang: string; word: string; other: string }) {
  const { language, settings } = useApp();
  const level = (language.level === 'A0' ? 'A1' : language.level) as Cefr;
  const [row, setRow] = useState<GeneratedRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const block = aiBlock(settings, settings.llm.provider);
  const body = row?.content as DifferenceBody | undefined;

  const ask = async () => {
    setBusy(true);
    setError(null);
    try {
      setRow((await generateMaterial({ lang, kind: 'difference', level, source: `${word} | ${other}` })).row);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Something went wrong.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-1.5">
      {!body && (
        <Button variant="ghost" size="sm" icon={Sparkles} loading={busy} disabled={block !== null} onClick={() => void ask()}><UiText source={'{0} or {1}?'} values={[word, other]} /></Button>
      )}
      {block === 'max' && !body && (
        <span className="ml-2 text-[12.5px] text-ink-faint"><UiText source={'Needs Lingua+ Max. {0}'} values={[<MaxLink className="underline" />]} /></span>
      )}
      {block === 'key' && !body && (
        <span className="ml-2 text-[12.5px] text-ink-faint"><UiText source={'Needs your AI key: {0}'} values={[<Link to="/settings/ai" className="font-semibold underline"><UiText source={'Settings › AI'} /></Link>]} /></span>
      )}
      {error && <p className="mt-1 text-[12.5px] text-accent-text">{error.message} {error instanceof LlmError && error.kind === 'no-plan' && <MaxLink className="underline" />}</p>}
      {body && row && (
        <div className="mt-2 rounded-2xl bg-surface p-3.5">
          <p className="text-[14.5px] font-semibold">{body.summary}</p>
          <ul className="mt-2 space-y-2">
            {body.rows.map((r) => (
              <li key={r.word} className="text-[14px] text-ink-soft">
                <span lang={lang} className="font-serif text-[16px] font-semibold text-ink">{r.word}</span>: {r.use}
                <span lang={lang} className="block font-serif text-[15px] italic">{r.example}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2">
            <GeneratedLabel row={row} onReported={() => setRow(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
