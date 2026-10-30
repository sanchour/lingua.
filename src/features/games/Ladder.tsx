// Word ladder (6-21, F0169): from one word to another, one letter at a time, each step a real word of the language's own list.
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowDown, Lightbulb, Undo2 } from 'lucide-react';
import type { Best } from '@/core/games/bests';
import type { GameDef } from '@/core/games/defs';
import { MAX_HINTS } from '@/core/games/hangman';
import { buildGraph, distancesTo, hint, makeLadder, MAX_TRIES, startLadder, starsOf, step, undo } from '@/core/games/ladder';
import type { Graph, Try } from '@/core/games/ladder';
import type { LadderState } from '@/core/games/ladder';
import { isRtl } from '@/core/lang/languages';
import { normalizeWord } from '@/core/text/normalize';
import { ladderWords } from '@/data/games';
import { buttonClasses } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { RoundRunner, useSettleOnce } from './RoundRunner';
import type { BoardProps } from './RoundRunner';

interface Entry {
  state: LadderState;
  graph: Graph;
  dist: Map<string, number>;
  gloss: Map<string, string | undefined>;
}

const WHY: Record<Try, string> = { ok: '', notword: 'is not on the word list.', notone: 'is not one letter away from the last word.', used: 'is already on your ladder.' };

/** A shortest way on from the last word, for the end of a lost ladder. */
function wayOn(s: LadderState, graph: Graph, dist: Map<string, number>): string[] {
  const way: string[] = [];
  let at = s.path[s.path.length - 1];
  while (at !== s.end && dist.has(at)) {
    const n = graph.get(at)!.find((w) => dist.get(w) === dist.get(at)! - 1);
    if (!n) break;
    way.push(n);
    at = n;
  }
  return way;
}

function Board({ entry, lang, settle }: BoardProps<Entry>) {
  const rtl = isRtl(lang);
  const { graph, dist, gloss } = entry;
  const [s, setS] = useState(entry.state);
  const [typed, setTyped] = useState('');
  const [tried, setTried] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const over = s.status !== 'playing';
  useSettleOnce(over, () => settle({ won: s.status === 'won', stars: starsOf(s), hints: s.hints, message: s.status === 'won' ? `Reached ${s.end} in ${s.path.length - 1} steps (the shortest is ${s.steps})` : `Not reached. One way: ${[s.path[s.path.length - 1], ...wayOn(s, graph, dist)].join(' → ')}` }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const word = normalizeWord(typed.trim(), lang);
    if (!word) return;
    setTried(typed.trim());
    setS((x) => step(x, graph, word));
    setTyped('');
    input.current?.focus();
  };
  const word = (w: string, emphasis?: boolean) => (
    <span className={cx('font-serif text-2xl', emphasis ? 'font-semibold' : '')} lang={lang} dir={rtl ? 'rtl' : undefined}>
      {w}
    </span>
  );
  return (
    <div className="max-w-md">
      <p className="text-[14px] text-ink-soft">
        {s.steps} steps at the shortest. Change one letter each time, and every word must be a real one.
      </p>
      <ol className="mt-4 space-y-2">
        {s.path.map((w, i) => (
          <li key={i} className="flex items-baseline gap-3 rounded-2xl border border-line/70 bg-surface px-5 py-3">
            {word(w, i === 0)}
            {i === 0 && gloss.get(w) && <span className="text-[14px] text-ink-soft">{gloss.get(w)}</span>}
          </li>
        ))}
        {!over && (
          <li>
            <form onSubmit={submit} className="flex items-center gap-3">
              <ArrowDown size={18} className="text-ink-faint" aria-hidden />
              <input ref={input} autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} lang={lang} dir={rtl ? 'rtl' : undefined} autoComplete="off" spellCheck={false} aria-label="The next word" placeholder="Next word" className="h-12 w-52 rounded-xl border border-line bg-raised px-4 font-serif text-xl outline-none focus:border-line-strong" />
              <button type="submit" disabled={!typed.trim()} className={buttonClasses('primary', 'md') + ' disabled:opacity-50'}>
                Add
              </button>
            </form>
          </li>
        )}
        <li className="flex items-baseline gap-3 rounded-2xl border border-dashed border-line-strong px-5 py-3">
          {word(s.end, true)}
          {gloss.get(s.end) && <span className="text-[14px] text-ink-soft">{gloss.get(s.end)}</span>}
        </li>
      </ol>
      <p className="mt-3 min-h-6 text-[14px] text-accent-text" role="alert">
        {s.last && s.last !== 'ok' && (
          <>
            <bdi lang={lang}>{tried}</bdi> {WHY[s.last]} ({s.wrong} of {MAX_TRIES} wrong tries)
          </>
        )}
      </p>
      {!over && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => setS(undo)} disabled={s.path.length < 2} className={buttonClasses('secondary', 'sm') + ' disabled:opacity-50'}>
            <Undo2 size={14} aria-hidden /> Take back the last word
          </button>
          <button type="button" onClick={() => setS((x) => hint(x, graph, dist))} disabled={s.hints >= MAX_HINTS} className={buttonClasses('secondary', 'sm') + ' disabled:opacity-50'}>
            <Lightbulb size={14} aria-hidden /> Give the next word <span className="text-ink-faint">{MAX_HINTS - s.hints} left, costs a star</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function Ladder({ lang, def, best }: { lang: string; def: GameDef; items?: unknown; best?: Best }) {
  return (
    <RoundRunner<Entry>
      lang={lang}
      def={def}
      best={best}
      unit="Ladder"
      rtl={isRtl(lang)}
      intro="Three ladders. Each starts at one word and has to reach another, changing one letter at a time."
      make={async (random) => {
        const list = await ladderWords(lang);
        const graph = buildGraph(list.map((w) => w.word));
        const gloss = new Map(list.map((w) => [w.word, w.gloss]));
        const out: Entry[] = [];
        for (const steps of [3, 4, 3, 4]) {
          const made = makeLadder(graph, steps, random);
          if (made && !out.some((e) => e.state.start === made.start)) out.push({ state: startLadder(made.start, made.end, steps), graph, dist: distancesTo(graph, made.end), gloss });
          if (out.length === def.round) break;
        }
        return out;
      }}
      empty="The language’s word list has no ladders in it yet."
      terms={() => []}
      label={(e) => ({ title: `${e.state.start} → ${e.state.end}`, detail: `${e.state.steps} steps` })}
      Board={Board}
      rules={<p>Type the next word and press Enter. A word that is not on the language’s list, not one letter away, or already used is a wrong try; five and the ladder is lost. Three stars: a hint costs one, so does going two steps over the shortest way.</p>}
    />
  );
}
