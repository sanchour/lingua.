import type { JournalReview } from '@/data/types';

export function WritingFeedback({ review, lang }: { review: JournalReview; lang: string }) {
  const feedback = review.writingFeedback;
  if (!feedback) return null;
  return (
    <section className="rounded-xl border border-line p-5" aria-label="Max writing feedback">
      <h2 className="font-serif text-xl font-semibold">Suggestions for this task</h2>
      <p className="mt-2 text-xs text-ink-faint">AI feedback · {review.model}. Suggestions, not verdicts. Your entry stays as you wrote it. Rubric scores run from 0 (not shown) to 4 (fully met).</p>
      <dl className="mt-4 grid grid-cols-2 gap-4">{feedback.rubric.map((r) => <div key={r.criterion}><dt className="font-semibold">{r.criterion} · {r.score}/4</dt><dd className="mt-1 text-sm text-ink-soft">{r.reason}</dd></div>)}</dl>
      <ul className="mt-5 space-y-4">{feedback.suggestions.map((s, i) => <li key={i}><p className="text-xs font-semibold text-ink-faint">{s.kind.replaceAll('-', ' ')}</p><p lang={lang} className="mt-1 font-serif text-base">{s.original} → {s.suggestion}</p><p className="mt-1 text-sm text-ink-soft">{s.why}</p></li>)}</ul>
      {!feedback.suggestions.length && <p className="mt-3 text-sm text-ink-faint">No optional phrasing suggestions returned.</p>}
    </section>
  );
}
