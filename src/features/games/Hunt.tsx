import { UiText, useUi } from '@/design/i18n/UiText';
// Word hunt (6-21, F0168): the learner's words hidden in a passage of a text they have. Click each one as you spot it.
import { useState } from 'react';
import { Eye, Flag } from 'lucide-react';
import type { Best } from '@/core/games/bests';
import type { GameDef } from '@/core/games/defs';
import { huntStars, makeHunts } from '@/core/games/hunt';
import type { Hunt as HuntData } from '@/core/games/hunt';
import type { GameItem } from '@/core/games/source';
import { isRtl } from '@/core/lang/languages';
import { passagesOf } from '@/data/games';
import { buttonClasses } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { RoundRunner, useSettleOnce } from './RoundRunner';
import type { BoardProps } from './RoundRunner';

const MAX_SHOWN = 2;

function Board({ entry, lang, settle }: BoardProps<HuntData>) {
  const translateUi = useUi();
  const rtl = isRtl(lang);
  const [found, setFound] = useState<ReadonlySet<number>>(new Set());
  const [slips, setSlips] = useState<ReadonlySet<number>>(new Set());
  const [shown, setShown] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);
  const won = found.size === entry.targets.length;
  const over = won || gaveUp;
  useSettleOnce(over, () => settle({ won, stars: huntStars(won, slips.size, shown), hints: shown, message: won ? `All ${entry.targets.length} found` : `Found ${found.size} of ${entry.targets.length}`, wrong: entry.targets.filter((_, i) => !found.has(i)).map((t) => t.term) }));

  const click = (i: number, target?: number) => {
    if (over) return;
    if (target !== undefined) setFound((f) => new Set([...f, target]));
    else setSlips((s) => new Set([...s, i]));
  };
  const showOne = () => {
    const next = entry.targets.findIndex((_, i) => !found.has(i));
    if (next >= 0 && shown < MAX_SHOWN) {
      setShown(shown + 1);
      setFound((f) => new Set([...f, next]));
    }
  };
  return (
    <div className="flex flex-wrap items-start gap-8">
      <p className="min-w-72 max-w-xl flex-1 font-serif text-xl leading-[2] whitespace-pre-wrap" lang={lang} dir={rtl ? 'rtl' : undefined}>
        {entry.tokens.map((t, i) => {
          if (!t.isWord) return t.text;
          const hit = t.target !== undefined && (found.has(t.target) || gaveUp);
          return (
            <button
              key={i}
              type="button"
              onClick={() => click(i, t.target)}
              className={cx('rounded px-0.5 transition-colors', hit ? (found.has(t.target!) ? 'bg-sage-soft text-sage-text' : 'bg-accent-soft text-accent-text') : slips.has(i) ? 'text-ink-faint line-through decoration-accent-text' : 'hover:bg-sunken')}
            >
              {t.text}
            </button>
          );
        })}
      </p>
      <div className="min-w-56 flex-1">
        <p className="text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase"><UiText source={'Find the words that mean'} /></p>
        <ul className="mt-2 space-y-1.5">
          {entry.targets.map((t, i) => (
            <li key={i} className={cx('font-serif text-lg', found.has(i) ? 'text-sage-text' : gaveUp ? 'text-accent-text' : '')}>
              <span className={found.has(i) ? 'line-through' : undefined}>{t.meaning ?? translateUi('one of your words')}</span>
              {(found.has(i) || gaveUp) && (
                <bdi lang={lang} className="ms-2 text-[15px] text-ink-soft">
                  {t.term}
                </bdi>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[14px] text-ink-soft"><UiText source={'Found {0} of {1}{2}'} values={[found.size, entry.targets.length, slips.size ? ` · ${slips.size} wrong` : '']} /></p>
        {!over && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={showOne} disabled={shown >= MAX_SHOWN} className={buttonClasses('secondary', 'sm') + ' disabled:opacity-50'}><UiText source={'{0} Show one {1}'} values={[<Eye size={14} aria-hidden />, <span className="text-ink-faint"><UiText source={'{0} left, costs a star'} values={[MAX_SHOWN - shown]} /></span>]} /></button>
            <button type="button" onClick={() => setGaveUp(true)} className={buttonClasses('ghost', 'sm')}><UiText source={'{0} Give up'} values={[<Flag size={14} aria-hidden />]} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

export function Hunt({ lang, def, items, best }: { lang: string; def: GameDef; items: GameItem[]; best?: Best }) {
  return (
    <RoundRunner<HuntData>
      lang={lang}
      def={def}
      best={best}
      unit="Passage"
      rtl={isRtl(lang)}
      intro="Passages from your own texts, with some of your words hidden in them. Click each word as you spot it."
      make={async (random) => makeHunts(await passagesOf(lang), items, lang, random, def.round)}
      empty="None of your texts has a passage with three of your words in it yet. Read a text in Codex, or add words that are in one."
      terms={(e) => e.targets.map((t) => t.term)}
      label={(e, i) => ({ title: `Passage ${i + 1}`, detail: e.targets.map((t) => t.term).join(', ') })}
      Board={Board}
      rules={<p>Click the words in the passage that are your words, in any form. Three wrong clicks cost a star, and so does showing a word. Giving up earns none.</p>}
    />
  );
}
