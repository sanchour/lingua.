// Melody and stress (6-10): hear the same words as a statement and as a question and say which; pick the word of an answer that carries
// the stress. "Say these" sends the pairs to Say it, which checks which way your own voice goes at the end. The voice is the device's, which
// may not make the melody as clearly as a person does; if you cannot hear it, the Say it shapes below show it on your own voice.
import { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { answerWords, intonationOf, isStressed, stressOf } from '@/core/sounds/intonation';
import type { IntonationItem } from '@/core/sounds/intonation';
import { shuffle } from '@/core/srs/ludus';
import { SpeakButton } from '@/features/speech/SpeakButton';
import { cx } from '@/lib/cx';

type Expect = Record<string, 'rise' | 'fall'>;
type Stress = Record<string, string>;

function StatementOrQuestion({ lang, items, rule, onSay }: { lang: string; items: IntonationItem[]; rule: string; onSay: () => void }) {
  const [queue, setQueue] = useState(() => shuffle(items, Math.random));
  const [picked, setPicked] = useState<IntonationItem['kind'] | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const round = queue[0];
  const pick = (kind: IntonationItem['kind']) => {
    if (picked || !round) return;
    setPicked(kind);
    setScore((s) => ({ right: s.right + Number(kind === round.kind), total: s.total + 1 }));
  };
  return (
    <div>
      <h3 className="text-[15px] font-bold">Statement or question?</h3>
      <p className="mt-1 max-w-2xl text-[14px] text-ink-soft">{rule}</p>
      {round ? (
        <div className="mt-3">
          <div className="flex items-center gap-3">
            <SpeakButton lang={lang} text={round.text} size={26} label="Hear the sentence" className="size-14 rounded-full bg-sunken text-ink" />
            <span className="text-[13px] text-ink-faint">
              {queue.length} to go · {score.right} of {score.total} right
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(['statement', 'question'] as const).map((k) => (
              <button
                key={k}
                type="button"
                disabled={picked !== null}
                onClick={() => pick(k)}
                className={cx('flex h-11 items-center gap-1.5 rounded-xl border px-4 text-[14px] font-semibold capitalize', !picked && 'border-line hover:bg-surface', picked && k === round.kind && 'border-sage bg-sage-soft', picked === k && k !== round.kind && 'border-accent bg-accent-soft')}
              >
                {k}
                {picked && k === round.kind && <Check size={15} aria-label="Right answer" />}
                {picked === k && k !== round.kind && <X size={15} aria-label="Not this one" />}
              </button>
            ))}
            {picked && (
              <>
                <span lang={lang} className="font-serif text-[18px]">
                  {round.text}
                </span>
                <button type="button" onClick={() => (setPicked(null), setQueue((q) => q.slice(1)))} className="h-10 rounded-xl bg-inverse px-4 text-[14px] font-semibold text-on-inverse">
                  Next
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-[15px]">
          Done: {score.right} of {score.total} right.{' '}
          <button type="button" onClick={() => (setScore({ right: 0, total: 0 }), setQueue(shuffle(items, Math.random)))} className="underline underline-offset-4">
            Again
          </button>
        </p>
      )}
      <button type="button" onClick={onSay} className="mt-3 h-10 rounded-xl border border-line px-4 text-[14px] font-semibold hover:bg-surface">
        Say these
      </button>
    </div>
  );
}

function WhichWord({ lang, onSay }: { lang: string; onSay: (words: string[], expect?: Expect, stress?: Stress) => void }) {
  const items = useMemo(() => stressOf(lang), [lang]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const item = items[i % items.length];
  if (!item) return null;
  return (
    <div>
      <h3 className="text-[15px] font-bold">Which word carries the stress?</h3>
      <p className="mt-1 max-w-2xl text-[14px] text-ink-soft">In an answer, the word that gives the new information is said with the most weight. Read the question, then choose that word in the answer.</p>
      <p lang={lang} className="mt-3 font-serif text-[19px] font-semibold">
        {item.question}
      </p>
      <div lang={lang} className="mt-2 flex flex-wrap items-center gap-2">
        <SpeakButton lang={lang} text={item.answer} size={16} label="Hear the answer" className="size-9 rounded-full bg-sunken text-ink" />
        {answerWords(item).map((w, k) => (
          <button
            key={k}
            type="button"
            disabled={picked !== null}
            onClick={() => setPicked(w)}
            className={cx('rounded-xl border px-3 py-1.5 font-serif text-[18px]', !picked && 'border-line hover:bg-surface', picked && isStressed(w, item) && 'border-sage bg-sage-soft', picked === w && !isStressed(w, item) && 'border-accent bg-accent-soft')}
          >
            {w}
          </button>
        ))}
      </div>
      {picked && (
        <p className="mt-2 flex items-center gap-3 text-[14px] text-ink-soft" role="status">
          {isStressed(picked, item) ? 'Yes: ' : 'Not quite: '}“{item.stressed}” is what the question asks for, so it carries the stress.
          <button type="button" onClick={() => onSay([item.answer], undefined, { [item.answer]: item.stressed })} className="h-9 rounded-xl border border-line px-3 text-[13.5px] font-semibold hover:bg-surface">
            Say the answer
          </button>
          <button type="button" onClick={() => (setPicked(null), setI((n) => n + 1))} className="h-9 rounded-xl bg-inverse px-3 text-[13.5px] font-semibold text-on-inverse">
            Next
          </button>
        </p>
      )}
    </div>
  );
}

export function Intonation({ lang, onSay }: { lang: string; onSay: (words: string[], expect?: Expect, stress?: Stress) => void }) {
  const into = intonationOf(lang);
  if (!into) return null;
  const say = () => onSay(into.items.map((i) => i.text), into.measurable ? Object.fromEntries(into.items.map((i) => [i.text, i.kind === 'question' ? 'rise' : 'fall'])) : undefined);
  return (
    <section aria-labelledby="into-h" className="space-y-6 rounded-3xl border border-line bg-raised p-5">
      <h2 id="into-h" className="font-serif text-2xl font-semibold">
        Melody and stress
      </h2>
      <StatementOrQuestion lang={lang} items={into.items} rule={into.rule} onSay={say} />
      <WhichWord lang={lang} onSay={onSay} />
    </section>
  );
}
