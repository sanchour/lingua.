// Anagrams (6-21, F0173 and F1195): the letters of a word, mixed; click or type them back into order.
import { useState } from 'react';
import { Lightbulb, Undo2 } from 'lucide-react';
import { hint, MAX_WRONG, place, placeKey, slotsOf, startAnagram, starsOf, unplace } from '@/core/games/anagram';
import type { AnagramState } from '@/core/games/anagram';
import type { Best } from '@/core/games/bests';
import type { GameDef } from '@/core/games/defs';
import { MAX_HINTS } from '@/core/games/hangman';
import { usable } from '@/core/games/source';
import type { GameItem } from '@/core/games/source';
import { getLanguage, isRtl } from '@/core/lang/languages';
import { shuffle } from '@/core/srs/ludus';
import { buttonClasses, Kbd } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { AccentsOption } from './Hangman';
import { useLetterKeys } from './LetterKeyboard';
import { RoundRunner, useSettleOnce } from './RoundRunner';
import type { BoardProps } from './RoundRunner';

interface Entry {
  item: GameItem;
  state: AnagramState;
  exact: boolean;
}

function Board({ entry, lang, settle }: BoardProps<Entry>) {
  const rtl = isRtl(lang);
  const [s, setS] = useState(entry.state);
  const over = s.status !== 'playing';
  useLetterKeys({ lang, exact: entry.exact, alphabet: s.tileKeys, enabled: !over, onKey: (k) => setS((x) => placeKey(x, k)), onHint: () => setS(hint), onBack: () => setS(unplace) });
  useSettleOnce(over, () => settle({ won: s.status === 'won', stars: starsOf(s), hints: s.hints, message: `${s.status === 'won' ? 'Right: ' : 'It was '}${entry.item.term}` }));
  const slots = slotsOf(s);
  return (
    <div>
      <div className="rounded-3xl border border-line/70 bg-surface p-6">
        <p className="text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">Meaning</p>
        <p className="mt-1 font-serif text-2xl leading-snug">{entry.item.meaning}</p>
      </div>
      <div className="mt-8 flex flex-wrap gap-x-1.5 gap-y-3" lang={lang} dir={rtl ? 'rtl' : undefined} aria-live="polite" aria-label={over ? entry.item.term : 'The word so far'}>
        {s.marks.map((mark, i) =>
          s.keys[i] === null ? (
            <span key={i} className="grid h-12 min-w-3 place-items-end pb-1 font-serif text-3xl text-ink-soft">
              {mark.trim() ? mark : ''}
            </span>
          ) : (
            <span key={i} className={cx('grid h-12 w-10 place-items-center border-b-[3px] font-serif text-3xl font-semibold', slots[i] ? 'border-ink' : 'border-line-strong', s.status === 'lost' && 'text-accent-text')}>
              {slots[i]}
            </span>
          ),
        )}
      </div>
      <div className="mt-8 flex flex-wrap gap-2" lang={lang} dir={rtl ? 'rtl' : undefined} role="group" aria-label="Letters to put in order">
        {s.tiles.map((t, i) => (
          <button key={i} type="button" disabled={over || s.placed.includes(i)} onClick={() => setS((x) => place(x, i))} className="grid size-12 place-items-center rounded-xl border border-line bg-raised font-serif text-2xl font-semibold uppercase shadow-elev-1 transition-colors hover:border-line-strong hover:bg-surface disabled:opacity-25 disabled:shadow-none">
            {t}
          </button>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setS(unplace)} disabled={over || !s.placed.length} className={buttonClasses('secondary', 'sm') + ' disabled:opacity-50'}>
          <Undo2 size={14} aria-hidden /> Take back <Kbd>⌫</Kbd>
        </button>
        <button type="button" onClick={() => setS(hint)} disabled={over || s.hints >= MAX_HINTS} className={buttonClasses('secondary', 'sm') + ' disabled:opacity-50'}>
          <Lightbulb size={14} aria-hidden /> Place a letter <Kbd>1</Kbd> <span className="text-ink-faint">{MAX_HINTS - s.hints} left, costs a star</span>
        </button>
        <p className="text-[14px] text-ink-soft">{s.wrong ? `${s.wrong} of ${MAX_WRONG} wrong tries` : 'No wrong tries yet.'}</p>
      </div>
    </div>
  );
}

export function Anagram({ lang, def, items, best }: { lang: string; def: GameDef; items: GameItem[]; best?: Best }) {
  const [exact, setExact] = useState(true);
  return (
    <RoundRunner<Entry>
      lang={lang}
      def={def}
      best={best}
      unit="Word"
      rtl={isRtl(lang)}
      intro="Five of your words, their letters mixed up. Put each back in order, from its meaning."
      options={getLanguage(lang)?.script === 'Latn' && <AccentsOption exact={exact} onChange={setExact} />}
      make={(random) =>
        shuffle(usable(def, items, lang), random)
          .flatMap((item) => {
            const state = startAnagram(item.term, { lang, exact }, random);
            return state ? [{ item, state, exact }] : [];
          })
          .slice(0, def.round)
      }
      terms={(e) => [e.item.term]}
      label={(e) => ({ title: e.item.term, detail: e.item.meaning })}
      Board={Board}
      rules={<p>Click the letters in order, or type them; Backspace takes one back. Three full tries that are wrong and the word is lost. Up to three stars a word: a hint costs one, so do two wrong tries.</p>}
    />
  );
}
