import { UiText, useUi } from '@/design/i18n/UiText';
// Guess from clues (6-21, F0189 and F1197): the clues come one at a time, hardest first; type the word.
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ListPlus } from 'lucide-react';
import type { Best } from '@/core/games/bests';
import { another, giveUp, guess, startClues, starsOf } from '@/core/games/clues';
import type { ClueKind, ClueState } from '@/core/games/clues';
import type { GameDef } from '@/core/games/defs';
import { usable } from '@/core/games/source';
import type { GameItem } from '@/core/games/source';
import { isRtl } from '@/core/lang/languages';
import { shuffle } from '@/core/srs/ludus';
import { buttonClasses } from '@/design/primitives';
import { RoundRunner, useSettleOnce } from './RoundRunner';
import type { BoardProps } from './RoundRunner';

interface Entry {
  item: GameItem;
  state: ClueState;
}

const NAME: Record<ClueKind, string> = { example: 'In a sentence', synonyms: 'Similar to', antonyms: 'The opposite of', picture: 'A picture', length: 'Its length', first: 'Its start', meaning: 'Its meaning' };

function Board({ entry, lang, settle }: BoardProps<Entry>) {
  const translateUi = useUi();
  const rtl = isRtl(lang);
  const [s, setS] = useState(entry.state);
  const [typed, setTyped] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const over = s.status !== 'playing';
  useSettleOnce(over, () => settle({ won: s.status === 'won', stars: starsOf(s), hints: 0, message: `${s.status === 'won' ? 'Right: ' : 'It was '}${entry.item.term}` }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setS((x) => guess(x, typed, entry.item.term, lang));
    setTyped('');
    input.current?.focus();
  };
  return (
    <div>
      <ol className="space-y-3" aria-label={translateUi('Clues')}>
        {s.clues.slice(0, s.shown).map((c, i) => (
          <li key={i} className="rounded-2xl border border-line/70 bg-surface px-5 py-4">
            <p className="text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">{NAME[c.kind]}</p>
            {c.image ? (
              <img src={c.image} alt="" className="mt-2 max-h-40 rounded-xl" />
            ) : c.kind === 'example' || c.kind === 'synonyms' || c.kind === 'antonyms' ? (
              <p className="mt-1 font-serif text-xl leading-snug" lang={lang} dir={rtl ? 'rtl' : undefined}>
                {c.text}
              </p>
            ) : (
              <p className="mt-1 font-serif text-xl leading-snug">
                {c.text}{' '}
                {c.value && (
                  <bdi lang={lang} className="font-semibold">
                    “{c.value}”
                  </bdi>
                )}
              </p>
            )}
          </li>
        ))}
      </ol>
      {!over && (
        <form onSubmit={submit} className="mt-5 flex flex-wrap items-center gap-3">
          <input
            ref={input}
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            lang={lang}
            dir={rtl ? 'rtl' : undefined}
            autoComplete="off"
            spellCheck={false}
            aria-label="Your guess"
            placeholder="Type the word"
            className="h-12 w-64 rounded-xl border border-line bg-raised px-4 font-serif text-xl outline-none focus:border-line-strong"
          />
          <button type="submit" disabled={!typed.trim()} className={buttonClasses('primary', 'md') + ' disabled:opacity-50'}><UiText source={'Guess'} /></button>
          <button type="button" onClick={() => setS(another)} disabled={s.shown >= s.clues.length} className={buttonClasses('secondary', 'md') + ' disabled:opacity-50'}><UiText source={'{0} Another clue'} values={[<ListPlus size={16} aria-hidden />]} /></button>
          <button type="button" onClick={() => setS(giveUp)} className={buttonClasses('ghost', 'md')}><UiText source={'Give up'} /></button>
        </form>
      )}
      {s.guesses.length > 0 && (
        <p className="mt-4 text-[14px] text-ink-soft"><UiText source={'Not: {0}'} values={[<bdi lang={lang}>{s.guesses.join(', ')}</bdi>]} /></p>
      )}
    </div>
  );
}

export function Clues({ lang, def, items, best }: { lang: string; def: GameDef; items: GameItem[]; best?: Best }) {
  return (
    <RoundRunner<Entry>
      lang={lang}
      def={def}
      best={best}
      unit="Word"
      rtl={isRtl(lang)}
      intro="Five of your words, each given in clues, the hardest first. Guess it as early as you can."
      make={(random) =>
        shuffle(usable(def, items, lang), random)
          .slice(0, def.round)
          .map((item) => ({ item, state: startClues(item, lang) }))
      }
      terms={(e) => [e.item.term]}
      label={(e) => ({ title: e.item.term, detail: e.item.meaning })}
      Board={Board}
      rules={<p>Type the word and press Enter. A wrong guess gives the next clue; you can also ask for one. Three stars with two clues or fewer, two with three or four, one after that.</p>}
    />
  );
}
