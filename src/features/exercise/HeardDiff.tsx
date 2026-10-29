// What you wrote against what was said (6-9: compare your guess with the transcript): the words you got, the ones you changed, missed or added.
import { wordDiff } from '@/core/diff/words';

export function HeardDiff({ given, said, lang }: { given: string; said: string; lang: string }) {
  const parts = wordDiff(given, said);
  return (
    <p lang={lang} className="mt-2 font-serif text-[17px] leading-snug whitespace-pre-wrap" aria-label="What you wrote against what was said">
      {parts.map((p, i) =>
        p.type === 'same' ? (
          <span key={i}>{p.text}</span>
        ) : p.type === 'change' ? (
          <span key={i}>
            <s className="mx-0.5 text-accent-text decoration-accent/60">{p.from}</s> <b className="mx-0.5 text-sage-text">{p.to}</b>
          </span>
        ) : p.type === 'del' ? (
          <s key={i} className="mx-0.5 text-accent-text decoration-accent/60">
            {p.text}
          </s>
        ) : (
          <b key={i} className="mx-0.5 text-sage-text underline decoration-sage/60">
            {p.text}
          </b>
        ),
      )}
    </p>
  );
}
