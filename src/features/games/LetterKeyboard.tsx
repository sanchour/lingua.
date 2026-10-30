// The letters a letter game is played with: an on-screen keyboard of the script's alphabet, and typing on the real one.
import { useEffect, useRef } from 'react';
import { graphemes, letterKey } from '@/core/games/letters';
import { isEditable } from '@/design/hooks/useHotkeys';
import { cx } from '@/lib/cx';

export function LetterKeyboard({ alphabet, lang, rtl, mark, disabled, onPick }: { alphabet: string[]; lang: string; rtl: boolean; mark?: (key: string) => 'right' | 'wrong' | undefined; disabled?: boolean; onPick: (key: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" dir={rtl ? 'rtl' : undefined} lang={lang} role="group" aria-label="Letters">
      {alphabet.map((k) => {
        const state = mark?.(k);
        return (
          <button
            key={k}
            type="button"
            disabled={disabled || !!state}
            onClick={() => onPick(k)}
            className={cx(
              'grid size-10 place-items-center rounded-xl border text-lg font-semibold uppercase transition-colors',
              state === 'right' ? 'border-sage-text/30 bg-sage-soft text-sage-text' : state === 'wrong' ? 'border-transparent bg-accent-soft text-accent-text opacity-60' : 'border-line bg-raised hover:border-line-strong hover:bg-surface',
            )}
          >
            {k}
          </button>
        );
      })}
    </div>
  );
}

interface Keys {
  lang: string;
  exact: boolean;
  alphabet: string[];
  enabled: boolean;
  onKey?: (key: string) => void;
  onHint?: () => void;
  onBack?: () => void;
}

/** Typing on a real keyboard: a letter of the alphabet, 1 for a hint, Backspace to take one back. Letters typed with a modifier, or into a field, are not the game's. */
export function useLetterKeys(keys: Keys): void {
  const latest = useRef(keys);
  useEffect(() => {
    latest.current = keys;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { lang, exact, alphabet, enabled, onKey: pick, onHint, onBack } = latest.current;
      if (!enabled || e.isComposing || e.ctrlKey || e.metaKey || e.altKey || isEditable(e.target)) return;
      if (e.key === '1') return onHint?.();
      if (e.key === 'Backspace') return onBack?.();
      const marks = graphemes(e.key, lang);
      const key = marks.length === 1 ? letterKey(marks[0], { lang, exact }) : null;
      if (key && alphabet.includes(key)) pick?.(key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
