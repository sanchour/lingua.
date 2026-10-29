// Boxes drawn over a picture for an image-occlusion card (6-3b): drag to draw one, tap one to take it away.
import { useRef, useState } from 'react';
import type { Note } from '@/data/types';

type Box = NonNullable<Note['occlusion']>[number];

export function OcclusionEditor({ src, boxes, onChange }: { src: string; boxes: Box[]; onChange: (b: Box[]) => void }) {
  const area = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<Box | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  const at = (e: React.PointerEvent) => {
    const r = area.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };
  const rect = (a: { x: number; y: number }, b: { x: number; y: number }): Box => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) });

  return (
    <div>
      <div
        ref={area}
        className="relative inline-block max-w-full cursor-crosshair touch-none select-none"
        onPointerDown={(e) => {
          start.current = at(e);
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => start.current && setDraft(rect(start.current, at(e)))}
        onPointerUp={(e) => {
          if (start.current) {
            const box = rect(start.current, at(e));
            // A tap is not a box: it must be big enough to cover something.
            if (box.w > 0.02 && box.h > 0.02) onChange([...boxes, box]);
          }
          start.current = null;
          setDraft(null);
        }}
      >
        <img src={src} alt="" draggable={false} className="max-h-72 max-w-full rounded-xl object-contain" />
        {[...boxes, ...(draft ? [draft] : [])].map((b, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Take box ${i + 1} away`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => i < boxes.length && onChange(boxes.filter((_, n) => n !== i))}
            className="absolute rounded-md border-2 border-accent bg-ink/80"
            style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` }}
          />
        ))}
      </div>
      <p className="mt-2 text-[12.5px] text-ink-faint">Drag over the parts to hide. Tap a box to take it away. {boxes.length} {boxes.length === 1 ? 'box' : 'boxes'}.</p>
    </div>
  );
}
