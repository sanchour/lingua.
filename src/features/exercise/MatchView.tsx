// The matching games (6-4b): tap one side, then what goes with it. A wrong pair shakes and counts as a mistake; done when all match.
// Sound games speak on a tap, picture games show the picture instead of a label.
import { useMemo, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { motion } from 'motion/react';
import type { MatchBody } from '@/core/contracts/exercise';
import { shuffle } from '@/core/srs/ludus';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { speak } from '@/services/speech/voice';

type Side = { side: 'left' | 'right'; index: number };

export function MatchView({ body, lang, onDone, random }: { body: MatchBody; lang: string; onDone: (mistakes: number) => void; random: () => number }) {
  const rightOrder = useMemo(() => shuffle(body.pairs.map((_, i) => i), random), [body, random]);
  const [picked, setPicked] = useState<Side | null>(null);
  const [matched, setMatched] = useState<ReadonlySet<number>>(new Set());
  const [wrong, setWrong] = useState<Side[]>([]);
  const mistakes = useRef(0);

  const say = (i: number) => {
    const text = body.pairs[i].say;
    if (text) void speak(lang, text).catch(() => undefined);
  };

  const choose = (s: Side) => {
    if (matched.has(s.index) && s.side === 'left') return;
    if (s.side === 'right' && body.what === 'sound') say(s.index);
    if (!picked || picked.side === s.side) return setPicked(s);
    const [left, right] = picked.side === 'left' ? [picked, s] : [s, picked];
    setPicked(null);
    if (left.index === right.index) {
      const next = new Set(matched).add(left.index);
      setMatched(next);
      if (next.size === body.pairs.length) window.setTimeout(() => onDone(mistakes.current), 350);
    } else {
      mistakes.current++;
      setWrong([left, right]);
      window.setTimeout(() => setWrong([]), 450);
    }
  };

  const state = (s: Side) => (matched.has(s.index) ? 'done' : wrong.some((w) => w.side === s.side && w.index === s.index) ? 'wrong' : picked?.side === s.side && picked.index === s.index ? 'picked' : 'idle');
  const tile = (s: Side, children: React.ReactNode, lg?: boolean) => {
    const st = state(s);
    return (
      <motion.button
        key={`${s.side}${s.index}`}
        type="button"
        disabled={st === 'done'}
        onClick={() => choose(s)}
        animate={st === 'wrong' ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={st === 'wrong' ? { duration: 0.35 } : spring.snappy}
        className={cx(
          'flex min-h-14 items-center justify-center rounded-2xl border-2 px-4 py-3 text-center text-[16px] leading-snug transition-colors',
          lg && 'font-serif text-[19px] font-semibold',
          st === 'done' ? 'border-sage/40 bg-sage-soft text-sage-text opacity-60' : st === 'wrong' ? 'border-accent bg-accent-soft' : st === 'picked' ? 'border-ink bg-surface' : 'border-line bg-raised hover:border-line-strong',
        )}
      >
        {children}
      </motion.button>
    );
  };

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      <div className="space-y-3" aria-label="In the language">
        {body.pairs.map((p, i) => (
          <div key={i} lang={lang} className="contents">
            {tile({ side: 'left', index: i }, p.left, true)}
          </div>
        ))}
      </div>
      <div className="space-y-3" aria-label="What goes with them">
        {rightOrder.map((i) => {
          const p = body.pairs[i];
          return tile(
            { side: 'right', index: i },
            body.what === 'sound' ? (
              <span className="inline-flex items-center gap-2">
                <Volume2 size={18} aria-hidden /> {p.right}
              </span>
            ) : body.what === 'picture' && p.image ? (
              <img src={p.image} alt={p.right} className="max-h-24 rounded-lg object-contain" />
            ) : (
              p.right
            ),
          );
        })}
      </div>
    </div>
  );
}
