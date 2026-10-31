import { UiText, useUi } from '@/design/i18n/UiText';
// Minimal pairs, heard (6-10): one word of a pair is said, the learner says which. A miss says what to listen for and comes back once.
// Answers go to the learner's record as listening, against the sound that was missed.
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Dexie from 'dexie';
import { Check, X } from 'lucide-react';
import { pairsOf } from '@/core/sounds/pairs';
import type { MinimalPair } from '@/core/sounds/pairs';
import { shuffle } from '@/core/srs/ludus';
import { db } from '@/data/db';
import { recordEvidence } from '@/data/learner';
import { SpeakButton } from '@/features/speech/SpeakButton';
import { cx } from '@/lib/cx';

interface Round {
  pair: MinimalPair;
  /** Which word is said: 0 is a, 1 is b. */
  said: 0 | 1;
}

const roundsOf = (pairs: MinimalPair[]): Round[] => shuffle(pairs, Math.random).map((pair) => ({ pair, said: Math.random() < 0.5 ? 0 : 1 }));

/** The sounds a learner has missed in minimal pairs, most missed first. */
export function useWeakSounds(lang: string): Array<{ sound: string; misses: number }> {
  return (
    useLiveQuery(async () => {
      const rows = await db.evidence.where('[lang+skill+at]').between([lang, 'listening', Dexie.minKey], [lang, 'listening', Dexie.maxKey]).filter((r) => r.outcome === 'wrong' && r.itemKey.startsWith('sound:')).toArray();
      const count = new Map<string, number>();
      for (const r of rows) count.set(r.itemKey.slice(6), (count.get(r.itemKey.slice(6)) ?? 0) + 1);
      return [...count].map(([sound, misses]) => ({ sound, misses })).sort((a, b) => b.misses - a.misses).slice(0, 6);
    }, [lang]) ?? []
  );
}

/** The pairs that use one of these sounds; all of them for none. */
export const pairsWith = (lang: string, focus: string[] | null): MinimalPair[] => pairsOf(lang).filter((p) => !focus || p.sounds.some((s) => focus.includes(s)));

export function MinimalPairs({ lang, focus = null, onSay, onFocus }: { lang: string; focus?: string[] | null; onSay?: (words: string[]) => void; onFocus?: (sounds: string[] | null) => void }) {
  const translateUi = useUi();
  const pairs = useMemo(() => pairsWith(lang, focus), [lang, focus]);
  const weak = useWeakSounds(lang);
  const [queue, setQueue] = useState<Round[]>(() => roundsOf(pairs));
  const [picked, setPicked] = useState<0 | 1 | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const round = queue[0];
  if (!pairsOf(lang).length) return null;

  const answer = (i: 0 | 1) => {
    if (picked !== null || !round) return;
    setPicked(i);
    const right = i === round.said;
    setScore((s) => ({ right: s.right + Number(right), total: s.total + 1 }));
    const heard = round.pair.sounds[round.said];
    void recordEvidence({
      lang,
      at: Date.now(),
      skill: 'listening',
      room: 'cursus',
      item: { type: 'sound', soundId: heard },
      outcome: right ? 'right' : 'wrong',
      assisted: false,
      category: right ? undefined : 'mishearing',
      given: right ? undefined : [round.pair.a, round.pair.b][i],
      expected: right ? undefined : [round.pair.a, round.pair.b][round.said],
      kind: 'minimal-pair',
    }).catch(() => undefined);
    // A missed pair comes back once, later.
    if (!right) setQueue((q) => [...q, { pair: round.pair, said: (1 - round.said) as 0 | 1 }]);
  };
  const next = () => {
    setPicked(null);
    setQueue((q) => q.slice(1));
  };

  return (
    <section aria-labelledby="pairs-h" className="rounded-3xl border border-line bg-raised p-5">
      <h2 id="pairs-h" className="font-serif text-2xl font-semibold"><UiText source={'Which did you hear?'} /></h2>
      <p className="mt-1 text-[14px] text-ink-soft"><UiText source={'Two words that differ in one sound. Hear one, then say which it was. A miss says what to listen for.'} /></p>
      {focus && (
        <p className="mt-2 text-[13.5px]"><UiText source={'Only pairs with {0}.{1}{2}'} values={[focus.map((f) => `“${f}”`).join(', '), ' ', <button type="button" onClick={() => onFocus?.(null)} className="underline underline-offset-4"><UiText source={'Show all pairs'} /></button>]} /></p>
      )}
      {weak.length > 0 && (
        <p className="mt-2 text-[13.5px] text-ink-soft"><UiText source={'Sounds you mix up:{0}{1}{2}'} values={[' ', weak.map((w) => (
            <button key={w.sound} type="button" onClick={() => onFocus?.([w.sound])} title={translateUi('Missed {0} time{1}: practise pairs with it', [w.misses, w.misses === 1 ? '' : 's'])} className="mr-1.5 rounded-full border border-line px-2.5 py-0.5 font-serif text-[15px] hover:bg-surface">
              {w.sound} <span className="font-sans text-[11px] text-ink-faint">×{w.misses}</span>
            </button>
          )), <button type="button" onClick={() => onFocus?.(weak.map((w) => w.sound))} className="underline underline-offset-4"><UiText source={'Practise them all'} /></button>]} /></p>
      )}
      {round ? (
        <div className="mt-4">
          <div className="flex items-center gap-3">
            <SpeakButton lang={lang} text={[round.pair.a, round.pair.b][round.said].split(' ')[0]} size={30} label="Hear the word" className="size-16 rounded-full bg-sunken text-ink" />
            <span className="text-[13px] text-ink-faint"><UiText source={'{0} to go · {1} of {2} right'} values={[queue.length, score.right, score.total]} /></span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {([0, 1] as const).map((i) => {
              const word = [round.pair.a, round.pair.b][i];
              const done = picked !== null;
              const isSaid = i === round.said;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={done}
                  onClick={() => answer(i)}
                  className={cx(
                    'rounded-2xl border px-4 py-3.5 text-left transition-colors',
                    !done && 'border-line hover:bg-surface',
                    done && isSaid && 'border-sage bg-sage-soft',
                    done && !isSaid && picked === i && 'border-accent bg-accent-soft',
                    done && !isSaid && picked !== i && 'border-line text-ink-faint',
                  )}
                >
                  <span lang={lang} className="block font-serif text-[22px] font-semibold">
                    {word}
                  </span>
                  <span className="block text-[13px] text-ink-faint">{done ? round.pair.gloss[i] : ' '}</span>
                  {done && isSaid && <Check size={16} className="mt-1 text-sage-text" aria-label={translateUi('This was said')} />}
                  {done && !isSaid && picked === i && <X size={16} className="mt-1 text-accent-text" aria-label={translateUi('Not this one')} />}
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <div className="mt-3 flex items-center gap-3" role="status">
              <p className="flex-1 text-[14px] text-ink-soft"><UiText source={'{0}Listen for: {1}.'} values={[picked === round.said ? <UiText source={'Yes. '} /> : <UiText source={'Not quite. '} />, round.pair.contrast]} /></p>
              {onSay && (
                <button type="button" onClick={() => onSay([round.pair.a, round.pair.b])} title={translateUi('Say both words and see their shapes')} className="h-10 rounded-xl border border-line px-4 text-[14px] font-semibold hover:bg-surface"><UiText source={'Say both'} /></button>
              )}
              <button type="button" onClick={next} className="h-10 rounded-xl bg-inverse px-4 text-[14px] font-semibold text-on-inverse"><UiText source={'Next'} /></button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-[15px]">{pairs.length ? translateUi('Done: {0} of {1} right.', [score.right, score.total]) : translateUi('No pair uses that sound yet.')}</p>
          <button type="button" onClick={() => (setScore({ right: 0, total: 0 }), setQueue(roundsOf(pairs)), setPicked(null))} className="mt-2 h-10 rounded-xl border border-line px-4 text-[14px] font-semibold hover:bg-surface"><UiText source={'Again'} /></button>
        </div>
      )}
    </section>
  );
}
