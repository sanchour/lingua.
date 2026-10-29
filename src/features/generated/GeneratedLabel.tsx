// The quiet "Generated" label beside everything Max made (6-6): what was checked on hover, and Report when it is wrong.
import { Flag, Sparkles } from 'lucide-react';
import type { GeneratedRow } from '@/core/contracts/db';
import { labelFor } from '@/core/generate/generate';
import { reportGenerated } from '@/data/generated';
import { toast } from '@/state/ui';

export function GeneratedLabel({ row, onReported }: { row: GeneratedRow; onReported?: () => void }) {
  const { text, detail } = labelFor(row);
  return (
    <span className="inline-flex items-center gap-2 text-[12.5px] text-ink-faint">
      <span title={detail} className="inline-flex items-center gap-1 rounded-full bg-sunken px-2.5 py-0.5 font-semibold">
        <Sparkles size={12} aria-hidden /> {text}
      </span>
      <button
        type="button"
        onClick={() => {
          void reportGenerated(row.id).then(() => {
            toast('Thank you. This won’t be offered again.', { duration: 2400 });
            onReported?.();
          });
        }}
        className="inline-flex items-center gap-1 underline decoration-line-strong underline-offset-4 hover:text-ink"
      >
        <Flag size={12} aria-hidden /> Report
      </button>
    </span>
  );
}
