// The shared screen of a transformation (core/exercise/transform.ts): one form is shown, the learner types another form
// of the same word. Every room draws it the same way; the room owns the typed value and the phase, as it does for its
// own kinds, so this fits any lesson screen.
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, Lightbulb } from 'lucide-react';
import type { TransformSpec } from '@/core/exercise';
import { isRtl } from '@/core/lang/languages';
import { useLayout } from '@/design/hooks/useLayout';
import { cx } from '@/lib/cx';
import { LETTERS } from '@/features/thesaurus/study/exercises';
import type { Phase } from '@/features/lesson/kit';

const serif = '[font-family:var(--card-font,var(--font-serif))]';

interface Props {
  spec: TransformSpec;
  lang: string;
  value: string;
  onChange: (v: string) => void;
  phase: Phase;
  onSubmit: () => void;
  /** How many hints are showing, each time the learner asks for one: the room may log the answer as assisted (6-5). */
  onHint?: (shown: number) => void;
}

export function TransformView({ spec, lang, value, onChange, phase, onSubmit, onHint }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const { pointer } = useLayout();
  const [shown, setShown] = useState(0);
  const rtl = isRtl(lang);
  const hints = spec.hints ?? [];

  // A new exercise starts without hints, with the cursor in the answer.
  useEffect(() => {
    setShown(0);
    const t = window.setTimeout(() => input.current?.focus(), 140);
    return () => window.clearTimeout(t);
  }, [spec.key]);

  const hint = () => {
    if (phase !== 'answer' || shown >= hints.length) return;
    setShown(shown + 1);
    onHint?.(shown + 1);
    input.current?.focus();
  };

  const insert = (ch: string) => {
    const el = input.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + ch + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + ch.length, start + ch.length);
    });
  };

  const { from, to, title, lemma } = spec.body;
  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-[13px] font-bold tracking-wide text-ink-faint uppercase">
          {title}
          {lemma && <span lang={lang}> · {lemma}</span>}
        </p>
        <p lang={lang} dir={rtl ? 'rtl' : undefined} className={cx(serif, 'mt-3 text-[clamp(1.6rem,5vw,2.2rem)] leading-tight font-semibold')}>
          {from.form}
        </p>
        <p className="mt-1 text-[14px] font-semibold text-sage-text">{from.label}</p>
        <ArrowDown size={20} aria-hidden className="mx-auto mt-3 text-ink-faint" />
        <p className="mt-2 inline-block rounded-full bg-sage-soft px-3.5 py-1 text-[15px] font-semibold text-sage-text">{to.label}</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <input
          ref={input}
          lang={lang}
          dir={rtl ? 'rtl' : undefined}
          value={value}
          readOnly={phase !== 'answer'}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Type the ${to.label} form`}
          aria-label={`The ${to.label} form`}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className={cx(
            'h-16 w-full rounded-2xl border-2 bg-raised px-5 text-center text-2xl outline-none transition-colors placeholder:font-sans placeholder:text-base placeholder:text-ink-faint',
            serif,
            phase === 'right' ? 'border-sage' : phase === 'wrong' ? 'border-accent' : 'border-line focus:border-ink',
          )}
        />
      </form>
      {phase === 'answer' && (
        <div className="flex flex-col items-center gap-2.5">
          {hints.slice(0, shown).map((h) => (
            <p key={h.text} lang={h.strength > 0 ? lang : undefined} className="rounded-full bg-sunken px-3.5 py-1 text-[15px] text-ink-soft">
              {h.text}
            </p>
          ))}
          {shown < hints.length && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={hint}
              className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-soft underline decoration-line-strong underline-offset-4"
            >
              <Lightbulb size={15} aria-hidden />
              {shown ? 'Another hint' : 'Hint'}
            </button>
          )}
        </div>
      )}
      {phase === 'answer' && LETTERS[lang] && pointer === 'fine' && (
        <div className="flex flex-wrap justify-center gap-1.5" aria-label="Special letters">
          {LETTERS[lang].map((ch) => (
            <button
              key={ch}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insert(ch)}
              className={cx('grid size-9 place-items-center rounded-lg border border-line bg-raised text-lg transition-colors hover:border-line-strong', serif)}
            >
              {ch}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
