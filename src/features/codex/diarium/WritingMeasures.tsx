import { useMemo } from 'react';
import { writingMeasures } from '@/core/journal/measures';

export function WritingMeasures({ text, lang }: { text: string; lang: string }) {
  const m = useMemo(() => writingMeasures(text, lang), [text, lang]);
  return (
    <details className="mb-6 rounded-xl border border-line p-4 text-sm text-ink-soft">
      <summary className="cursor-pointer font-semibold">Writing measures · on this device</summary>
      <dl className="mt-4 grid grid-cols-3 gap-4">
        {[
          ['Different word forms', `${m.unique} / ${m.words}`], ['Vocabulary diversity', `${Math.round(m.diversity * 100)}%`], ['Sentences', m.sentences],
          ['Words per sentence', m.averageLength.toFixed(1)], ['Longest sentence', `${m.longest} words`], ['Over 20 words', `${m.longSentences} sentences`],
        ].map(([label, value]) => <div key={label}><dt className="text-xs text-ink-faint">{label}</dt><dd className="mt-1 font-semibold tabular-nums text-ink">{value}</dd></div>)}
      </dl>
      <p className="mt-4 text-xs leading-relaxed text-ink-faint">Diversity is different word forms divided by all words; shorter pieces usually score higher. Sentence length is a rough sign of complexity, not a grammar or CEFR assessment. Compare pieces of similar length in the same language.</p>
    </details>
  );
}
