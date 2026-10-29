// Mark the breaks (6-9): a line (or a word) written without its spaces, to be cut where the words (or the syllables) begin, after
// hearing it. Tap between two letters to put a break there or take it away. This is where connected speech is hardest to hear.
import { useEffect, useState } from 'react';
import { cx } from '@/lib/cx';
import type { Phase } from '@/features/lesson/kit';

/** The raw text with a space at each break (an index is the letter a new part starts at). */
export function applyBreaks(raw: string, breaks: ReadonlySet<number>): string {
  const letters = [...raw];
  return letters.map((c, i) => (breaks.has(i) && i > 0 ? ` ${c}` : c)).join('');
}

export function SplitView({ raw, lang, value, onChange, phase, prompt }: { raw: string; lang: string; value: string; onChange: (v: string) => void; phase: Phase; prompt: string }) {
  const letters = [...raw];
  const [breaks, setBreaks] = useState<Set<number>>(new Set());
  // A new exercise starts with no breaks, and the answer is the text as it stands.
  useEffect(() => {
    setBreaks(new Set());
    onChange(raw);
  }, [raw]);
  const toggle = (i: number) => {
    if (phase !== 'answer') return;
    const next = new Set(breaks);
    if (!next.delete(i)) next.add(i);
    setBreaks(next);
    onChange(applyBreaks(raw, next));
  };
  return (
    <div className="text-center">
      <p className="mb-4 text-[15px] text-ink-soft">{prompt}</p>
      <p lang={lang} className="inline-flex flex-wrap justify-center font-serif text-[clamp(1.5rem,5vw,2.1rem)] leading-[2.4]" aria-label={value || raw}>
        {letters.map((c, i) => (
          <span key={i} className="inline-flex items-center">
            {i > 0 && (
              <button
                type="button"
                aria-label={breaks.has(i) ? `Remove the break before ${c}` : `Break before ${c}`}
                aria-pressed={breaks.has(i)}
                onClick={() => toggle(i)}
                className={cx('mx-px h-9 rounded-sm transition-all', breaks.has(i) ? 'mx-1.5 w-1.5 bg-accent' : 'w-1 hover:bg-line-strong')}
              />
            )}
            {c}
          </span>
        ))}
      </p>
      <p className="mt-3 text-[13px] text-ink-faint">Tap between letters to cut. Your line: <span lang={lang} className="font-serif text-[15px] text-ink">{value || raw}</span></p>
    </div>
  );
}
