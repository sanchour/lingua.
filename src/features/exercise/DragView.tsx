// Words dragged into order (6-4b). The pointer drags a tile from the bank to the line, or along the line; a click moves a tile
// too, and the arrow keys move the one in focus, so it works without dragging.
import { useRef, useState } from 'react';
import { cx } from '@/lib/cx';
import { isRtl } from '@/core/lang/languages';
import type { Phase } from '@/features/lesson/kit';

/** The line with tile `i` put at position `at` (from the bank, or moved from elsewhere in the line: the gap it leaves is closed first). */
export function placeTile(line: number[], i: number, at: number): number[] {
  const rest = line.filter((x) => x !== i);
  const from = line.indexOf(i);
  const to = Math.min(from >= 0 && at > from ? at - 1 : at, rest.length);
  return [...rest.slice(0, to), i, ...rest.slice(to)];
}

interface Props {
  prompt: string;
  tiles: string[];
  lang: string;
  /** Indexes of the tiles in the line, in order. */
  value: number[];
  onChange: (v: number[]) => void;
  phase: Phase;
}

export function DragView({ prompt, tiles, lang, value, onChange, phase }: Props) {
  const drag = useRef<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const rtl = isRtl(lang);
  const bank = tiles.map((_, i) => i).filter((i) => !value.includes(i));
  const locked = phase !== 'answer';

  const place = (i: number, at: number) => onChange(placeTile(value, i, at));

  const chip = (i: number, inLine: boolean, at = 0) => (
    <button
      key={i}
      type="button"
      lang={lang}
      draggable={!locked}
      disabled={locked}
      onDragStart={() => (drag.current = i)}
      onDragEnd={() => {
        drag.current = null;
        setOver(null);
      }}
      onDragOver={(e) => {
        if (inLine) {
          e.preventDefault();
          setOver(at);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        // A drop on a word is that word's: the line around it must not take it to the end as well.
        if (inLine) e.stopPropagation();
        if (drag.current !== null && inLine) place(drag.current, at);
        setOver(null);
      }}
      onClick={() => (inLine ? onChange(value.filter((x) => x !== i)) : onChange([...value, i]))}
      onKeyDown={(e) => {
        if (!inLine || locked) return;
        const k = value.indexOf(i);
        if (e.key === 'ArrowLeft' && k > 0) onChange(value.map((x, n) => (n === k - 1 ? i : n === k ? value[k - 1] : x)));
        if (e.key === 'ArrowRight' && k < value.length - 1) onChange(value.map((x, n) => (n === k + 1 ? i : n === k ? value[k + 1] : x)));
      }}
      className={cx(
        'cursor-grab rounded-xl border-2 border-line bg-raised px-3.5 py-2 font-serif text-[19px] shadow-sm transition-colors active:cursor-grabbing',
        inLine && over === at && 'border-ink',
        !locked && 'hover:border-line-strong',
      )}
    >
      {tiles[i]}
    </button>
  );

  return (
    <div className="space-y-6">
      <p className="text-center text-[16px] text-ink-soft italic">{prompt}</p>
      <div
        dir={rtl ? 'rtl' : undefined}
        aria-label="Your sentence, in order"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (drag.current !== null) place(drag.current, value.length);
          setOver(null);
        }}
        className="flex min-h-20 flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed border-line-strong p-3"
      >
        {value.length === 0 && <span className="px-2 text-[14px] text-ink-faint">Drag the words here, or tap them in order.</span>}
        {value.map((i, at) => chip(i, true, at))}
      </div>
      <div dir={rtl ? 'rtl' : undefined} aria-label="The words" className="flex flex-wrap justify-center gap-2">
        {bank.map((i) => chip(i, false))}
      </div>
      {phase === 'answer' && <p className="text-center text-[12.5px] text-ink-faint">Arrow keys move a word in the line.</p>}
    </div>
  );
}
