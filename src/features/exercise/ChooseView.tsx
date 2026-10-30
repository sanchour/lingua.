// Choose one of several (6-9): after hearing a word, its meaning or its picture. One tap answers; the right one is marked after.
import { cx } from '@/lib/cx';
import type { ChooseBody } from '@/core/contracts/exercise';
import type { Phase } from '@/features/lesson/kit';

export function ChooseView({ body, lang, answer, picked, phase, onPick }: { body: ChooseBody; lang: string; answer: number; picked: number | null; phase: Phase; onPick: (i: number) => void }) {
  const pictures = body.options.some((o) => o.image);
  return (
    <div>
      <p className="mb-4 text-center text-[15px] text-ink-soft">{body.prompt}</p>
      <div className={cx('grid gap-3', pictures ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2')} role="radiogroup" aria-label={body.prompt}>
        {body.options.map((o, i) => {
          const done = phase !== 'answer';
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={picked === i}
              disabled={done}
              onClick={() => onPick(i)}
              lang={o.text ? undefined : lang}
              className={cx(
                'rounded-2xl border p-3 text-left transition-colors',
                !done && 'border-line hover:bg-surface',
                done && i === answer && 'border-sage bg-sage-soft',
                done && picked === i && i !== answer && 'border-accent bg-accent-soft',
                done && picked !== i && i !== answer && 'border-line text-ink-faint',
              )}
            >
              {o.image && <img src={o.image} alt="" className="mx-auto max-h-32 rounded-xl object-contain" />}
              {o.text && <span className="block text-[17px]">{o.text}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
