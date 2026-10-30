import { UiText, useUi } from '@/design/i18n/UiText';
// "Which syllable is stressed?" (6-10): a common word cut into syllables; tap the one that carries the stress. Spanish and Russian,
// where the stress is known from the spelling or the dictionary. A miss goes to the record against the sound of stress.
import { useEffect, useState } from 'react';
import { stressQuestion } from '@/core/sounds/stressDrill';
import type { StressQuestion } from '@/core/sounds/stressDrill';
import { shuffle } from '@/core/srs/ludus';
import { db } from '@/data/db';
import { recordEvidence } from '@/data/learner';
import { SpeakButton } from '@/features/speech/SpeakButton';
import { cx } from '@/lib/cx';

async function questionsFor(lang: string): Promise<StressQuestion[]> {
  const rows = await db.fullDict.where('lang').equals(lang).filter((r) => r.rank !== undefined && r.rank < 4000 && Boolean(r.entries[0]?.syl && r.entries[0].syl.length >= 2)).limit(400).toArray();
  return shuffle(rows.flatMap((r) => stressQuestion(lang, r) ?? []), Math.random).slice(0, 8);
}

export function StressDrill({ lang }: { lang: string }) {
  const translateUi = useUi();
  const [questions, setQuestions] = useState<StressQuestion[] | null>(null);
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  useEffect(() => {
    let alive = true;
    void questionsFor(lang).then((q) => alive && setQuestions(q));
    return () => {
      alive = false;
    };
  }, [lang]);
  if (lang !== 'es' && lang !== 'ru') return null;
  if (!questions?.length) return null;
  const q = questions[at];

  const answer = (i: number) => {
    if (picked !== null || !q) return;
    setPicked(i);
    const ok = i === q.answer;
    if (ok) setRight((r) => r + 1);
    void recordEvidence({ lang, at: Date.now(), skill: 'pronunciation', room: 'cursus', item: { type: 'sound', soundId: 'stress' }, outcome: ok ? 'right' : 'wrong', assisted: false, category: ok ? undefined : 'pronunciation', given: q.syllables[i], expected: q.syllables[q.answer], kind: 'word-stress' }).catch(() => undefined);
  };

  return (
    <section aria-labelledby="stress-h" className="rounded-3xl border border-line bg-raised p-5">
      <h2 id="stress-h" className="font-serif text-2xl font-semibold"><UiText source={'Which syllable is stressed?'} /></h2>
      {q ? (
        <>
          <p className="mt-1 text-[14px] text-ink-soft"><UiText source={'Tap the syllable that is said louder and longer. Hear the word if you like.'} /></p>
          <div className="mt-4 flex items-center gap-4">
            <SpeakButton lang={lang} text={q.word} size={22} label="Hear the word" className="grid size-12 place-items-center rounded-full bg-sunken" />
            <div className="flex gap-2" role="group" aria-label={translateUi('Syllables of {0}', [q.word])}>
              {q.syllables.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={picked !== null}
                  onClick={() => answer(i)}
                  lang={lang}
                  className={cx('rounded-xl border px-4 py-2.5 font-serif text-[22px] transition-colors', picked === null && 'border-line hover:bg-surface', picked !== null && i === q.answer && 'border-sage bg-sage-soft font-bold', picked === i && i !== q.answer && 'border-accent bg-accent-soft', picked !== null && i !== q.answer && picked !== i && 'border-line text-ink-faint')}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          {picked !== null && (
            <div className="mt-3 flex items-center gap-3" role="status">
              <p className="flex-1 text-[14px] text-ink-soft"><UiText source={'{0}{1} is stressed on “{2}”.'} values={[picked === q.answer ? 'Yes. ' : 'Not quite. ', <b lang={lang}>{q.word}</b>, q.syllables[q.answer]]} /></p>
              <button type="button" onClick={() => (setPicked(null), setAt(at + 1))} className="h-10 rounded-xl bg-inverse px-4 text-[14px] font-semibold text-on-inverse">
                {at + 1 < questions.length ? translateUi('Next') : translateUi('Finish')}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="mt-3">
          <p className="text-[15px]"><UiText source={'Done: {0} of {1} right.'} values={[right, questions.length]} /></p>
          <button type="button" onClick={() => (setQuestions(null), setAt(0), setPicked(null), setRight(0), void questionsFor(lang).then(setQuestions))} className="mt-2 h-10 rounded-xl border border-line px-4 text-[14px] font-semibold hover:bg-surface"><UiText source={'Again'} /></button>
        </div>
      )}
    </section>
  );
}
