import { UiText, useUi } from '@/design/i18n/UiText';
import { useMemo, useState } from 'react';
import { Check, Lightbulb, Plus, Sparkles } from 'lucide-react';
import { wordDiff } from '@/core/diff/words';
import type { DiffPart } from '@/core/diff/words';
import { addToJournalDeck } from '@/data/journal';
import type { JournalCorrection, JournalReview } from '@/data/types';
import { gradeColor, Ring } from '@/design/charts/Ring';
import { Badge, Popover, Segmented } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { toast } from '@/state/ui';
import { GlossText } from '../reader/GlossText';

const fold = (s: string) => s.toLocaleLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim();

/** The correction a highlighted change belongs to, matched by its words. */
function correctionFor(part: DiffPart, corrections: JournalCorrection[]): JournalCorrection | undefined {
  const from = part.type === 'change' ? fold(part.from) : part.type === 'del' ? fold(part.text) : '';
  const to = part.type === 'change' ? fold(part.to) : part.type === 'ins' ? fold(part.text) : '';
  return corrections.find((c) => {
    const o = fold(c.original);
    const s = fold(c.suggestion);
    return (from && (o.includes(from) || (o && from.includes(o)))) || (to && (s.includes(to) || (s && to.includes(s))));
  });
}

async function saveCorrection(lang: string, c: JournalCorrection) {
  const added = await addToJournalDeck(lang, {
    term: c.suggestion,
    meaning: `${c.explanation}${c.explanation ? ' ' : ''}(not “${c.original}”)`,
    tags: ['journal', c.category],
    source: 'manual',
  });
  toast(added ? `Added “${c.suggestion}” to Journal.` : `“${c.suggestion}” is already in Journal.`, { tone: added ? 'success' : 'default' });
}

/** The entry with its changes marked: struck in terracotta, added in sage. Tap a change for why. */
export function DiffView({ review, lang }: { review: JournalReview; lang: string }) {
  const parts = useMemo(() => wordDiff(review.text, review.corrected), [review.text, review.corrected]);
  return (
    <p lang={lang} className="diff-text font-serif text-[18px] leading-[1.9] whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (part.type === 'same') return <span key={i}>{part.text}</span>;
        const correction = correctionFor(part, review.corrections);
        return (
          <Popover
            key={i}
            label="Correction"
            placement="bottom"
            trigger={(props) => (
              <button type="button" {...props} className="diff-change rounded-md px-0.5 text-left transition-colors hover:bg-surface">
                {(part.type === 'change' || part.type === 'del') && <del>{part.type === 'change' ? part.from : part.text}</del>}
                {(part.type === 'change' || part.type === 'ins') && <ins>{part.type === 'change' ? part.to : part.text}</ins>}
              </button>
            )}
          >
            <div className="w-72 max-w-[calc(100vw-32px)] p-4">
              {correction ? (
                <CorrectionBody correction={correction} lang={lang} />
              ) : (
                <p className="text-sm text-ink-soft">A small fix to make the sentence read naturally.</p>
              )}
            </div>
          </Popover>
        );
      })}
    </p>
  );
}

function CorrectionBody({ correction: c, lang }: { correction: JournalCorrection; lang: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Badge tone={c.severity === 'major' ? 'accent' : 'neutral'}>{c.category}</Badge>
        {c.severity === 'major' && <span className="text-[11.5px] font-semibold text-accent-text"><UiText source={'Worth learning'} /></span>}
      </div>
      <p lang={lang} className="font-serif text-[16px] leading-snug">
        <del className="text-accent-text decoration-accent/70">{c.original}</del> <span className="text-ink-faint">→</span> <ins className="text-sage-text no-underline">{c.suggestion}</ins>
      </p>
      {c.explanation && <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{c.explanation}</p>}
      <button type="button" onClick={() => void saveCorrection(lang, c)} className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 -ml-2 text-[13px] font-semibold text-ink-soft hover:bg-surface hover:text-ink"><UiText source={'{0} Add to the Journal deck'} values={[<Plus size={14} aria-hidden />]} /></button>
    </div>
  );
}

type TextView = 'changes' | 'corrected' | 'natural';

/** Your text with its changes, the corrected text, or how a native speaker would put it. */
export function ReviewText({ review, lang }: { review: JournalReview; lang: string }) {
  const translateUi = useUi();
  const [view, setView] = useState<TextView>('changes');
  return (
    <div>
      <div className="mb-5">
        <Segmented<TextView>
          label={translateUi('Show')}
          value={view}
          onChange={setView}
          options={[
            { value: 'changes', label: translateUi('Changes') },
            { value: 'corrected', label: translateUi('Corrected') },
            ...(review.natural ? [{ value: 'natural' as const, label: translateUi('Native-like') }] : []),
          ]}
        />
      </div>
      {view === 'changes' && <DiffView review={review} lang={lang} />}
      {view !== 'changes' && (
        <p className="font-serif text-[18px] leading-[1.9] whitespace-pre-wrap">
          <GlossText text={view === 'corrected' ? review.corrected : review.natural} lang={lang} />
        </p>
      )}
      {view === 'changes' && review.corrections.length > 0 && <p className="mt-4 text-[13px] text-ink-faint"><UiText source={'Tap a marked change to see why.'} /></p>}
    </div>
  );
}

const SCORE_LABEL: Array<[keyof JournalReview['scores'], string]> = [
  ['grammar', 'Grammar'],
  ['vocabulary', 'Vocabulary'],
  ['coherence', 'Coherence'],
];

/** Grade, level, what went well and one thing to work on. */
export function ReviewSummary({ review }: { review: JournalReview }) {
  const translateUi = useUi();
  const { scores } = review;
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-5">
        <Ring value={scores.overall / 100} size={92} stroke={8} color={gradeColor(scores.overall)} label={translateUi('Overall {0} of 100', [scores.overall])}>
          <span>
            <span className="block font-serif text-[28px] leading-none font-semibold tabular-nums">{scores.overall}</span>
            <span className="mt-0.5 block text-[10.5px] font-bold tracking-wide text-ink-faint uppercase"><UiText source={'overall'} /></span>
          </span>
        </Ring>
        <div className="min-w-0 flex-1 space-y-2">
          {SCORE_LABEL.map(([key, label]) => (
            <div key={key}>
              <div className="flex justify-between text-[12.5px] font-semibold">
                <span className="text-ink-soft">{label}</span>
                <span className="tabular-nums">{scores[key]}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sunken">
                <div className="h-full origin-left rounded-full transition-transform duration-700" style={{ transform: `scaleX(${scores[key] / 100})`, background: gradeColor(scores[key]) }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      {review.cefr && (
        <p className="text-[14px] text-ink-soft"><UiText source={'This entry reads like {0} writing.'} values={[<span className="font-semibold text-ink">{review.cefr}</span>]} /></p>
      )}
      {review.strengths.length > 0 && (
        <ul className="space-y-2">
          {review.strengths.map((s) => (
            <li key={s} className="flex gap-2.5 text-[14.5px] leading-relaxed">
              <Check size={16} className="mt-1 shrink-0 text-sage-text" aria-hidden />
              {s}
            </li>
          ))}
        </ul>
      )}
      {review.tip && (
        <div className="flex gap-2.5 rounded-2xl bg-accent-soft/60 p-4 text-[14.5px] leading-relaxed">
          <Lightbulb size={17} className="mt-0.5 shrink-0 text-accent-text" aria-hidden />
          <p>{review.tip}</p>
        </div>
      )}
    </div>
  );
}

/** Every correction as a small card, each one tap away from the Journal deck. */
export function CorrectionList({ review, lang }: { review: JournalReview; lang: string }) {
  const translateUi = useUi();
  if (!review.corrections.length) {
    return (
      <p className="flex items-center gap-2 text-[15px] text-sage-text"><UiText source={'{0} Nothing to correct. Lovely work.'} values={[<Sparkles size={17} aria-hidden />]} /></p>
    );
  }
  const addAll = async () => {
    let n = 0;
    for (const c of review.corrections) {
      if (
        await addToJournalDeck(lang, {
          term: c.suggestion,
          meaning: `${c.explanation}${c.explanation ? ' ' : ''}(not “${c.original}”)`,
          tags: ['journal', c.category],
          source: 'manual',
        })
      )
        n++;
    }
    toast(n ? `Added ${n} ${n === 1 ? 'card' : 'cards'} to Journal.` : 'They’re all in Journal already.', { tone: n ? 'success' : 'default' });
  };
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-bold tracking-wide text-ink-soft uppercase">
          {review.corrections.length} {review.corrections.length === 1 ? translateUi('correction') : translateUi('corrections')}
        </h3>
        <button type="button" onClick={() => void addAll()} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-semibold text-ink-soft hover:bg-surface hover:text-ink"><UiText source={'{0} All to Journal'} values={[<Plus size={14} aria-hidden />]} /></button>
      </div>
      <ul className="space-y-2.5">
        {review.corrections.map((c, i) => (
          <li key={i} className={cx('rounded-2xl border bg-raised p-4', c.severity === 'major' ? 'border-accent/30' : 'border-line')}>
            <CorrectionBody correction={c} lang={lang} />
          </li>
        ))}
      </ul>
    </div>
  );
}
