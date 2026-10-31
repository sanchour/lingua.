import { UiText, useUi } from '@/design/i18n/UiText';
// Missing letters (6-21, F0175): the word with some letters left out; fill them in from its meaning.
import { useMemo, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import type { Best } from '@/core/games/bests';
import type { GameDef } from '@/core/games/defs';
import { MAX_HINTS } from '@/core/games/hangman';
import { alphabetFor } from '@/core/games/letters';
import { fill, hint, isShown, MAX_SLIPS, select, startMissing, starsOf } from '@/core/games/missing';
import type { MissingState } from '@/core/games/missing';
import { usable } from '@/core/games/source';
import type { GameItem } from '@/core/games/source';
import { getLanguage, isRtl } from '@/core/lang/languages';
import { shuffle } from '@/core/srs/ludus';
import { buttonClasses, Kbd } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { AccentsOption } from './Hangman';
import { LetterKeyboard, useLetterKeys } from './LetterKeyboard';
import { RoundRunner, useSettleOnce } from './RoundRunner';
import type { BoardProps } from './RoundRunner';

interface Entry {
  item: GameItem;
  state: MissingState;
  exact: boolean;
}

function Board({ entry, lang, settle }: BoardProps<Entry>) {
  const translateUi = useUi();
  const rtl = isRtl(lang);
  const [s, setS] = useState(entry.state);
  const over = s.status !== 'playing';
  const alphabet = useMemo(() => alphabetFor(lang, entry.state.keys), [lang, entry.state.keys]);
  useLetterKeys({ lang, exact: entry.exact, alphabet, enabled: !over, onKey: (k) => setS((x) => fill(x, k)), onHint: () => setS(hint) });
  useSettleOnce(over, () => settle({ won: s.status === 'won', stars: starsOf(s), hints: s.hints, message: `${s.status === 'won' ? 'Right: ' : 'It was '}${entry.item.term}` }));
  return (
    <div>
      <div className="rounded-3xl border border-line/70 bg-surface p-6">
        <p className="text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase"><UiText source={'Meaning'} /></p>
        <p className="mt-1 font-serif text-2xl leading-snug">{entry.item.meaning}</p>
      </div>
      <div className="mt-8 flex flex-wrap gap-x-1.5 gap-y-3" lang={lang} dir={rtl ? 'rtl' : undefined} aria-live="polite" aria-label={over ? entry.item.term : 'The word with letters missing'}>
        {s.marks.map((mark, i) => {
          if (s.keys[i] === null)
            return (
              <span key={i} className="grid h-12 min-w-3 place-items-end pb-1 font-serif text-3xl text-ink-soft">
                {mark.trim() ? mark : ''}
              </span>
            );
          const blank = s.blanks.includes(i);
          const shown = isShown(s, i);
          return (
            <button
              key={i}
              type="button"
              disabled={!blank || shown}
              onClick={() => setS((x) => select(x, i))}
              aria-label={blank && !shown ? 'Missing letter' : undefined}
              className={cx(
                'grid h-12 w-10 place-items-center border-b-[3px] font-serif text-3xl font-semibold',
                blank && !shown && 'rounded-t-lg bg-sage-soft',
                blank && !shown && s.selected === i ? 'border-accent-text' : shown ? 'border-ink' : 'border-line-strong',
                blank && s.status === 'lost' && !s.filled.includes(i) && 'text-accent-text',
                (!blank || shown) && 'disabled:opacity-100',
              )}
            >
              {shown ? mark : ''}
            </button>
          );
        })}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setS(hint)} disabled={over || s.hints >= MAX_HINTS} className={buttonClasses('secondary', 'sm') + ' disabled:opacity-50'}><UiText source={'{0} Fill this one {1} {2}'} values={[<Lightbulb size={14} aria-hidden />, <Kbd>1</Kbd>, <span className="text-ink-faint"><UiText source={'{0} left, costs a star'} values={[MAX_HINTS - s.hints]} /></span>]} /></button>
        <p className="text-[14px] text-ink-soft">{s.slips ? translateUi('{0} of {1} wrong letters', [s.slips, MAX_SLIPS]) : translateUi('No wrong letters yet.')}</p>
      </div>
      <div className="mt-6">
        <LetterKeyboard alphabet={alphabet} lang={lang} rtl={rtl} disabled={over} onPick={(k) => setS((x) => fill(x, k))} />
      </div>
    </div>
  );
}

export function MissingLetters({ lang, def, items, best }: { lang: string; def: GameDef; items: GameItem[]; best?: Best }) {
  const [exact, setExact] = useState(true);
  return (
    <RoundRunner<Entry>
      lang={lang}
      def={def}
      best={best}
      unit="Word"
      rtl={isRtl(lang)}
      intro="Five of your words with some letters missing. Fill them in from the meaning."
      options={getLanguage(lang)?.script === 'Latn' && <AccentsOption exact={exact} onChange={setExact} />}
      make={(random) =>
        shuffle(usable(def, items, lang), random)
          .flatMap((item) => {
            const state = startMissing(item.term, { lang, exact }, random);
            return state ? [{ item, state, exact }] : [];
          })
          .slice(0, def.round)
      }
      terms={(e) => [e.item.term]}
      label={(e) => ({ title: e.item.term, detail: e.item.meaning })}
      Board={Board}
      rules={<p>The highlighted gap takes the next letter; click another gap to choose it. Four wrong letters and the word is lost. Up to three stars: a hint costs one, so do two wrong letters.</p>}
    />
  );
}
