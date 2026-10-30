// Word search (6-21, F0171 and F1194): the learner's words hidden in a grid. Drag across a word, or click its first and last letter.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, Flag } from 'lucide-react';
import type { Best } from '@/core/games/bests';
import type { GameDef } from '@/core/games/defs';
import { alphabetFor, letterKey, letterWord } from '@/core/games/letters';
import { usable } from '@/core/games/source';
import type { GameItem } from '@/core/games/source';
import { isRtl } from '@/core/lang/languages';
import { shuffle } from '@/core/srs/ludus';
import { lineBetween, makeWordSearch, searchStars, wordSpelled } from '@/core/games/wordsearch';
import type { Cell, WordSearch as Grid } from '@/core/games/wordsearch';
import { buttonClasses, ToggleRow } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { RoundRunner, useSettleOnce } from './RoundRunner';
import type { BoardProps } from './RoundRunner';

const MAX_SHOWN = 3;
const key = ([r, c]: Cell) => `${r},${c}`;
const same = (a: Cell, b: Cell) => a[0] === b[0] && a[1] === b[1];
const big = (m: string, lang: string) => {
  const up = m.toLocaleUpperCase(lang);
  return up.length === m.length ? up : m;
};

interface Entry {
  ws: Grid;
  meanings: boolean;
  items: Map<string, GameItem>;
}

function Board({ entry, lang, settle }: BoardProps<Entry>) {
  const { ws, meanings, items } = entry;
  const [found, setFound] = useState<ReadonlySet<number>>(new Set());
  const [shown, setShown] = useState<number[]>([]);
  const [gaveUp, setGaveUp] = useState(false);
  const [anchor, setAnchor] = useState<Cell | null>(null);
  const [end, setEnd] = useState<Cell | null>(null);
  const [miss, setMiss] = useState(0);
  const dragging = useRef(false);
  const won = found.size === ws.words.length;
  const over = won || gaveUp;

  const commit = (a: Cell, b: Cell) => {
    const cells = lineBetween(a, b);
    const i = cells && cells.length > 1 ? wordSpelled(ws, cells, found) : -1;
    if (i >= 0) setFound((f) => new Set([...f, i]));
    else if (cells && cells.length > 1) setMiss((n) => n + 1);
    setAnchor(null);
    setEnd(null);
  };
  const latest = useRef({ anchor, end, over, commit });
  useEffect(() => {
    latest.current = { anchor, end, over, commit };
  });
  useEffect(() => {
    const up = () => {
      const l = latest.current;
      if (!dragging.current) return;
      dragging.current = false;
      if (l.anchor && l.end && !same(l.anchor, l.end)) l.commit(l.anchor, l.end);
    };
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, []);

  const down = (cell: Cell) => {
    if (over) return;
    if (anchor && !dragging.current && !same(anchor, cell)) return commit(anchor, cell);
    dragging.current = true;
    setAnchor(cell);
    setEnd(cell);
  };
  const preview = useMemo(() => (anchor && end ? lineBetween(anchor, end) ?? [anchor] : []), [anchor, end]);
  const lit = new Set(preview.map(key));
  const done = new Set([...found, ...(gaveUp ? ws.words.keys() : [])].flatMap((i) => ws.words[i].cells.map(key)));
  const hinted = new Set(shown.filter((i) => !found.has(i)).map((i) => key(ws.words[i].cells[0])));
  const missed = ws.words.filter((_, i) => !found.has(i)).map((w) => w.term);

  useSettleOnce(over, () => settle({ won, stars: searchStars(won, shown.length), hints: shown.length, message: won ? `All ${ws.words.length} found` : `Found ${found.size} of ${ws.words.length}`, wrong: won ? [] : missed }));

  const showOne = () => {
    const next = ws.words.findIndex((_, i) => !found.has(i) && !shown.includes(i));
    if (next >= 0 && shown.length < MAX_SHOWN) setShown([...shown, next]);
  };
  return (
    <div className="flex flex-wrap items-start gap-8">
      <div
        className="grid max-w-full touch-none gap-0.5 select-none"
        style={{ gridTemplateColumns: `repeat(${ws.size}, 2.25rem)`, direction: 'ltr' }}
        lang={lang}
        role="grid"
        aria-label="Letters"
        onPointerLeave={() => dragging.current && setEnd(anchor)}
      >
        {ws.grid.flatMap((row, r) =>
          row.map((m, c) => {
            const k = key([r, c]);
            return (
              <div
                key={k}
                role="gridcell"
                onPointerDown={(e) => (e.preventDefault(), down([r, c]))}
                onPointerEnter={() => dragging.current && setEnd([r, c])}
                className={cx(
                  'grid size-9 cursor-pointer place-items-center rounded-lg font-serif text-lg font-semibold transition-colors',
                  lit.has(k) ? 'bg-accent-soft text-accent-text' : done.has(k) ? (gaveUp && !found.size ? 'bg-sunken' : 'bg-sage-soft text-sage-text') : 'hover:bg-sunken',
                  hinted.has(k) && !lit.has(k) && !done.has(k) && 'ring-2 ring-accent-text/60',
                )}
              >
                {big(m, lang)}
              </div>
            );
          }),
        )}
      </div>
      <div className="min-w-56 flex-1">
        <p className="text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">{meanings ? 'Find the words that mean' : 'Find these words'}</p>
        <ul className="mt-2 space-y-1.5">
          {ws.words.map((w, i) => (
            <li key={i} className={cx('font-serif text-lg', found.has(i) ? 'text-sage-text' : gaveUp ? 'text-accent-text' : '')}>
              <span className={found.has(i) ? 'line-through' : undefined}>{meanings ? items.get(w.term)?.meaning ?? w.term : <bdi lang={lang}>{w.term}</bdi>}</span>
              {meanings && (found.has(i) || gaveUp) && (
                <bdi lang={lang} className="ms-2 text-[15px] text-ink-soft">
                  {w.term}
                </bdi>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[14px] text-ink-soft">
          Found {found.size} of {ws.words.length}
          {miss ? ` · ${miss} that were not words` : ''}
        </p>
        {!over && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={showOne} disabled={shown.length >= MAX_SHOWN} className={buttonClasses('secondary', 'sm') + ' disabled:opacity-50'}>
              <Eye size={14} aria-hidden /> Show a start <span className="text-ink-faint">{MAX_SHOWN - shown.length} left, costs a star</span>
            </button>
            <button type="button" onClick={() => setGaveUp(true)} className={buttonClasses('ghost', 'sm')}>
              <Flag size={14} aria-hidden /> Give up
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function WordSearch({ lang, def, items, best }: { lang: string; def: GameDef; items: GameItem[]; best?: Best }) {
  const [backwards, setBackwards] = useState(false);
  const [meanings, setMeanings] = useState(false);
  const rtl = isRtl(lang);
  return (
    <RoundRunner<Entry>
      lang={lang}
      def={def}
      best={best}
      unit="Puzzle"
      rtl={rtl}
      intro="A grid of letters with seven of your words hidden in it. Drag across a word to find it."
      options={
        <>
          <ToggleRow title="Show meanings, not the words" description={meanings ? 'You get what each word means and have to find the word itself.' : 'The words are listed, and you find them in the grid.'} checked={meanings} onChange={setMeanings} />
          <ToggleRow title="Words can run backwards" description="Also upwards and the other way along." checked={backwards} onChange={setBackwards} />
        </>
      }
      make={(random) => {
        const pool = shuffle(usable(def, items, lang), random).slice(0, 7);
        const entries = pool.flatMap((item) => {
          const w = letterWord(item.term, { lang });
          const marks = w ? w.marks.filter((_, i) => w.keys[i] !== null).map((m) => letterKey(m, { lang, exact: true })!) : [];
          return marks.length ? [{ term: item.term, marks }] : [];
        });
        const filler = alphabetFor(lang, entries.flatMap((e) => e.marks));
        let best: Grid | null = null;
        for (let tries = 0; tries < 6 && (!best || best.words.length < entries.length); tries++) {
          const ws = makeWordSearch(entries, 12, random, { backwards, rtl }, filler);
          if (!best || ws.words.length > best.words.length) best = ws;
        }
        return best && best.words.length >= def.needs.count - 1 ? [{ ws: best, meanings, items: new Map(items.map((i) => [i.term, i])) }] : [];
      }}
      empty="The words would not fit in a grid. Try again."
      terms={(e) => e.ws.words.map((w) => w.term)}
      label={(e) => ({ title: 'Word search', detail: e.ws.words.map((w) => w.term).join(', ') })}
      Board={Board}
      rules={<p>Drag from the first letter of a word to its last, or click the two ends. Words run across, down and slanting{rtl ? ', starting from the right' : ''}. Three stars for a grid found without help; showing a start costs one. Giving up earns none.</p>}
    />
  );
}
