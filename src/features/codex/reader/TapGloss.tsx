import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { ChevronRight, RotateCcw } from 'lucide-react';
import type { WordState } from '@/data/types';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import type { WordEngine } from './engine';
import { usePortalRoot } from '@/design/hooks/usePortalRoot';

interface TapGlossProps {
  el: HTMLElement;
  engine: WordEngine;
  onClose: () => void;
  onOpen: (el: HTMLElement) => void;
}

/** Touch: a small bubble above the tapped word with its translation and quick state pills. */
export function TapGloss({ el, engine, onClose, onOpen }: TapGlossProps) {
  const portalRoot = usePortalRoot();
  const norm = el.dataset.n!;
  const [gloss, setGloss] = useState(() => engine.gloss(norm)?.text ?? null);
  const [state, setState] = useState<WordState>(() => engine.state(norm));
  const [pos, setPos] = useState<{ x: number; y: number; below: boolean } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    el.classList.add('is-active');
    return () => el.classList.remove('is-active');
  }, [el]);

  useEffect(() => {
    if (gloss) return;
    let alive = true;
    void engine.ensureGloss(norm, el.textContent ?? norm).then((g) => alive && setGloss(g?.text ?? ''));
    return () => {
      alive = false;
    };
  }, [engine, norm, el, gloss]);

  useLayoutEffect(() => {
    const bubble = ref.current;
    if (!bubble) return;
    const r = el.getBoundingClientRect();
    const w = bubble.offsetWidth;
    const h = bubble.offsetHeight;
    const x = Math.min(Math.max(10, r.left + r.width / 2 - w / 2), window.innerWidth - w - 10);
    const below = r.top - h - 12 < 60;
    setPos({ x, y: below ? r.bottom + 10 : r.top - h - 10, below });
  }, [el, gloss]);

  const choose = (next: WordState) => {
    engine.set(norm, next, el);
    setState(next);
    window.setTimeout(onClose, 220);
  };

  return createPortal(
    <motion.div
      ref={ref}
      role="dialog"
      aria-label={`Translation of ${el.textContent}`}
      className="no-callout fixed top-0 left-0 z-[70] w-max max-w-[min(320px,calc(100vw-20px))] rounded-2xl bg-inverse p-2 text-on-inverse shadow-elev-3"
      style={{ x: pos?.x ?? -9999, y: pos?.y ?? -9999 }}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: pos ? 1 : 0, scale: 1 }}
      transition={spring.snappy}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button type="button" onClick={() => onOpen(el)} className="flex w-full items-center gap-2 rounded-xl px-2.5 pt-1.5 pb-2 text-left">
        <span className="min-w-0 flex-1">
          <span className={cx('block text-[16px] leading-snug font-semibold', gloss === null && 'animate-pulse opacity-60')}>
            {gloss === null ? 'Translating…' : gloss || 'No translation found'}
          </span>
        </span>
        <ChevronRight size={18} className="shrink-0 opacity-55" aria-label="More" />
      </button>
      <div className="flex gap-1.5">
        <Pill active={state === 1} onClick={() => choose(1)}>
          Known
        </Pill>
        <Pill active={state === 2} onClick={() => choose(2)} tone="accent">
          Learning
        </Pill>
        {state !== 0 && (
          <button
            type="button"
            aria-label="Reset to unseen"
            onClick={() => choose(0)}
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-on-inverse/10 text-on-inverse/75 active:scale-95"
          >
            <RotateCcw size={16} aria-hidden />
          </button>
        )}
      </div>
    </motion.div>,
    portalRoot,
  );
}

function Pill({ active, onClick, children, tone = 'sage' }: { active: boolean; onClick: () => void; children: string; tone?: 'sage' | 'accent' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'h-10 flex-1 rounded-xl px-4 text-[14px] font-bold transition-[transform,background-color,color] duration-150 active:scale-95',
        active ? (tone === 'accent' ? 'bg-accent-fill text-on-accent' : 'bg-sage-text text-bg') : 'bg-on-inverse/10 text-on-inverse',
      )}
    >
      {children}
    </button>
  );
}
