// The typed kinds of 6-4b: correct the mistake, rewrite, predict the form, complete the dialogue, and the free sentence tasks
// (combine, expand, simplify, passive, reported, question). One input, hints that grow, the language's special letters.
import { useEffect, useRef, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import type { CorrectBody, DialogueBody, ExerciseSpec, PredictBody, TaskBody } from '@/core/contracts/exercise';
import { isRtl } from '@/core/lang/languages';
import { useLayout } from '@/design/hooks/useLayout';
import { cx } from '@/lib/cx';
import { LETTERS } from '@/features/thesaurus/study/exercises';
import type { Phase } from '@/features/lesson/kit';

const serif = '[font-family:var(--card-font,var(--font-serif))]';

interface Props {
  spec: ExerciseSpec;
  lang: string;
  value: string;
  onChange: (v: string) => void;
  phase: Phase;
  onSubmit: () => void;
  onHint?: (shown: number) => void;
}

/** Whether the kind is answered in a sentence of its own (a text box) rather than one word or form (a line). */
export const isFreeText = (spec: ExerciseSpec) => spec.check.rule === 'self' || spec.check.rule === 'ai' || ['combine', 'expand', 'simplify'].includes(spec.kind) || (spec.kind === 'rewrite' && (spec.body as TaskBody).task !== 'fix');

function Prompt({ spec, lang }: { spec: ExerciseSpec; lang: string }) {
  const rtl = isRtl(lang);
  switch (spec.kind) {
    case 'correct-mistake': {
      const b = spec.body as CorrectBody;
      const at = b.shown.indexOf(b.wrong);
      return (
        <div className="text-center">
          <p lang={lang} dir={rtl ? 'rtl' : undefined} className={cx(serif, 'text-[clamp(1.4rem,4.5vw,1.9rem)] leading-relaxed')}>
            {at < 0 ? b.shown : (
              <>
                {b.shown.slice(0, at)}
                <mark className="rounded-md bg-accent-soft px-1 text-ink">{b.wrong}</mark>
                {b.shown.slice(at + b.wrong.length)}
              </>
            )}
          </p>
          {b.translation && <p className="mt-3 text-[15px] text-ink-soft italic">{b.translation}</p>}
        </div>
      );
    }
    case 'predict-form': {
      const b = spec.body as PredictBody;
      return (
        <div className="text-center">
          <p className="text-[13px] font-bold tracking-wide text-ink-faint uppercase">{b.title}{b.lemma ? ` · ${b.lemma}` : ''}</p>
          <ul className="mt-4 flex flex-wrap justify-center gap-2.5">
            {b.given.map((g) => (
              <li key={g.label} className="rounded-xl bg-surface px-3.5 py-2">
                <span lang={lang} className={cx(serif, 'text-[20px] font-semibold')}>{g.form}</span>
                <span className="block text-[12.5px] text-ink-faint">{g.label}</span>
              </li>
            ))}
            <li className="rounded-xl border-2 border-dashed border-line-strong px-3.5 py-2 text-ink-faint">
              <span className="text-[20px]">?</span>
              <span className="block text-[12.5px]">{b.ask.label}</span>
            </li>
          </ul>
        </div>
      );
    }
    case 'complete-dialogue': {
      const b = spec.body as DialogueBody;
      return (
        <div>
          {b.title && <p className="mb-3 text-center text-[13px] font-bold tracking-wide text-ink-faint uppercase">{b.title}</p>}
          <ul className="space-y-2.5">
            {b.lines.map((l, i) => (
              <li key={i} className={cx('flex gap-3 rounded-2xl px-4 py-2.5', l.missing ? 'border-2 border-dashed border-line-strong' : 'bg-surface')}>
                <span className="w-14 shrink-0 text-[13px] font-semibold text-ink-faint">{l.speaker}</span>
                <span lang={lang} dir={rtl ? 'rtl' : undefined} className={cx(serif, 'text-[18px]', l.missing && 'text-ink-faint')}>{l.missing ? '…' : l.text}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    default: {
      const b = spec.body as TaskBody;
      return (
        <div className="text-center">
          <div className="space-y-2">
            {b.given.map((g, i) => (
              <p key={i} lang={lang} dir={rtl ? 'rtl' : undefined} className={cx(serif, 'text-[clamp(1.3rem,4vw,1.7rem)] leading-relaxed')}>
                {g}
              </p>
            ))}
          </div>
          {b.translation && <p className="mt-3 text-[15px] text-ink-soft italic">{b.translation}</p>}
        </div>
      );
    }
  }
}

export function TypedView({ spec, lang, value, onChange, phase, onSubmit, onHint }: Props) {
  const input = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const { pointer } = useLayout();
  const [shown, setShown] = useState(0);
  const free = isFreeText(spec);
  const hints = spec.hints ?? [];
  const rtl = isRtl(lang);

  useEffect(() => {
    setShown(0);
    const t = window.setTimeout(() => input.current?.focus(), 140);
    return () => window.clearTimeout(t);
  }, [spec.key]);

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

  const common = {
    ref: input,
    lang,
    dir: rtl ? ('rtl' as const) : undefined,
    value,
    readOnly: phase !== 'answer',
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    autoComplete: 'off',
    autoCorrect: 'off',
    autoCapitalize: 'off',
    spellCheck: false,
    'aria-label': spec.instruction,
    placeholder: free ? 'Write your sentence' : 'Type it here',
    className: cx('w-full rounded-2xl border-2 bg-raised px-5 text-xl outline-none transition-colors placeholder:font-sans placeholder:text-base placeholder:text-ink-faint', serif, free ? 'min-h-28 resize-none py-4' : 'h-16 text-center text-2xl', phase === 'right' ? 'border-sage' : phase === 'wrong' ? 'border-accent' : 'border-line focus:border-ink'),
  };

  return (
    <div className="space-y-6">
      <Prompt spec={spec} lang={lang} />
      {free ? (
        <textarea {...common} rows={3} onKeyDown={(e) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && onSubmit()} />
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
          <input {...common} />
        </form>
      )}
      {phase === 'answer' && (
        <div className="flex flex-col items-center gap-2.5">
          {hints.slice(0, shown).map((h) => (
            <p key={h.text} className="rounded-full bg-sunken px-3.5 py-1 text-[15px] text-ink-soft">{h.text}</p>
          ))}
          {shown < hints.length && (
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setShown(shown + 1); onHint?.(shown + 1); input.current?.focus(); }} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-soft underline decoration-line-strong underline-offset-4">
              <Lightbulb size={15} aria-hidden />
              {shown ? 'Another hint' : 'Hint'}
            </button>
          )}
        </div>
      )}
      {phase === 'answer' && LETTERS[lang] && pointer === 'fine' && (
        <div className="flex flex-wrap justify-center gap-1.5" aria-label="Special letters">
          {LETTERS[lang].map((ch) => (
            <button key={ch} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(ch)} className={cx('grid size-9 place-items-center rounded-lg border border-line bg-raised text-lg transition-colors hover:border-line-strong', serif)}>
              {ch}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
