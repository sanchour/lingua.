// Hangman-style spelling (6-21, F0172 and F1196): five of the learner's words, each asked by its meaning. Typed with the keyboard or
// clicked on the letters; a hint shows a letter and costs a star.
import { useMemo, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import type { GameDef } from '@/core/games/defs';
import { guess, hideIn, hint, isShown, MAX_HINTS, MAX_MISTAKES, startHangman, starsOf } from '@/core/games/hangman';
import type { HangmanState } from '@/core/games/hangman';
import { alphabetFor } from '@/core/games/letters';
import { usable } from '@/core/games/source';
import type { GameItem } from '@/core/games/source';
import { getLanguage, isRtl } from '@/core/lang/languages';
import { shuffle } from '@/core/srs/ludus';
import { Kbd, ToggleRow } from '@/design/primitives';
import { buttonClasses } from '@/design/primitives';
import { cx } from '@/lib/cx';
import type { Best } from '@/core/games/bests';
import { HangmanFigure } from './HangmanFigure';
import { LetterKeyboard, useLetterKeys } from './LetterKeyboard';
import { RoundRunner, Stars, useSettleOnce } from './RoundRunner';
import type { BoardProps } from './RoundRunner';

interface Entry {
  item: GameItem;
  state: HangmanState;
  exact: boolean;
}

function Board({ entry, lang, random, settle }: BoardProps<Entry>) {
  const rtl = isRtl(lang);
  const [s, setS] = useState(entry.state);
  const alphabet = useMemo(() => alphabetFor(lang, entry.state.keys), [lang, entry.state.keys]);
  const press = (key: string) => setS((x) => guess(x, key));
  const useHint = () => setS((x) => hint(x, random));
  useLetterKeys({ lang, exact: entry.exact, alphabet, enabled: s.status === 'playing', onKey: press, onHint: useHint });
  useSettleOnce(s.status !== 'playing', () => settle({ won: s.status === 'won', stars: starsOf(s), hints: s.hints, message: `${s.status === 'won' ? 'Right: ' : 'It was '}${entry.item.term}` }));

  const over = s.status !== 'playing';
  const example = entry.item.example && (over ? entry.item.example : s.wrong.length >= 2 ? hideIn(entry.item.example, entry.item.term, lang) : null);
  return (
    <div>
      <div className="rounded-3xl border border-line/70 bg-surface p-6">
        <p className="text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">Meaning</p>
        <p className="mt-1 font-serif text-2xl leading-snug">{entry.item.meaning}</p>
        {example && (
          <p className="mt-3 text-[15px] leading-snug text-ink-soft" lang={lang} dir={rtl ? 'rtl' : undefined}>
            {example}
          </p>
        )}
      </div>
      <div className="mt-6 flex items-center gap-8">
        <HangmanFigure wrong={s.wrong.length} max={MAX_MISTAKES} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-x-1.5 gap-y-3" lang={lang} dir={rtl ? 'rtl' : undefined} aria-live="polite" aria-label={over ? entry.item.term : `${s.keys.filter((k) => k !== null).length} letters`}>
            {s.marks.map((mark, i) =>
              s.keys[i] === null ? (
                <span key={i} className="grid h-12 min-w-3 place-items-end pb-1 font-serif text-3xl text-ink-soft">
                  {mark.trim() ? mark : ''}
                </span>
              ) : (
                <span key={i} className={cx('grid h-12 w-10 place-items-center border-b-[3px] font-serif text-3xl font-semibold', isShown(s, i) ? 'border-ink' : 'border-line-strong', s.status === 'lost' && !s.guessed.includes(s.keys[i]!) && 'text-accent-text')}>
                  {isShown(s, i) ? mark : ''}
                </span>
              ),
            )}
          </div>
          <p className="mt-4 min-h-6 text-[14px] text-ink-soft">
            {s.wrong.length ? (
              <>
                Wrong: <bdi lang={lang}>{s.wrong.join('  ')}</bdi> ({s.wrong.length} of {MAX_MISTAKES})
              </>
            ) : (
              'No wrong letters yet.'
            )}
          </p>
          <button type="button" onClick={useHint} disabled={over || s.hints >= MAX_HINTS} className={buttonClasses('secondary', 'sm') + ' mt-3 disabled:opacity-50'}>
            <Lightbulb size={14} aria-hidden /> Show a letter <Kbd>1</Kbd> <span className="text-ink-faint">{MAX_HINTS - s.hints} left, costs a star</span>
          </button>
        </div>
      </div>
      <div className="mt-6">
        <LetterKeyboard alphabet={alphabet} lang={lang} rtl={rtl} disabled={over} mark={(k) => (s.guessed.includes(k) ? 'right' : s.wrong.includes(k) ? 'wrong' : undefined)} onPick={press} />
      </div>
    </div>
  );
}

export function Hangman({ lang, def, items, best }: { lang: string; def: GameDef; items: GameItem[]; best?: Best }) {
  const [exact, setExact] = useState(false);
  return (
    <RoundRunner<Entry>
      lang={lang}
      def={def}
      best={best}
      unit="Word"
      rtl={isRtl(lang)}
      intro="Five of your words, each asked by its meaning. Name the letters before the drawing is done."
      options={getLanguage(lang)?.script === 'Latn' && <AccentsOption exact={exact} onChange={setExact} />}
      make={(random) =>
        shuffle(usable(def, items, lang), random)
          .slice(0, def.round)
          .flatMap((item) => {
            const state = startHangman(item.term, { lang, exact });
            return state ? [{ item, state, exact }] : [];
          })
      }
      terms={(e) => [e.item.term]}
      label={(e) => ({ title: e.item.term, detail: e.item.meaning })}
      Board={Board}
      rules={<p>Type a letter or click it. Six wrong letters and the word is lost. A word is worth up to three stars: a hint costs one, so do three wrong letters.</p>}
    />
  );
}

/** The switch Latin-script letter games share: do accents count? */
export function AccentsOption({ exact, onChange }: { exact: boolean; onChange: (v: boolean) => void }) {
  return (
    <ToggleRow
      title="Accents count"
      description={exact ? 'é and e are different letters: pick the accented ones from the letters.' : 'A plain letter also fills the accented ones, as when typing without accents.'}
      checked={exact}
      onChange={onChange}
    />
  );
}

export { Stars };
